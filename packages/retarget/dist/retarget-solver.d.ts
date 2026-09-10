import type { CanonicalPose } from "@motion-forge/pose";
import type { RestPoseData, RigBoneBinding } from "./rig-bindings.js";
import { type Quat, type Vec3 } from "./quat.js";
import { type FootGroundLockOptions } from "./ik.js";
export type { FootGroundLockOptions };
/** How the canonical pose maps into rig space (mediapipe-mapper convention). */
export interface CanonicalAxisMapping {
    x: 1 | -1;
    y: 1 | -1;
    z: 1 | -1;
    /** Applied to every coordinate after axis flips. */
    scale: number;
}
/** Default matches mapMediaPipeToCanonical: [x, -y, -z], meters, y-up, -z forward. */
export declare const DEFAULT_AXIS_MAPPING: CanonicalAxisMapping;
export interface RetargetOptions {
    /**
     * Legacy fixed smoothing (0 = instant, 1 = frozen). When omitted, adaptive
     * smoothing from the stabilizer is used instead. Default: adaptive.
     */
    smoothing?: number;
    /** Skip bones whose driving segment confidence is below this. Default 0.25. */
    minConfidence?: number;
    /** Outlier gate: max plausible inter-frame point motion (meters). Default 1.2. */
    maxPointJumpMeters?: number;
    /** Stabilizer options (adaptive smoothing, jump rejection, hysteresis). */
    stabilizer?: {
        baseSmoothing?: number;
        velocitySmoothingGain?: number;
        jumpSmoothing?: number;
        jumpThresholdDeg?: number;
        velocitySaturationDeg?: number;
        reacquireMargin?: number;
    };
    /** Knee flexion clamp in degrees. Default [0, 150]. */
    kneeLimit?: [number, number];
    /** Elbow flexion clamp in degrees. Default [0, 160]. */
    elbowLimit?: [number, number];
    /** Foot ground lock options; `false` disables it entirely. */
    footLock?: {
        groundHeight?: number;
        maxPlantedSpeed?: number;
        hipsCompensation?: number;
    } | false;
}
export interface RetargetResult {
    /** Local rotations per bound bone name. */
    localRotations: Record<string, Quat>;
    /** World-space hips position (rig space) for the rig root. */
    hipsWorldPosition: Vec3;
    /** Bones skipped this frame (missing rest data or low confidence). */
    skipped: string[];
    /** Canonical points rejected as teleports this frame. */
    rejectedPoints: string[];
    /** Bones currently held by confidence hysteresis. */
    held: string[];
    /** Bones clamped by a hinge limit this frame. */
    clamped: string[];
}
/**
 * Direction + roll retarget solver with the Sprint 7 stability layers:
 *
 * 1. Point outlier gate   — teleport glitches are clamped to last-frame pos.
 * 2. Spine distribution   — multi-bone spine chains share one canonical bend.
 * 3. Per-bone stabilizer  — adaptive smoothing + jump rejection + confidence
 *                           hysteresis.
 * 4. Hinge joint limits   — elbows/knees can't hyperextend or invert.
 * 5. Foot ground lock     — planted feet don't slide; hips absorb the delta.
 *
 * Core math is unchanged from Sprint 6: for each bound bone, solve the
 * rotation that maps its rest reference frame onto the segment frame built
 * from the canonical pose, then convert the target world rotation into a
 * local rotation relative to the already-solved parent.
 */
export declare class RetargetSolver {
    private readonly bindings;
    private readonly rest;
    private readonly legacySmoothing;
    private readonly minConfidence;
    private readonly parentOf;
    private readonly chainMembers;
    private readonly stabilizer;
    private readonly pointGate;
    private readonly hinges;
    private readonly footLock;
    private current;
    constructor(bindings: RigBoneBinding[], rest: RestPoseData, options?: RetargetOptions);
    /**
     * Solve one frame.
     *
     * @param pose      canonical pose (mapper convention: y-up, -z forward,
     *                  hip-centered — MediaPipe world-landmark convention)
     * @param axisMap   how canonical coordinates map into rig space
     * @param hipsScale scales the mapped pelvis position into rig units
     */
    solve(pose: CanonicalPose, axisMap?: CanonicalAxisMapping, hipsScale?: number): RetargetResult;
    /** Drop smoothing history (e.g. on capture stop). */
    reset(): void;
    /** Exposed for apps that want to blend results themselves. */
    getCurrentRotations(): Record<string, Quat>;
    private holdCurrent;
    /**
     * Rig-parent of a binding's bone, discovered from the rest snapshot's
     * structural table: the closest already-ordered binding whose canonical
     * bone is the structural parent.
     */
    private findParentName;
}
//# sourceMappingURL=retarget-solver.d.ts.map