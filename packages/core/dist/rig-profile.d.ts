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
export declare const DEFAULT_RIG_PROFILE: RigProfile;
//# sourceMappingURL=rig-profile.d.ts.map