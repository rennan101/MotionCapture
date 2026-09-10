import type {
  CanonicalPose,
  BoneCapturePoint,
  PoseResult,
  ProviderId,
} from "./pose-provider.js";

export interface MediaPipeLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

function makePoint(
  lm?: MediaPipeLandmark,
  fallback?: [number, number, number],
): BoneCapturePoint {
  if (!lm) {
    return {
      position: fallback ?? [0, 0, 0],
      confidence: 0,
    };
  }
  return {
    position: [lm.x, -lm.y, -lm.z],
    confidence: lm.visibility ?? 1.0,
  };
}

function midpoint(
  a: BoneCapturePoint,
  b: BoneCapturePoint,
  weightA = 0.5,
): BoneCapturePoint {
  const weightB = 1 - weightA;
  return {
    position: [
      a.position[0] * weightA + b.position[0] * weightB,
      a.position[1] * weightA + b.position[1] * weightB,
      a.position[2] * weightA + b.position[2] * weightB,
    ],
    confidence: (a.confidence + b.confidence) / 2,
  };
}

export function mapMediaPipeToCanonical(
  landmarks: MediaPipeLandmark[],
  worldLandmarks: MediaPipeLandmark[] | undefined,
  timestamp: number,
  latencyMs: number,
  providerId: ProviderId = "mediapipe",
): PoseResult {
  const source = worldLandmarks && worldLandmarks.length >= 33 ? worldLandmarks : landmarks;

  const leftShoulder = makePoint(source[11]);
  const rightShoulder = makePoint(source[12]);
  const leftElbow = makePoint(source[13]);
  const rightElbow = makePoint(source[14]);
  const leftWrist = makePoint(source[15]);
  const rightWrist = makePoint(source[16]);
  const leftHip = makePoint(source[23]);
  const rightHip = makePoint(source[24]);
  const leftKnee = makePoint(source[25]);
  const rightKnee = makePoint(source[26]);
  const leftAnkle = makePoint(source[27]);
  const rightAnkle = makePoint(source[28]);
  const leftUpperLeg: BoneCapturePoint = leftHip;
  const leftLowerLeg: BoneCapturePoint = leftKnee;
  const leftFoot = makePoint(source[31] || source[27]);
  const rightUpperLeg: BoneCapturePoint = rightHip;
  const rightLowerLeg: BoneCapturePoint = rightKnee;
  const rightFoot = makePoint(source[32] || source[28]);
  const nose = makePoint(source[0]);

  const pelvis = midpoint(leftHip, rightHip);
  const chest = midpoint(leftShoulder, rightShoulder);
  const neck = midpoint(chest, nose, 0.7);
  const head = nose;
  const spine = midpoint(pelvis, chest, 0.5);

  const root: BoneCapturePoint = {
    position: [pelvis.position[0], 0, pelvis.position[2]],
    confidence: pelvis.confidence,
  };

  const canonical: CanonicalPose = {
    timestamp,
    overallConfidence:
      (pelvis.confidence + chest.confidence + leftShoulder.confidence + rightShoulder.confidence) / 4,
    root,
    pelvis,
    spine,
    chest,
    neck,
    head,
    leftShoulder,
    leftUpperArm: leftShoulder,
    leftLowerArm: leftElbow,
    leftHand: leftWrist,
    rightShoulder,
    rightUpperArm: rightShoulder,
    rightLowerArm: rightElbow,
    rightHand: rightWrist,
    leftUpperLeg,
    leftLowerLeg,
    leftFoot,
    leftAnkle,
    rightUpperLeg,
    rightLowerLeg,
    rightFoot,
    rightAnkle,
  };

  return {
    canonical,
    providerId,
    latencyMs,
    warnings: [],
  };
}
