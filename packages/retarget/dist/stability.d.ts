import { type Quat } from "./quat.js";
/**
 * Per-bone temporal stabilizer for live capture.
 *
 * Combines three classic mocap-cleanup ideas:
 *
 * 1. Adaptive smoothing — the blend factor grows with angular velocity, so
 *    slow poses are heavily damped (no jitter) while fast motions pass
 *    through almost unchanged (no lag/ghosting).
 * 2. Outlier rejection — a single-frame jump larger than `jumpThresholdDeg`
 *    is suspect (pose flip, tracker glitch); the bone eases toward it with
 *    a heavy blend instead of snapping.
 * 3. Confidence hysteresis — bones don't flicker between tracked and held:
 *    a dropped bone re-engages only after confidence recovers past
 *    `reacquireMargin` above the drop threshold, with a short re-lock blend.
 */
export interface StabilizerOptions {
    /** Base smoothing at zero velocity, 0..1. Higher = calmer. Default 0.5. */
    baseSmoothing?: number;
    /** Smoothing removed per (deg/frame)² of angular velocity, ×saturation². Default 0.04. */
    velocitySmoothingGain?: number;
    /** Smoothing used right after an outlier or re-acquire. Default 0.85. */
    jumpSmoothing?: number;
    /** Angular jump (deg vs previous frame) treated as an outlier. Default 110. */
    jumpThresholdDeg?: number;
    /** Angular velocity (deg/frame) at which velocity smoothing saturates. Default 25. */
    velocitySaturationDeg?: number;
    /** Extra confidence margin required to re-engage a held bone. Default 0.1. */
    reacquireMargin?: number;
}
export declare class BoneStabilizer {
    private readonly options;
    private readonly states;
    constructor(options?: StabilizerOptions);
    /**
     * Blend a freshly solved local rotation into the stabilized stream.
     *
     * @param boneName          stable bone identifier
     * @param solved            raw local rotation for this frame
     * @param restLocal         rest local rotation (fallback before first frame)
     * @param confidence        segment confidence for this frame
     * @param minConfidence     the solver's drop threshold
     * @returns the stabilized local rotation plus diagnostics
     */
    stabilize(boneName: string, solved: Quat, restLocal: Quat, confidence: number, minConfidence: number): {
        rotation: Quat;
        outlier: boolean;
        held: boolean;
    };
    /** True when the bone is currently held (confidence hysteresis active). */
    isHeld(boneName: string): boolean;
    /** Drop all history (capture stop). */
    reset(): void;
}
/**
 * Frame-to-frame outlier gate for a whole pose: rejects canonical points
 * whose position jumped impossibly far between frames (teleport glitch).
 * Returns the set of point names considered outliers this frame.
 */
export interface PointOutlierOptions {
    /** Max plausible inter-frame point motion in meters. Default 1.2. */
    maxJumpMeters?: number;
}
export declare class PointOutlierGate {
    private readonly maxJump;
    private readonly prevPositions;
    constructor(options?: PointOutlierOptions);
    /**
     * Filters a mapped pose: outlier points are replaced by their previous
     * position (confidence preserved, so confidence-driven logic still works).
     * Returns the corrected point record plus the rejected names.
     */
    filter(points: Record<string, {
        position: [number, number, number];
        confidence: number;
    }>): {
        points: Record<string, {
            position: [number, number, number];
            confidence: number;
        }>;
        rejected: string[];
    };
    reset(): void;
}
//# sourceMappingURL=stability.d.ts.map