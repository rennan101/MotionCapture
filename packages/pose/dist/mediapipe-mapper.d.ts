import type { PoseResult, ProviderId } from "./pose-provider.js";
export interface MediaPipeLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}
export declare function mapMediaPipeToCanonical(landmarks: MediaPipeLandmark[], worldLandmarks: MediaPipeLandmark[] | undefined, timestamp: number, latencyMs: number, providerId?: ProviderId): PoseResult;
//# sourceMappingURL=mediapipe-mapper.d.ts.map