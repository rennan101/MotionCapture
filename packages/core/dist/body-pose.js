export function emptyBodyPose(providerId = "unknown") {
    const bone = {
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
//# sourceMappingURL=body-pose.js.map