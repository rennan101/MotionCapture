export const CANONICAL_BONE_NAMES = [
    "root",
    "hips",
    "spine",
    "chest",
    "neck",
    "head",
    "leftShoulder",
    "leftUpperArm",
    "leftLowerArm",
    "leftHand",
    "rightShoulder",
    "rightUpperArm",
    "rightLowerArm",
    "rightHand",
    "leftUpperLeg",
    "leftLowerLeg",
    "leftFoot",
    "rightUpperLeg",
    "rightLowerLeg",
    "rightFoot",
];
export function createCanonicalSkeleton() {
    return {
        bones: CANONICAL_BONE_NAMES.map((name, index) => ({
            name,
            index,
        })),
        rootBone: "root",
        hipsBone: "hips",
    };
}
//# sourceMappingURL=canonical-skeleton.js.map