import type { CanonicalPose, MotionClip, PoseResult, ProviderId } from "@motion-forge/pose";

/**
 * Clip playback (Sprint 8): walks a MotionClip's frames on a rAF loop and
 * emits PoseResults through the same callback used by live capture, so the
 * viewport, retarget and skeleton views work unchanged.
 */
export type ClipFrameCallback = (result: PoseResult | null, elapsedMs: number) => void;

export interface ClipPlaybackOptions {
  /** Playback rate multiplier (1 = real time). Default 1. */
  rate?: number;
  /** Loop back to the start when the clip ends. Default false. */
  loop?: boolean;
}

/** Wraps a canonical frame into the PoseResult shape the UI already eats. */
function frameToResult(frame: CanonicalPose, providerId: ProviderId): PoseResult {
  return {
    canonical: frame,
    providerId,
    latencyMs: 0,
    warnings: [],
  };
}

export class ClipPlayback {
  private readonly onFrame: ClipFrameCallback;
  private readonly rate: number;
  private readonly loop: boolean;

  private clip: MotionClip | null = null;
  private providerId: ProviderId = "mediapipe";
  private animId = 0;
  private startClock = 0;
  private pausedAtMs: number | null = null;
  private cursor = 0;
  private finished = false;

  constructor(onFrame: ClipFrameCallback, options: ClipPlaybackOptions = {}) {
    this.onFrame = onFrame;
    this.rate = options.rate ?? 1;
    this.loop = options.loop ?? false;
  }

  /** Loads a clip and starts playing from the beginning. */
  play(clip: MotionClip, providerId: ProviderId = "mediapipe"): void {
    this.stop();
    if (clip.frames.length === 0) return;
    this.clip = clip;
    this.providerId = providerId;
    this.cursor = 0;
    this.finished = false;
    this.startClock = performance.now();
    this.animId = requestAnimationFrame(this.tick);
  }

  /** Pauses at the current frame (no-op when not playing). */
  pause(): void {
    if (!this.clip || this.pausedAtMs !== null) return;
    this.pausedAtMs = this.elapsedTargetMs();
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
    this.emit(this.cursor);
  }

  /** Resumes from the paused position. */
  resume(): void {
    if (!this.clip || this.pausedAtMs === null) return;
    // Shift the clock so elapsedTargetMs() continues from the pause point.
    this.startClock = performance.now() - this.pausedAtMs / this.rate;
    this.pausedAtMs = null;
    this.animId = requestAnimationFrame(this.tick);
  }

  /** Halts playback and releases the loop. */
  stop(): void {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
    this.clip = null;
    this.pausedAtMs = null;
    this.cursor = 0;
    this.finished = false;
  }

  get isPlaying(): boolean {
    return this.clip !== null && this.pausedAtMs === null;
  }

  get isPaused(): boolean {
    return this.clip !== null && this.pausedAtMs !== null;
  }

  /** Current target time on the clip timeline (ms). */
  private elapsedTargetMs(): number {
    return (performance.now() - this.startClock) * this.rate;
  }

  private tick = () => {
    const clip = this.clip;
    if (!clip) return;
    this.animId = requestAnimationFrame(this.tick);

    const target = this.elapsedTargetMs();
    const frames = clip.frames;

    // Advance the cursor to the last frame at or before the target time.
    while (
      this.cursor < frames.length - 1 &&
      frames[this.cursor + 1].timestamp <= target
    ) {
      this.cursor++;
    }

    const endTs = frames[frames.length - 1].timestamp;
    if (target >= endTs) {
      this.emit(frames.length - 1);
      if (this.loop) {
        this.cursor = 0;
        this.startClock = performance.now();
      } else {
        this.finished = true;
        if (this.animId) {
          cancelAnimationFrame(this.animId);
          this.animId = 0;
        }
      }
      return;
    }

    this.emit(this.cursor);
  };

  private emit(index: number): void {
    const clip = this.clip;
    if (!clip) return;
    const frame = clip.frames[index];
    if (!frame) return;
    this.onFrame(frameToResult(frame, this.providerId), frame.timestamp);
  }
}

/** Whether playback ended (used by the owner to flip UI state). */
export function playbackEnded(pb: ClipPlayback): boolean {
  return pb["finished"] === true && !pb.isPlaying;
}
