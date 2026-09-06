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
export declare function emptyBodyPose(providerId?: string): BodyPose;
//# sourceMappingURL=body-pose.d.ts.map