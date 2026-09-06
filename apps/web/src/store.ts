import { create } from "zustand";
import type { PoseResult } from "@motion-forge/pose";

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
}));

