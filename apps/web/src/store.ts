import { create } from "zustand";

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
  poseError: string | null;
  selectedDeviceId: string | null;
  setProviderId: (id: ProviderId) => void;
  setActiveProviderId: (id: ProviderId) => void;
  setCaptureState: (state: CaptureState) => void;
  setCameraReady: (ready: boolean) => void;
  setCharacterLoaded: (loaded: boolean) => void;
  setPoseError: (error: string | null) => void;
  setSelectedDeviceId: (deviceId: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  providerId: "auto",
  activeProviderId: "auto",
  captureState: "idle",
  cameraReady: false,
  characterLoaded: false,
  poseError: null,
  selectedDeviceId: null,
  setProviderId: (id) => set({ providerId: id }),
  setActiveProviderId: (id) => set({ activeProviderId: id }),
  setCameraReady: (ready: boolean) => set({ cameraReady: ready }),
  setCharacterLoaded: (loaded: boolean) => set({ characterLoaded: loaded }),
  setPoseError: (error: string | null) => set({ poseError: error }),
  setSelectedDeviceId: (deviceId: string | null) => set({ selectedDeviceId: deviceId }),
  setCaptureState: (state: CaptureState) => set({ captureState: state }),
}));
