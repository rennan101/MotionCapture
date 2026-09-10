import type { CanonicalPose } from "./pose-provider.js";

/**
 * Motion clip data model (Sprint 8).
 *
 * A clip is a stream of canonical poses sampled at the provider's inference
 * rate. Frames are stored exactly as the retarget solver consumes them, so
 * playback reuses the same code path as live capture and nothing is lost
 * between capture and export.
 */

export const CLIP_FORMAT_VERSION = 1 as const;

/** Hard safety limits so a forgotten recording can't exhaust memory. */
export const CLIP_MAX_FRAMES = 18000; // ~10–20 min at typical inference rates
export const CLIP_MAX_DURATION_MS = 10 * 60 * 1000;

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
export class ClipRecorder {
  private readonly maxFrames: number;
  private readonly maxDurationMs: number;
  private readonly minIntervalMs: number;

  private frames: CanonicalPose[] = [];
  private startWallTime = 0;
  private pausedTotalMs = 0;
  private lastPauseStartedAt: number | null = null;
  private lastFrameTimestamp = -Infinity;
  private engineName = "";
  private providerId = "";
  private recording = false;
  private paused = false;

  constructor(options: ClipRecorderOptions = {}) {
    this.maxFrames = options.maxFrames ?? CLIP_MAX_FRAMES;
    this.maxDurationMs = options.maxDurationMs ?? CLIP_MAX_DURATION_MS;
    this.minIntervalMs = options.minIntervalMs ?? 0;
  }

  /** Begins a new recording. Discards any previous (unstopped) content. */
  start(providerId: string, engineName: string): void {
    this.reset();
    this.recording = true;
    this.paused = false;
    this.providerId = providerId;
    this.engineName = engineName;
    this.startWallTime = performance.now();
  }

  /**
   * Adds one pose. Returns false when not recording, paused, or when the
   * frame was dropped (interval/limits).
   */
  addPose(pose: CanonicalPose): boolean {
    if (!this.recording || this.paused) return false;

    const elapsed = this.computeElapsedMs();
    if (elapsed > this.maxDurationMs) return false;
    if (this.frames.length >= this.maxFrames) return false;
    if (elapsed - this.lastFrameTimestamp < this.minIntervalMs) return false;

    // Frame timestamps come from OUR clock (not the provider's), so the
    // timeline is uniform even when inference latency jitters.
    const frame: CanonicalPose = { ...pose, timestamp: elapsed };
    this.frames.push(frame);
    this.lastFrameTimestamp = elapsed;
    return true;
  }

  /** Pauses: subsequent addPose calls are ignored, clock holds. */
  pause(): void {
    if (!this.recording || this.paused) return;
    this.paused = true;
    this.lastPauseStartedAt = performance.now();
  }

  /** Resumes a paused recording (no-op otherwise). */
  resume(): void {
    if (!this.recording || !this.paused) return;
    this.paused = false;
    if (this.lastPauseStartedAt !== null) {
      this.pausedTotalMs += performance.now() - this.lastPauseStartedAt;
      this.lastPauseStartedAt = null;
    }
  }

  /**
   * Finalizes the recording and returns the clip, or null when nothing was
   * captured. The recorder resets itself and is reusable afterwards.
   */
  stop(): MotionClip | null {
    if (!this.recording) return null;
    if (this.paused) this.resume();
    this.recording = false;

    const frames = this.frames;
    this.frames = [];
    if (frames.length === 0) return null;

    const last = frames[frames.length - 1];
    const durationMs = last.timestamp;
    const now = Date.now();
    return {
      formatVersion: CLIP_FORMAT_VERSION,
      metadata: {
        name: `Captura ${new Date(now).toLocaleString()}`,
        createdAt: now,
        durationMs,
        frameCount: frames.length,
        sampleRateHz:
          durationMs > 0 ? Math.round((frames.length / (durationMs / 1000)) * 100) / 100 : 0,
        source: { providerId: this.providerId, engineName: this.engineName },
      },
      frames,
    };
  }

  /** Monotonic elapsed recording time (ms), excluding paused time. */
  get elapsedMs(): number {
    return this.computeElapsedMs();
  }

  get isRecording(): boolean {
    return this.recording;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get frameCount(): number {
    return this.frames.length;
  }

  /** Drops all state; recorder becomes idle. */
  reset(): void {
    this.frames = [];
    this.startWallTime = 0;
    this.pausedTotalMs = 0;
    this.lastPauseStartedAt = null;
    this.lastFrameTimestamp = -Infinity;
    this.engineName = "";
    this.providerId = "";
    this.recording = false;
    this.paused = false;
  }

  private computeElapsedMs(): number {
    if (!this.recording) return 0;
    const now = performance.now();
    const pausedMs =
      this.paused && this.lastPauseStartedAt !== null
        ? now - this.lastPauseStartedAt
        : 0;
    return Math.max(0, now - this.startWallTime - this.pausedTotalMs - pausedMs);
  }
}
