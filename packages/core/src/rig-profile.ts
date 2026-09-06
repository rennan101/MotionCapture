import type { CanonicalBoneName } from "./canonical-skeleton.js";

export type BoneMapping = Partial<Record<CanonicalBoneName, string>>;

export interface RigProfile {
  version: number;
  characterId: string;
  rootBone: string;
  hipsBone: string;
  boneMap: BoneMapping;
  restPose: "t-pose" | "a-pose" | "unknown";
  forwardAxis: "x" | "y" | "z";
  upAxis: "y" | "z";
  scaleHint: number;
}

export const DEFAULT_RIG_PROFILE: RigProfile = {
  version: 1,
  characterId: "unmapped",
  rootBone: "Root",
  hipsBone: "Hips",
  boneMap: {},
  restPose: "unknown",
  forwardAxis: "z",
  upAxis: "y",
  scaleHint: 1,
};
