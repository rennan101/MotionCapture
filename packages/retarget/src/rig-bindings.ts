import type { CanonicalPose } from "@motion-forge/pose";
import type { Quat, Vec3 } from "./quat.js";

/** Any point field on a canonical pose (i.e. any bone capture point). */
export type CanonicalPointName = Exclude<
  keyof CanonicalPose,
  "timestamp" | "overallConfidence"
>;

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
export const UE5_CANONICAL_ANCHOR_BONES: CanonicalAnchorMap = {
  root: "hip",
  pelvis: "hip",
  spine: "spine_01",
  chest: "spine_03",
  neck: "neck",
  head: "head",
  leftShoulder: "upperarm_l",
  leftUpperArm: "upperarm_l",
  leftLowerArm: "lowerarm_l",
  leftHand: "hand_l",
  rightShoulder: "upperarm_r",
  rightUpperArm: "upperarm_r",
  rightLowerArm: "lowerarm_r",
  rightHand: "hand_r",
  leftUpperLeg: "upperleg_l",
  leftLowerLeg: "lowerleg_l",
  leftFoot: "foot_l",
  rightUpperLeg: "upperleg_r",
  rightLowerLeg: "lowerleg_r",
  rightFoot: "foot_r",
};

/**
 * UE5-style mannequin rig, confirmed by parsing the bundled FBX files:
 * root → hip → spine_01/02/03 → neck → head,
 * shoulder_l → upperarm_l → lowerarm_l → hand_l (+ fingers),
 * upperleg_l → lowerleg_l → foot_l → ball_l.
 * Both bundled characters (Eric / Carla) use this naming.
 */
