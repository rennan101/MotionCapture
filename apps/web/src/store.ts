import { create } from "zustand";

export type ProviderId =
  | "auto"
  | "mediapipe"
  | "rtmpose"
  | "nvidia"
  | "custom"
  | "unknown";

export interface AppState {
  providerId: ProviderId;
  isCaptureRunning: boolean;
  cameraReady: boolean;
  characterLoaded: boolean;
  poseError: string | null;
  setProviderId: (id: ProviderId) => void;
  setCaptureRunning: (running: boolean) => void;
  setCameraReady: (ready: boolean) => void;
  setCharacterLoaded: (loaded: boolean) => void;
  setPoseError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  providerId: "auto",
  isCaptureRunning: false,
  cameraReady: false,
  characterLoaded: false,
  poseError: null,
  setProviderId: (id) => set({ providerId: id }),
  setCaptureRunning: (running) => set({ isCaptureRunning: running }),
  setCameraReady: (ready) => set({ cameraReady: ready }),
  setCharacterLoaded: (loaded) => set({ characterLoaded: loaded }),
  setPoseError: (error) => set({ poseError: error }),
}));
