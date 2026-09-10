import type { PoseResult, ProviderId } from "@motion-forge/pose";

// Frames below this overall confidence are skipped: the last good pose is held
// instead of pushing jitter into the viewport.
export const LOW_CONFIDENCE_FLOOR = 0.25;

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
  private skippedLowConfidenceFrames = 0;
  private started = false;
  private readonly errorBuffer: string[] = [];
  private flushErrorTimer = 0;

  constructor(onPose?: PoseCallback, onError?: (err: string) => void) {
    this.callback = onPose ?? null;
    this.onErrorCallback = onError ?? null;
  }

  public start(video: HTMLVideoElement, providerId: ProviderId = "mediapipe") {
    this.videoEl = video;
    this.skippedLowConfidenceFrames = 0;
    this.started = true;
    this.initWorker(providerId);
    if (!this.animId) {
      this.loop();
    }
  }

  public stop() {
    this.started = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
    this.videoEl = null;
    try {
      if (this.worker) {
        this.worker.postMessage({ type: "DISPOSE" });
        try {
          this.worker.terminate();
        } catch {
          // ignore channel/terminate noise during teardown
        }
        this.worker = null;
      }
    } finally {
      this.isWorkerReady = false;
      this.isProcessing = false;
      this.errorBuffer.length = 0;
    }
  }

  private initWorker(providerId: ProviderId) {
    if (this.worker) return;

    this.worker = new Worker(new URL("./pose.worker.ts", import.meta.url), {
      type: "module",
    });

    this.worker.onmessage = (e: MessageEvent) => {
      const { type, payload, error } = e.data;

      if (type === "INIT_SUCCESS") {
        this.isWorkerReady = true;
        this.errorBuffer.length = 0;
      } else if (type === "INIT_ERROR") {
        this.isWorkerReady = false;
        const msg =
          error ||
          "Não foi possível inicializar a inferência na web. Tente parar e abrir a câmera novamente.";
        this.bufferError(msg);
        this.onErrorCallback?.(msg);
      } else if (type === "PROVIDER_UNAVAILABLE") {
        this.isWorkerReady = false;
        this.isProcessing = false;
        const msg =
          payload?.providerId === "mediapipe"
            ? "Backend selecionado não está disponível."
            : `Backend "${payload?.providerId}" não disponível na web neste MVP — inferência desativada.`;
        this.bufferError(msg);
        this.onErrorCallback?.(msg);
      } else if (type === "POSE_RESULT") {
        this.isProcessing = false;
        this.updateFps();
        const result = payload as PoseResult;
        if (
          result?.canonical &&
          result.canonical.overallConfidence < LOW_CONFIDENCE_FLOOR
        ) {
          // Low-confidence frame: hold the last good pose, do not crash the loop.
          this.skippedLowConfidenceFrames++;
          return;
        }
        this.callback?.(result, this.currentFps, result.latencyMs);
      } else if (type === "NO_POSE") {
        this.isProcessing = false;
        this.updateFps();
        this.callback?.(null, this.currentFps, payload?.latencyMs ?? 0);
      } else if (type === "FRAME_ERROR") {
        this.isProcessing = false;
        // A single bad frame must not tear down the capture loop.
        // Queue it for a short periodic summary instead of spamming the banner.
        const msg =
          error ||
          "Falha em um frame de pose. A captura continua; o erro pode ser repetido ou transient.";
        this.bufferError(msg);
      }
    };

    this.worker.postMessage({ type: "INIT", payload: { providerId } });
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

    // Guard: stop() can be called concurrently by teardown while the loop is
    // still pending on the rAF queue. If the pipeline has been stopped, bail
    // out cleanly instead of keeping the loop alive or touching a disposed
    // worker/video.
    if (!this.started) {
      return;
    }

    if (
      !this.videoEl ||
      !this.worker ||
      !this.isWorkerReady ||
      this.isProcessing ||
      this.videoEl.readyState < 2 ||
      this.videoEl.paused ||
      this.videoEl.videoWidth === 0
    ) {
      // Still schedule the next frame so we can resume automatically when the
      // video becomes playable or the worker comes back ready.
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
      // createImageBitmap failures (e.g. detached video) are transient; keep
      // the loop alive and let the next frame retry.
    }
  };

  /** Queue a non-fatal diagnostic line for the next periodic flush. */
  private bufferError(message: string) {
    if (message && !this.errorBuffer.includes(message)) {
      this.errorBuffer.push(message);
      if (this.errorBuffer.length > 3) {
        this.errorBuffer.shift();
      }
    }
    if (!this.flushErrorTimer) {
      this.flushErrorTimer = window.setTimeout(() => {
        this.flushErrorTimer = 0;
        if (!this.started || this.errorBuffer.length === 0) return;
        const latest = this.errorBuffer[this.errorBuffer.length - 1];
        if (latest) {
          this.onErrorCallback?.(latest);
        }
      }, 800);
    }
  }
}
