import type { CanonicalPose } from "./pose-provider.js";
/**
 * Motion clip data model (Sprint 8).
 *
 * A clip is a stream of canonical poses sampled at the provider's inference
 * rate. Frames are stored exactly as the retarget solver consumes them, so
 * playback reuses the same code path as live capture and nothing is lost
 * between capture and export.
 */
export declare const CLIP_FORMAT_VERSION: 1;
/** Hard safety limits so a forgotten recording can't exhaust memory. */
export declare const CLIP_MAX_FRAMES = 18000;
export declare const CLIP_MAX_DURATION_MS: number;
export interface MotionClipMetadata {
    /** Human-readable name (unique per clip list; UI may rename). */
    name: string;
    /** Epoch ms when recording stopped. */
    createdAt: number;
    /** Timestamp of the last frame (ms from record start). */
    durationMs: number;
    /** Number of stored frames. */
    frameCount: number;
    /** Effective average sample rate (frames / duration). 0 when unknown. */
    sampleRateHz: number;
    source: {
        /** Provider id requested by the user ("auto", "mediapipe", …). */
        providerId: string;
        /** Provider actually resolved by the registry. */
        engineName: string;
    };
    notes?: string;
}
export interface MotionClip {
    formatVersion: typeof CLIP_FORMAT_VERSION;
    metadata: MotionClipMetadata;
    /** Canonical pose frames, ordered by `timestamp` (ms from record start). */
    frames: CanonicalPose[];
}
export interface ClipRecorderOptions {
    /** Extra frames beyond CLIP_MAX_FRAMES are dropped. */
    maxFrames?: number;
    /** Recording longer than this stops adding frames. */
    maxDurationMs?: number;
    /** Minimum interval between stored frames (ms). 0 = store every frame. */
    minIntervalMs?: number;
}
/**
 * Records canonical poses into a MotionClip.
 *
 * Timing uses the monotonic `performance.now()` clock and excludes paused
 * time, so pause/resume does not produce gaps in frame timestamps.
 */
export declare class ClipRecorder {
    private readonly maxFrames;
    private readonly maxDurationMs;
    private readonly minIntervalMs;
    private frames;
    private startWallTime;
    private pausedTotalMs;
    private lastPauseStartedAt;
    private lastFrameTimestamp;
    private engineName;
    private providerId;
    private recording;
    private paused;
    constructor(options?: ClipRecorderOptions);
    /** Begins a new recording. Discards any previous (unstopped) content. */
    start(providerId: string, engineName: string): void;
    /**
     * Adds one pose. Returns false when not recording, paused, or when the
     * frame was dropped (interval/limits).
     */
    addPose(pose: CanonicalPose): boolean;
    /** Pauses: subsequent addPose calls are ignored, clock holds. */
    pause(): void;
    /** Resumes a paused recording (no-op otherwise). */
    resume(): void;
    /**
     * Finalizes the recording and returns the clip, or null when nothing was
     * captured. The recorder resets itself and is reusable afterwards.
     */
    stop(): MotionClip | null;
    /** Monotonic elapsed recording time (ms), excluding paused time. */
    get elapsedMs(): number;
    get isRecording(): boolean;
    get isPaused(): boolean;
    get frameCount(): number;
    /** Drops all state; recorder becomes idle. */
    reset(): void;
    private computeElapsedMs;
}
//# sourceMappingURL=motion-clip.d.ts.map