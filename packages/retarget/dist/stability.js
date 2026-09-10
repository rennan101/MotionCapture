import { clamp, quatAngleDeg, quatSlerp } from "./quat.js";
export class BoneStabilizer {
    options;
    states = new Map();
    constructor(options = {}) {
        this.options = {
            baseSmoothing: options.baseSmoothing ?? 0.5,
            velocitySmoothingGain: options.velocitySmoothingGain ?? 0.04,
            jumpSmoothing: options.jumpSmoothing ?? 0.85,
            jumpThresholdDeg: options.jumpThresholdDeg ?? 110,
            velocitySaturationDeg: options.velocitySaturationDeg ?? 25,
            reacquireMargin: options.reacquireMargin ?? 0.1,
        };
    }
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
    stabilize(boneName, solved, restLocal, confidence, minConfidence) {
        const prevState = this.states.get(boneName);
        const prev = prevState?.prev ?? restLocal;
        const heldFrames = prevState?.heldFrames ?? 0;
        const relockFrames = prevState?.relockFrames ?? 0;
        const engagedFrames = prevState?.engagedFrames ?? 0;
        const dropThreshold = minConfidence;
        const reacquireThreshold = minConfidence + this.options.reacquireMargin;
        // Confidence hysteresis: bone below threshold stays held; a held bone
        // only re-engages above threshold + margin.
        const wasHeld = heldFrames > 0;
        if (confidence < (wasHeld ? reacquireThreshold : dropThreshold)) {
            this.states.set(boneName, { prev, heldFrames: heldFrames + 1, relockFrames: 0, engagedFrames });
            return { rotation: prev, outlier: false, held: true };
        }
        // First-ever engagement: there is no motion history, so a large offset
        // from rest is just the pose, not a glitch — accept it directly.
        if (!prevState) {
            this.states.set(boneName, { prev: solved, heldFrames: 0, relockFrames: 0, engagedFrames: 1 });
            return { rotation: solved, outlier: false, held: false };
        }
        const angle = quatAngleDeg(prev, solved);
        // Outlier rejection needs at least two engaged frames of history —
        // otherwise a legitimate fast motion after reset looks like a jump.
        const outlier = engagedFrames >= 2 && angle > this.options.jumpThresholdDeg;
        let smoothing;
        if (outlier || wasHeld) {
            // After a gap or a jump, re-lock gently instead of snapping, and keep
            // the gentle blend for a few frames so the re-entry is invisible.
            smoothing = this.options.jumpSmoothing;
            this.states.set(boneName, {
                prev: quatSlerp(prev, solved, 1 - smoothing),
                heldFrames: 0,
                relockFrames: RELOCK_FRAMES - 1,
                engagedFrames: 0,
            });
            const rotation = this.states.get(boneName).prev;
            return { rotation, outlier, held: false };
        }
        if (relockFrames > 0) {
            smoothing = this.options.jumpSmoothing;
            this.states.set(boneName, {
                prev: quatSlerp(prev, solved, 1 - smoothing),
                heldFrames: 0,
                relockFrames: relockFrames - 1,
                engagedFrames: 0,
            });
            return { rotation: this.states.get(boneName).prev, outlier: false, held: false };
        }
        // Adaptive smoothing: still poses damp hard (jitter-free), fast motions
        // pass through almost unchanged (no lag) — smoothing DECREASES with
        // angular velocity and floors near zero at saturation.
        const velocity = clamp(angle / this.options.velocitySaturationDeg, 0, 1);
        smoothing = clamp(this.options.baseSmoothing -
            velocity * velocity * this.options.velocitySmoothingGain * 10, 0.05, 0.95);
        const rotation = quatSlerp(prev, solved, 1 - smoothing);
        this.states.set(boneName, { prev: rotation, heldFrames: 0, relockFrames: 0, engagedFrames: engagedFrames + 1 });
        return { rotation, outlier, held: false };
    }
    /** True when the bone is currently held (confidence hysteresis active). */
    isHeld(boneName) {
        return (this.states.get(boneName)?.heldFrames ?? 0) > 0;
    }
    /** Drop all history (capture stop). */
    reset() {
        this.states.clear();
    }
}
export class PointOutlierGate {
    maxJump;
    prevPositions = new Map();
    constructor(options = {}) {
        this.maxJump = options.maxJumpMeters ?? 1.2;
    }
    /**
     * Filters a mapped pose: outlier points are replaced by their previous
     * position (confidence preserved, so confidence-driven logic still works).
     * Returns the corrected point record plus the rejected names.
     */
    filter(points) {
        const rejected = [];
        const out = {};
        const next = new Map();
        for (const [name, point] of Object.entries(points)) {
            const prev = this.prevPositions.get(name);
            if (prev) {
                const dx = point.position[0] - prev[0];
                const dy = point.position[1] - prev[1];
                const dz = point.position[2] - prev[2];
                const jump = Math.hypot(dx, dy, dz);
                if (jump > this.maxJump) {
                    rejected.push(name);
                    out[name] = { position: [...prev], confidence: point.confidence };
                    next.set(name, prev);
                    continue;
                }
            }
            out[name] = point;
            next.set(name, point.position);
        }
        // Keep the (possibly corrected) positions for the next frame.
        this.prevPositions.clear();
        for (const [k, v] of next)
            this.prevPositions.set(k, v);
        return { points: out, rejected };
    }
    reset() {
        this.prevPositions.clear();
    }
}
/** How many frames the gentle re-lock blend lasts after an outlier. */
const RELOCK_FRAMES = 6;
//# sourceMappingURL=stability.js.map