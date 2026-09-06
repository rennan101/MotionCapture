export declare const CANONICAL_BONE_NAMES: readonly ["root", "hips", "spine", "chest", "neck", "head", "leftShoulder", "leftUpperArm", "leftLowerArm", "leftHand", "rightShoulder", "rightUpperArm", "rightLowerArm", "rightHand", "leftUpperLeg", "leftLowerLeg", "leftFoot", "rightUpperLeg", "rightLowerLeg", "rightFoot"];
export type CanonicalBoneName = (typeof CANONICAL_BONE_NAMES)[number];
export interface CanonicalSkeletonBone {
    name: CanonicalBoneName;
    index: number;
}
export interface CanonicalSkeleton {
    bones: CanonicalSkeletonBone[];
    rootBone: CanonicalBoneName;
    hipsBone: CanonicalBoneName;
}
export declare function createCanonicalSkeleton(): CanonicalSkeleton;
//# sourceMappingURL=canonical-skeleton.d.ts.map