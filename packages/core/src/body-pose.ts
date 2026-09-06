export interface BonePose {
  position: [number, number, number];
  orientation: [number, number, number, number];
  confidence: number;
}

export interface BodyPose {
  timestamp: number;
  overallConfidence: number;
  root: BonePose;
  pelvis: BonePose;
  spine: BonePose;
  chest: BonePose;
  neck: BonePose;
  head: BonePose;
  leftShoulder: BonePose;
  leftUpperArm: BonePose;
  leftLowerArm: BonePose;
  leftHand: BonePose;
  rightShoulder: BonePose;
  rightUpperArm: BonePose;
  rightLowerArm: BonePose;
  rightHand: BonePose;
  leftUpperLeg: BonePose;
  leftLowerLeg: BonePose;
  leftFoot: BonePose;
  rightUpperLeg: BonePose;
  rightLowerLeg: BonePose;
  rightFoot: BonePose;
  providerId: string;
}

export function emptyBodyPose(providerId = "unknown"): BodyPose {
  const bone: BonePose = {
    position: [0, 0, 0],
    orientation: [0, 0, 0, 1],
    confidence: 0,
  };

  return {
    timestamp: 0,
    overallConfidence: 0,
    providerId,
    root: bone,
    pelvis: bone,
    spine: bone,
    chest: bone,
    neck: bone,
    head: bone,
    leftShoulder: bone,
    leftUpperArm: bone,
    leftLowerArm: bone,
    leftHand: bone,
    rightShoulder: bone,
    rightUpperArm: bone,
    rightLowerArm: bone,
    rightHand: bone,
    leftUpperLeg: bone,
    leftLowerLeg: bone,
    leftFoot: bone,
    rightUpperLeg: bone,
    rightLowerLeg: bone,
    rightFoot: bone,
  };
}
