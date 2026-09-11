import type { PoseResult, MotionClip } from "@motion-forge/pose";

// ---------------------------------------------------------------------------
// Types (preserved from the React/Zustand version so the rest of the app stays
// semantically identical during the vanilla refactor).
// ---------------------------------------------------------------------------

export type ProviderId =
  | "auto"
  | "mediapipe"
  | "rtmpose"
  | "nvidia"
  | "custom"
  | "unknown";

export type CaptureState =
  | "idle"
  | "requestingcamera"
  | "camera-ready"
  | "capturing"
  | "error";

export type DefaultCharacter = "eric" | "carla" | "custom";
export type RecordState = "idle" | "recording" | "paused";
export type PlaybackState = "stopped" | "playing" | "paused";

export function isCaptureState(value) {
  return (
    value === "idle" ||
    value === "requestingcamera" ||
    value === "camera-ready" ||
    value === "capturing" ||
    value === "error"
  );
}

/** Deterministic clip id (createdAt is unique per recording). */
export function clipIdOf(clip) {
  return `clip-${clip.metadata.createdAt}-${clip.metadata.frameCount}`;
}

// ---------------------------------------------------------------------------
// Vanilla store
// ---------------------------------------------------------------------------

function createAppStore(initial) {
  let state = initial;
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(partial) {
      state = typeof partial === "function"
        ? partial(state)
        : Object.assign(state, partial);
      for (const listener of listeners) {
        listener(state);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const initialState = {
  providerId: "auto",
  activeProviderId: "auto",
  captureState: "idle",
  cameraReady: false,
  characterLoaded: true,
  defaultCharacter: "eric",
  customCharacterUrl: null,
  poseError: null,
  selectedDeviceId: null,
  currentPose: null,
  inferenceFps: 0,
  inferenceLatencyMs: 0,
  diagnosticsLine: null,
  recordState: "idle",
  pendingClip: null,
  clips: [],
  playbackState: "stopped",
  playbackClipId: null,
};

const store = createAppStore(initialState);

// ---------------------------------------------------------------------------
// Actions (preserved from the Zustand version; only the backing store changed)
// ---------------------------------------------------------------------------

const setProviderId = (id) => store.setState({ providerId: id });
const setActiveProviderId = (id) => store.setState({ activeProviderId: id });
const setCameraReady = (ready) => store.setState({ cameraReady: ready });
const setCharacterLoaded = (loaded) => store.setState({ characterLoaded: loaded });
const setDefaultCharacter = (char) => store.setState({ defaultCharacter: char });
const setCustomCharacterUrl = (url) => store.setState({ customCharacterUrl: url, defaultCharacter: "custom" });
const setPoseError = (error) => store.setState({ poseError: error });
const setSelectedDeviceId = (deviceId) => store.setState({ selectedDeviceId: deviceId });
const setCaptureState = (state) => store.setState({ captureState: state });
const setCurrentPose = (pose, fps = 0, latencyMs = 0) =>
  store.setState({ currentPose: pose, inferenceFps: fps, inferenceLatencyMs: latencyMs });
const setDiagnosticsLine = (line) => store.setState({ diagnosticsLine: line });
const setRecordState = (state) => store.setState({ recordState: state });
const setPendingClip = (clip) => store.setState({ pendingClip: clip });
const addClip = (clip) =>
  store.setState((s) => ({ clips: [clip, ...s.clips] }));
const removeClip = (clipId) =>
  store.setState((s) => ({
    clips: s.clips.filter((c) => clipIdOf(c) !== clipId),
    playbackState:
      s.playbackClipId === clipId && s.playbackState !== "stopped"
        ? "stopped"
        : s.playbackState,
    playbackClipId: s.playbackClipId === clipId ? null : s.playbackClipId,
  }));
const renameClip = (clipId, name) =>
  store.setState((s) => ({
    clips: s.clips.map((c) =>
      clipIdOf(c) === clipId
        ? { ...c, metadata: { ...c.metadata, name } }
        : c,
    ),
  }));
const setPlaybackState = (state, clipId) =>
  store.setState((s) => ({
    playbackState: state,
    playbackClipId: clipId !== undefined ? clipId : s.playbackClipId,
  }));

export {
  store,
  setProviderId,
  setActiveProviderId,
  setCameraReady,
  setCharacterLoaded,
  setDefaultCharacter,
  setCustomCharacterUrl,
  setPoseError,
  setSelectedDeviceId,
  setCaptureState,
  setCurrentPose,
  setDiagnosticsLine,
  setRecordState,
  setPendingClip,
  addClip,
  removeClip,
  renameClip,
  setPlaybackState,
  PlaybackState,
};
