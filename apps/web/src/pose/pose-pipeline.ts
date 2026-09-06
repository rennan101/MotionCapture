import type { PoseResult } from "@motion-forge/pose";

export type PoseCallback = (result: PoseResult | null, fps: number, latencyMs: number) => void;

export class PosePipeline {
  private worker: Worker | null = null;
  private isProcessing = false;
  private isWorkerReady = false;
  private videoEl: HTMLVideoElement | null = null;
  private animId: number = 0;
  private callback: PoseCallback | null = null;
  private frameCount = 0;
  private lastFpsTimestamp = performance.now();
  private currentFps = 0;
  private onErrorCallback: ((err: string) => void) | null = null;

  constructor(onPose?: PoseCallback, onError?: (err: string) => void) {
    this.callback = onPose ?? null;
    this.onErrorCallback = onError ?? null;
  }

  public start(video: HTMLVideoElement) {
    this.videoEl = video;
    this.initWorker();
    this.loop();
  }

  public stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
    this.videoEl = null;
    if (this.worker) {
      this.worker.postMessage({ type: "DISPOSE" });
      this.worker.terminate();
      this.worker = null;
    }
    this.isWorkerReady = false;
    this.isProcessing = false;
  }

  private initWorker() {
    if (this.worker) return;

    this.worker = new Worker(new URL("./pose.worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.onmessage = (e: MessageEvent) => {
      const { type, payload, error } = e.data;

      if (type === "INIT_SUCCESS") {
        this.isWorkerReady = true;
      } else if (type === "INIT_ERROR") {
        console.error("PosePipeline: Worker init failed", error);
        this.onErrorCallback?.(error);
      } else if (type === "POSE_RESULT") {
        this.isProcessing = false;
        this.updateFps();
        this.callback?.(payload as PoseResult, this.currentFps, payload.latencyMs);
      } else if (type === "NO_POSE") {
        this.isProcessing = false;
        this.updateFps();
        this.callback?.(null, this.currentFps, payload?.latencyMs ?? 0);
      } else if (type === "FRAME_ERROR") {
        this.isProcessing = false;
        console.warn("PosePipeline: frame processing error", error);
      }
    };

    this.worker.postMessage({ type: "INIT" });
  }

  private updateFps() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTimestamp;
    if (elapsed >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsTimestamp = now;
    }
  }

  private loop = async () => {
    this.animId = requestAnimationFrame(this.loop);

    if (
      !this.videoEl ||
      !this.worker ||
      !this.isWorkerReady ||
      this.isProcessing ||
      this.videoEl.readyState < 2 ||
      this.videoEl.paused ||
      this.videoEl.videoWidth === 0
    ) {
      return;
    }

    try {
      this.isProcessing = true;
      const timestamp = performance.now();
      // createImageBitmap extrai o frame atual de forma rápida sem travar a main thread
      const bitmap = await createImageBitmap(this.videoEl);
      this.worker.postMessage(
        {
          type: "PROCESS_FRAME",
          payload: {
            imageBitmap: bitmap,
            timestamp,
          },
        },
        [bitmap]
      );
    } catch {
      this.isProcessing = false;
    }
  };
}
