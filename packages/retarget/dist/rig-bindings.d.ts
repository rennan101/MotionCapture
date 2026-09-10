import type { CanonicalPose } from "@motion-forge/pose";
import type { Quat, Vec3 } from "./quat.js";
/** Any point field on a canonical pose (i.e. any bone capture point). */
export type CanonicalPointName = Exclude<keyof CanonicalPose, "timestamp" | "overallConfidence">;
/**
 * Binds one rig bone to the canonical skeleton using two reference segments:
 *
 * - `primary`   : the main segment whose direction the bone must track
 *                 (e.g. shoulder → elbow for an upper arm bone).
 * - `secondary` : a roll reference that fixes the twist around the primary
 *                 direction (e.g. the shoulder line for forearm bones).
 *
 * Segment endpoints are canonical point names; their rig-side rest positions
 * come from `CANONICAL_ANCHOR_BONES`. Because only directions are matched,
 * the retarget is scale-free and preserves the rig's own proportions.
 */
export interface RigBoneBinding {
    /** Which canonical bone this rig bone represents (informational). */
    canonical: CanonicalPointName;
    /** Exact bone name inside the character rig. */
    boneName: string;
    primary: [CanonicalPointName, CanonicalPointName];
    secondary: [CanonicalPointName, CanonicalPointName];
    /**
     * Multi-bone chains that share one canonical bend and must distribute it
     * (e.g. spine_01/02/03 all tracking the pelvis→chest segment). Members are
     * processed in binding order; the total bend is split across the chain
     * instead of landing entirely on the first link.
     */
    chain?: string;
}
/**
 * Maps a canonical point to the rig bone whose rest origin sits at that point.
 * Rig origins double as joint anchors: upperarm_l's origin IS the shoulder
 * joint, lowerarm_l's origin IS the elbow, and so on.
 */
export type CanonicalAnchorMap = Partial<Record<CanonicalPointName, string>>;
/** UE5-style mannequin anchors (hip origin = pelvis, upperarm origin = shoulder…). */
export declare const UE5_CANONICAL_ANCHOR_BONES: CanonicalAnchorMap;
/**
 * UE5-style mannequin rig, confirmed by parsing the bundled FBX files:
 * root → hip → spine_01/02/03 → neck → head,
 * shoulder_l → upperarm_l → lowerarm_l → hand_l (+ fingers),
 * upperleg_l → lowerleg_l → foot_l → ball_l.
 * Both bundled characters (Eric / Carla) use this naming.
 */
export declare const UE5_RIG_BINDINGS: RigBoneBinding[];
/** Mixamo naming (mixamorig:*) for characters exported from Mixamo. */
export declare const MIXAMO_RIG_BINDINGS: RigBoneBinding[];
export declare const MIXAMO_CANONICAL_ANCHOR_BONES: CanonicalAnchorMap;
/** One bone's snapshot as captured from the scene at rest (bind/T-pose). */
export interface RigBoneSnapshot {
    name: string;
    /** World-space position at rest, rig space. */
    worldPos: Vec3;
    /** World-space rotation at rest, rig space. */
    worldRot: Quat;
    /** Local rotation at rest (what the engine stores on the bone). */
    localRot: Quat;
}
/** Precomputed rest data for one bound bone. */
export interface RestBoneData {
    name: string;
    /** World-space position at rest. */
    worldPos: Vec3;
    /** World-space rotation at rest. */
    worldRot: Quat;
    /** Local rotation at rest. */
    localRot: Quat;
    /** Primary segment direction in the bone's LOCAL frame at rest. */
    primaryLocal: Vec3;
    /** Secondary (roll reference) segment direction in the bone's LOCAL frame. */
    secondaryLocal: Vec3;
}
export interface RestPoseData {
    bones: Record<string, RestBoneData>;
    /** Rig bones that were missing from the character (diagnostics). */
    missing: string[];
    /** Rest world height of the hips bone (used to keep the character grounded). */
    hipsRestY: number;
}
//# sourceMappingURL=rig-bindings.d.ts.map