export const UE5_RIG_BINDINGS: RigBoneBinding[] = [
  // hip + spine_01..03 form one redistribution chain: they all track the
  // pelvis→chest segment, and without distribution the natural solve
  // concentrates the entire bend on the first link.
  { canonical: "pelvis", boneName: "hip", primary: ["pelvis", "chest"], secondary: ["leftShoulder", "rightShoulder"], chain: "spine" },
  { canonical: "spine", boneName: "spine_01", primary: ["pelvis", "chest"], secondary: ["leftShoulder", "rightShoulder"], chain: "spine" },
  { canonical: "chest", boneName: "spine_02", primary: ["pelvis", "chest"], secondary: ["leftShoulder", "rightShoulder"], chain: "spine" },
  { canonical: "chest", boneName: "spine_03", primary: ["pelvis", "chest"], secondary: ["leftShoulder", "rightShoulder"], chain: "spine" },
  { canonical: "neck", boneName: "neck", primary: ["chest", "head"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "head", boneName: "head", primary: ["chest", "head"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "leftShoulder", boneName: "shoulder_l", primary: ["chest", "leftShoulder"], secondary: ["pelvis", "chest"] },
  { canonical: "leftUpperArm", boneName: "upperarm_l", primary: ["leftShoulder", "leftLowerArm"], secondary: ["pelvis", "chest"] },
  { canonical: "leftLowerArm", boneName: "lowerarm_l", primary: ["leftLowerArm", "leftHand"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "leftHand", boneName: "hand_l", primary: ["leftLowerArm", "leftHand"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "rightShoulder", boneName: "shoulder_r", primary: ["chest", "rightShoulder"], secondary: ["pelvis", "chest"] },
  { canonical: "rightUpperArm", boneName: "upperarm_r", primary: ["rightShoulder", "rightLowerArm"], secondary: ["pelvis", "chest"] },
  { canonical: "rightLowerArm", boneName: "lowerarm_r", primary: ["rightLowerArm", "rightHand"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "rightHand", boneName: "hand_r", primary: ["rightLowerArm", "rightHand"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "leftUpperLeg", boneName: "upperleg_l", primary: ["leftUpperLeg", "leftLowerLeg"], secondary: ["pelvis", "chest"] },
  // Leg roll refs use the hip line (mediolateral) so the knee/foot twist is
  // referenced to the knee hinge axis — required by the IK joint limits.
  { canonical: "leftLowerLeg", boneName: "lowerleg_l", primary: ["leftLowerLeg", "leftFoot"], secondary: ["leftUpperLeg", "rightUpperLeg"] },
  { canonical: "leftFoot", boneName: "foot_l", primary: ["leftLowerLeg", "leftFoot"], secondary: ["leftUpperLeg", "rightUpperLeg"] },
  { canonical: "rightUpperLeg", boneName: "upperleg_r", primary: ["rightUpperLeg", "rightLowerLeg"], secondary: ["pelvis", "chest"] },
  { canonical: "rightLowerLeg", boneName: "lowerleg_r", primary: ["rightLowerLeg", "rightFoot"], secondary: ["leftUpperLeg", "rightUpperLeg"] },
  { canonical: "rightFoot", boneName: "foot_r", primary: ["rightLowerLeg", "rightFoot"], secondary: ["leftUpperLeg", "rightUpperLeg"] },
];

/** Mixamo naming (mixamorig:*) for characters exported from Mixamo. */
export const MIXAMO_RIG_BINDINGS: RigBoneBinding[] = [
  { canonical: "pelvis", boneName: "mixamorig:Hips", primary: ["pelvis", "chest"], secondary: ["leftShoulder", "rightShoulder"], chain: "spine" },
  { canonical: "spine", boneName: "mixamorig:Spine", primary: ["pelvis", "chest"], secondary: ["leftShoulder", "rightShoulder"], chain: "spine" },
  { canonical: "chest", boneName: "mixamorig:Spine1", primary: ["pelvis", "chest"], secondary: ["leftShoulder", "rightShoulder"], chain: "spine" },
  { canonical: "chest", boneName: "mixamorig:Spine2", primary: ["pelvis", "chest"], secondary: ["leftShoulder", "rightShoulder"], chain: "spine" },
  { canonical: "neck", boneName: "mixamorig:Neck", primary: ["chest", "head"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "head", boneName: "mixamorig:Head", primary: ["chest", "head"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "leftShoulder", boneName: "mixamorig:LeftShoulder", primary: ["chest", "leftShoulder"], secondary: ["pelvis", "chest"] },
  { canonical: "leftUpperArm", boneName: "mixamorig:LeftArm", primary: ["leftShoulder", "leftLowerArm"], secondary: ["pelvis", "chest"] },
  { canonical: "leftLowerArm", boneName: "mixamorig:LeftForeArm", primary: ["leftLowerArm", "leftHand"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "leftHand", boneName: "mixamorig:LeftHand", primary: ["leftLowerArm", "leftHand"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "rightShoulder", boneName: "mixamorig:RightShoulder", primary: ["chest", "rightShoulder"], secondary: ["pelvis", "chest"] },
  { canonical: "rightUpperArm", boneName: "mixamorig:RightArm", primary: ["rightShoulder", "rightLowerArm"], secondary: ["pelvis", "chest"] },
  { canonical: "rightLowerArm", boneName: "mixamorig:RightForeArm", primary: ["rightLowerArm", "rightHand"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "rightHand", boneName: "mixamorig:RightHand", primary: ["rightLowerArm", "rightHand"], secondary: ["leftShoulder", "rightShoulder"] },
  { canonical: "leftUpperLeg", boneName: "mixamorig:LeftUpLeg", primary: ["leftUpperLeg", "leftLowerLeg"], secondary: ["pelvis", "chest"] },
  { canonical: "leftLowerLeg", boneName: "mixamorig:LeftLeg", primary: ["leftLowerLeg", "leftFoot"], secondary: ["leftUpperLeg", "rightUpperLeg"] },
  { canonical: "leftFoot", boneName: "mixamorig:LeftFoot", primary: ["leftLowerLeg", "leftFoot"], secondary: ["leftUpperLeg", "rightUpperLeg"] },
  { canonical: "rightUpperLeg", boneName: "mixamorig:RightUpLeg", primary: ["rightUpperLeg", "rightLowerLeg"], secondary: ["pelvis", "chest"] },
  { canonical: "rightLowerLeg", boneName: "mixamorig:RightLeg", primary: ["rightLowerLeg", "rightFoot"], secondary: ["leftUpperLeg", "rightUpperLeg"] },
  { canonical: "rightFoot", boneName: "mixamorig:RightFoot", primary: ["rightLowerLeg", "rightFoot"], secondary: ["leftUpperLeg", "rightUpperLeg"] },
];

export const MIXAMO_CANONICAL_ANCHOR_BONES: CanonicalAnchorMap = {
  root: "mixamorig:Hips",
  pelvis: "mixamorig:Hips",
  spine: "mixamorig:Spine",
  chest: "mixamorig:Spine2",
  neck: "mixamorig:Neck",
  head: "mixamorig:Head",
  leftShoulder: "mixamorig:LeftArm",
  leftUpperArm: "mixamorig:LeftArm",
  leftLowerArm: "mixamorig:LeftForeArm",
  leftHand: "mixamorig:LeftHand",
  rightShoulder: "mixamorig:RightArm",
  rightUpperArm: "mixamorig:RightArm",
  rightLowerArm: "mixamorig:RightForeArm",
  rightHand: "mixamorig:RightHand",
  leftUpperLeg: "mixamorig:LeftUpLeg",
  leftLowerLeg: "mixamorig:LeftLeg",
  leftFoot: "mixamorig:LeftFoot",
  rightUpperLeg: "mixamorig:RightUpLeg",
  rightLowerLeg: "mixamorig:RightLeg",
  rightFoot: "mixamorig:RightFoot",
};

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
