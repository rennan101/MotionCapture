import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { mapMediaPipeToCanonical } from "@motion-forge/pose";

let landmarker: PoseLandmarker | null = null;
let isInitializing = false;

async function initLandmarker() {
  if (landmarker || isInitializing) return;
  isInitializing = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    self.postMessage({ type: "INIT_SUCCESS" });
  } catch (err: any) {
    console.warn("PoseWorker: GPU delegate failed, falling back to CPU", err);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      self.postMessage({ type: "INIT_SUCCESS" });
    } catch (fallbackErr: any) {
      self.postMessage({
        type: "INIT_ERROR",
        error: fallbackErr?.message || String(fallbackErr),
      });
    }
  } finally {
    isInitializing = false;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "INIT") {
    await initLandmarker();
    return;
  }

  if (type === "PROCESS_FRAME") {
    const { imageBitmap, timestamp } = payload;
    const start = performance.now();

    if (!landmarker) {
      if (imageBitmap && typeof imageBitmap.close === "function") {
        imageBitmap.close();
      }
      return;
    }

    try {
      // detectForVideo receives an HTMLVideoElement, HTMLCanvasElement, or ImageBitmap
      const result = landmarker.detectForVideo(imageBitmap, timestamp);
      const latencyMs = Math.round(performance.now() - start);

      if (imageBitmap && typeof imageBitmap.close === "function") {
        imageBitmap.close();
      }

      if (result.landmarks && result.landmarks.length > 0) {
        const rawLandmarks = result.landmarks[0];
        const worldLandmarks = result.worldLandmarks?.[0];

        const poseResult = mapMediaPipeToCanonical(
          rawLandmarks,
          worldLandmarks,
          timestamp,
          latencyMs,
          "mediapipe"
        );

        self.postMessage({
          type: "POSE_RESULT",
          payload: poseResult,
        });
      } else {
        self.postMessage({
          type: "NO_POSE",
          payload: { timestamp, latencyMs },
        });
      }
    } catch (err: any) {
      if (imageBitmap && typeof imageBitmap.close === "function") {
        imageBitmap.close();
      }
      self.postMessage({
        type: "FRAME_ERROR",
        error: err?.message || String(err),
      });
    }
    return;
  }

  if (type === "DISPOSE") {
    if (landmarker) {
      landmarker.close();
      landmarker = null;
    }
  }
};
