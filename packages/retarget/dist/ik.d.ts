import { type Quat, type Vec3 } from "./quat.js";
/**
 * Basic IK / joint-limit layer (Sprint 7 scope: believable, not exact).
 *
 * - HingeJointLimiter: constrains elbow/knee flexion to a plausible hinge
 *   range, removing the rubber-limb look of raw direction retargeting.
 * - FootGroundLock: while a foot is near the ground and moving slowly, pins
 *   the hips so planted feet don't slide (classic "root compensation").
 */
/** Identifies one hinge joint (elbow or knee) on a side. */
export type HingeJointId = "leftElbow" | "rightElbow" | "leftKnee" | "rightKnee";
export interface HingeLimit {
    /**
     * Flexion range in degrees around the hinge axis. The NATURAL side
     * (knee: heel back; elbow: hand forward, per side) gets the wide range
     * [−hyperMax, +flexMax] or its mirror, derived per joint from the rig's
     * rest data — never hard-coded per side.
     */
    minDeg: number;
    /** Max flexion in degrees (see minDeg). */
    maxDeg: number;
    /**
     * The hinge axis in the PARENT bone's rest LOCAL frame — flexion rotates
     * around this axis. Anatomically this is the transepicondylar axis: the
     * parent bone's roll reference, which is ⊥ to the limb at rest and stays
     * ⊥ in every pose because it rotates with the parent.
     */
    parentAxisLocal: Vec3;
    /** +1 when natural flexion measures positive around the axis, −1 otherwise. */
    naturalSign: 1 | -1;
}
export interface HingeSetup {
    joint: HingeJointId;
    /** The mid-segment bone (lowerarm / lowerleg binding boneName). */
    boneName: string;
    /** The parent chain bone (upperarm / upperleg binding boneName). */
    parentBoneName: string;
    limit: HingeLimit;
}
/**
 * Builds hinge setups for a bound rig. Everything is derived from the rest
 * data — no per-side hard-coding:
 *
 * - Axis (in the PARENT's rest local frame) = limb direction × body forward.
 *   This is the anatomical transepicondylar axis: ⊥ to the limb and ⊥ to
 *   the flexion plane, valid for a hanging arm AND a T-pose arm (a roll
 *   reference like the spine direction would be parallel to a hanging limb
 *   and degenerate). Because the axis is fixed in the parent frame it stays
 *   ⊥ to the limb in every pose.
 * - The natural-flexion side is derived by asking which rotation direction
 *   around the axis carries the limb toward the body's forward vector
 *   (elbow) or away from it (knee). The body forward is reconstructed from
 *   the rest world positions (hip line × spine-up).
 */
export declare function buildHingeSetups(restBones: Record<string, {
    worldPos: Vec3;
    worldRot: Quat;
    primaryLocal: Vec3;
    secondaryLocal: Vec3;
    localRot: Quat;
}>, boneNames: {
    hips: string;
    spineTop: string;
    upperArmL: string;
    lowerArmL: string;
    upperArmR: string;
    lowerArmR: string;
    upperLegL: string;
    lowerLegL: string;
    upperLegR: string;
    lowerLegR: string;
}, options?: {
    kneeFlexDeg?: number;
    kneeHyperDeg?: number;
    elbowFlexDeg?: number;
    elbowHyperDeg?: number;
}): HingeSetup[];
/**
 * Projects a mid-segment bone's world rotation so the child-segment flexion
 * relative to the parent segment stays inside [minDeg, maxDeg].
 *
 * Pure math: operates on world rotations and rest reference directions, so it
 * composes cleanly after the solver's per-bone pass.
 */
export declare function applyHingeClamp(setup: HingeSetup, worldRots: Record<string, Quat>, restBones: Record<string, {
    primaryLocal: Vec3;
}>): void;
export interface FootGroundLockOptions {
    /** Height below which a foot counts as "planted" (rig units). Default 0.09. */
    groundHeight?: number;
    /** Max foot speed to COUNT AS a new plant (m/frame). Default 0.02. */
    maxPlantedSpeed?: number;
    /** How strongly the hips absorb the foot correction (0..1). Default 0.6. */
    hipsCompensation?: number;
    /**
     * Pin distance above which the foot is considered lifted/teleported and
     * the lock re-plants at the new spot instead of stretching. Default 0.4.
     */
    maxPinStretch?: number;
}
/**
 * Keeps planted feet from sliding: while a foot is near the ground and slow,
 * its world position is pinned and the resulting offset is partially absorbed
 * by the hips. This is a positional constraint evaluated on the CANONICAL
 * pose before solving, so the whole retarget chain inherits it.
 */
export declare class FootGroundLock {
    private readonly options;
    private readonly feet;
    constructor(options?: FootGroundLockOptions);
    /**
     * Applies foot pinning to the mapped canonical points and returns the hips
     * compensation offset to add to the hips world position.
     *
     * @param footPoints `{ leftFoot, rightFoot }` mapped positions (rig space)
     * @param hipsPos    current hips world position (rig space)
     */
    apply(footPoints: {
        leftFoot: Vec3;
        rightFoot: Vec3;
    }, hipsPos: Vec3): {
        feet: {
            leftFoot: Vec3;
            rightFoot: Vec3;
        };
        hipsOffset: Vec3;
    };
    reset(): void;
}
//# sourceMappingURL=ik.d.ts.map