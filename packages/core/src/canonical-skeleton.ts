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
] as const;

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

export function createCanonicalSkeleton(): CanonicalSkeleton {
  return {
    bones: CANONICAL_BONE_NAMES.map((name, index) => ({
      name,
      index,
    })),
    rootBone: "root",
    hipsBone: "hips",
  };
}
