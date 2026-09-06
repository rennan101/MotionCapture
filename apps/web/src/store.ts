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

export interface AppState {
  providerId: ProviderId;
  activeProviderId: ProviderId;
  captureState: CaptureState;
  cameraReady: boolean;
  characterLoaded: boolean;
  poseError: string | null;
  setProviderId: (id: ProviderId) => void;
  setActiveProviderId: (id: ProviderId) => void;
  setCaptureState: (state: CaptureState) => void;
  setCameraReady: (ready: boolean) => void;
  setCharacterLoaded: (loaded: boolean) => void;
  setPoseError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  providerId: "auto",
  activeProviderId: "auto",
  captureState: "idle",
  cameraReady: false,
  characterLoaded: false,
  poseError: null,
  setProviderId: (id) => set({ providerId: id }),
  setActiveProviderId: (id) => set({ activeProviderId: id }),
  setCaptureState: (state) => set({ captureState: state }),
  setCameraReady: (ready) => set({ cameraReady: ready }),
  setCharacterLoaded: (loaded) => set({ characterLoaded: loaded }),
  setPoseError: (error) => set({ poseError: error }),
}));
