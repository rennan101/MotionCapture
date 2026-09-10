import { create } from "zustand";
import type { PoseResult, MotionClip } from "@motion-forge/pose";

export type ProviderId =
  | "auto"
  | "mediapipe"
  | "rtmpose"
  | "nvidia"
  | "custom"
  | "unknown";

export type CaptureState =
  | "idle"
  | "requesting-camera"
  | "camera-ready"
  | "capturing"
  | "error";

export type DefaultCharacter = "eric" | "carla" | "custom";

export type RecordState = "idle" | "recording" | "paused";
export type PlaybackState = "stopped" | "playing" | "paused";

export function isCaptureState(value: string): value is CaptureState {
  return (
    value === "idle" ||
    value === "requesting-camera" ||
    value === "camera-ready" ||
    value === "capturing" ||
    value === "error"
  );
}

export interface AppState {
  providerId: ProviderId;
  activeProviderId: ProviderId;
  captureState: CaptureState;
  cameraReady: boolean;
  characterLoaded: boolean;
  defaultCharacter: DefaultCharacter;
  customCharacterUrl: string | null;
  poseError: string | null;
  selectedDeviceId: string | null;
  currentPose: PoseResult | null;
  inferenceFps: number;
  inferenceLatencyMs: number;
  /** Latest visible camera/worker diagnostics line; kept short on purpose. */
  diagnosticsLine: string | null;
  // --- Recording (Sprint 8) ---
  recordState: RecordState;
  /** Clip captured in the current session, awaiting explicit save/discard. */
  pendingClip: MotionClip | null;
  /** Saved clips (newest first). */
  clips: MotionClip[];
  // --- Playback (Sprint 8) ---
  playbackState: PlaybackState;
  playbackClipId: string | null;
  /** Deterministic id for clip identification (createdAt + name hash). */
  setProviderId: (id: ProviderId) => void;
  setActiveProviderId: (id: ProviderId) => void;
  setCaptureState: (state: CaptureState) => void;
  setCameraReady: (ready: boolean) => void;
  setCharacterLoaded: (loaded: boolean) => void;
  setDefaultCharacter: (char: DefaultCharacter) => void;
  setCustomCharacterUrl: (url: string | null) => void;
  setPoseError: (error: string | null) => void;
  setSelectedDeviceId: (deviceId: string | null) => void;
  setCurrentPose: (pose: PoseResult | null, fps?: number, latencyMs?: number) => void;
  setRecordState: (state: RecordState) => void;
  setPendingClip: (clip: MotionClip | null) => void;
  addClip: (clip: MotionClip) => void;
  removeClip: (clipId: string) => void;
  renameClip: (clipId: string, name: string) => void;
  setPlaybackState: (state: PlaybackState, clipId?: string | null) => void;
}

/** A clip's stable identifier (createdAt is unique per recording). */
export function clipIdOf(clip: MotionClip): string {
  return `clip-${clip.metadata.createdAt}-${clip.metadata.frameCount}`;
}

export const useAppStore = create<AppState>((set) => ({
  providerId: "auto",
  activeProviderId: "auto",
  captureState: "idle",
  cameraReady: false,
  characterLoaded: true, // Default template model loaded
  defaultCharacter: "eric",
  customCharacterUrl: null,
  poseError: null,
  selectedDeviceId: null,
  currentPose: null,
  inferenceFps: 0,
  inferenceLatencyMs: 0,
  recordState: "idle",
  pendingClip: null,
  clips: [],
  playbackState: "stopped",
  playbackClipId: null,
  diagnosticsLine: null,
  setProviderId: (id) => set({ providerId: id }),
  setActiveProviderId: (id) => set({ activeProviderId: id }),
  setCameraReady: (ready: boolean) => set({ cameraReady: ready }),
  setCharacterLoaded: (loaded: boolean) => set({ characterLoaded: loaded }),
  setDefaultCharacter: (char) => set({ defaultCharacter: char }),
  setCustomCharacterUrl: (url) => set({ customCharacterUrl: url, defaultCharacter: "custom" }),
  setPoseError: (error: string | null) => set({ poseError: error }),
  setSelectedDeviceId: (deviceId: string | null) => set({ selectedDeviceId: deviceId }),
  setCaptureState: (state: CaptureState) => set({ captureState: state }),
  setCurrentPose: (pose, fps = 0, latencyMs = 0) =>
    set({ currentPose: pose, inferenceFps: fps, inferenceLatencyMs: latencyMs }),
  setDiagnosticsLine: (line: string | null) => set({ diagnosticsLine: line }),
  setRecordState: (state) => set({ recordState: state }),
  setPendingClip: (clip) => set({ pendingClip: clip }),
  addClip: (clip) => set((s) => ({ clips: [clip, ...s.clips] })),
  removeClip: (clipId) =>
    set((s) => ({
      clips: s.clips.filter((c) => clipIdOf(c) !== clipId),
      // Stop playback if the played clip is being removed.
      playbackState:
        s.playbackClipId === clipId && s.playbackState !== "stopped"
          ? "stopped"
          : s.playbackState,
      playbackClipId: s.playbackClipId === clipId ? null : s.playbackClipId,
    })),
  renameClip: (clipId, name) =>
    set((s) => ({
      clips: s.clips.map((c) =>
        clipIdOf(c) === clipId ? { ...c, metadata: { ...c.metadata, name } } : c,
      ),
    })),
  setPlaybackState: (state, clipId) =>
    set((s) => ({
      playbackState: state,
      playbackClipId: clipId !== undefined ? clipId : s.playbackClipId,
    })),
  diagnosticsLine: null,
}));

