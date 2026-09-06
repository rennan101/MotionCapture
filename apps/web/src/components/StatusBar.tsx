import { useMemo } from "react";
import type { ProviderId } from "../store.ts";
import type { PoseProviderRegistry } from "@motion-forge/pose";

const STATUS_WRAPPER: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginLeft: "auto",
};

const PILL: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 8px",
  borderRadius: 999,
  background: "#222",
  color: "#ddd",
};

type CaptureStateId =
  | "idle"
  | "requesting-camera"
  | "camera-ready"
  | "capturing"
  | "error";

function asCaptureStateId(value: string | undefined): CaptureStateId {
  if (value === "requesting-camera") {
    return "requesting-camera";
  }
  if (value === "idle") {
    return "idle";
  }
  if (value === "camera-ready") {
    return "camera-ready";
  }
  if (value === "capturing") {
    return "capturing";
  }
  if (value === "error") {
    return "error";
  }
  return "idle";
}

export function StatusBar({
  providerId,
  isCaptureRunning,
  cameraReady,
  characterLoaded,
  registry,
  captureState,
}: {
  providerId: ProviderId;
  isCaptureRunning: boolean;
  cameraReady: boolean;
  characterLoaded: boolean;
  registry?: PoseProviderRegistry;
  captureState?: string;
}) {
  const displayProvider = useMemo<string>(() => {
    if (!registry || providerId !== "auto") return providerId;
    const resolved = registry.resolveSelection(providerId);
    const metadata = registry.getMetadata(resolved);
    if (metadata && resolved !== "unknown") {
      return "auto → " + metadata.label;
    }
    if (resolved === "unknown") {
      return "auto → sem provider";
    }
    return "auto → " + resolved;
  }, [providerId, registry]);

  const providerPillColor = useMemo<React.CSSProperties>(() => {
    if (registry && providerId === "auto") {
      const resolved = registry.resolveSelection(providerId);
      if (resolved === "unknown") {
        return { background: "#3a2a2a", color: "#f0888a" };
      }
    }
    return { background: "#222", color: "#ddd" };
  }, [providerId, registry]);

  const requestingCamera =
    asCaptureStateId(captureState) === "requesting-camera";
  const isCameraReady =
    asCaptureStateId(captureState) === "camera-ready";
  const captureLabel = requestingCamera
    ? "requesting"
    : isCaptureRunning
      ? "on"
      : "off";
  const cameraLabel = requestingCamera
    ? "requesting"
    : isCameraReady
      ? "ready"
      : cameraReady
        ? "ready"
        : "no";

  return (
    <div style={STATUS_WRAPPER}>
      <span style={{ ...PILL, ...providerPillColor }}>
        Provider: {displayProvider}
      </span>
      <span style={PILL}>Capture: {captureLabel}</span>
      <span style={PILL}>Camera: {cameraLabel}</span>
      <span style={PILL}>
        Character: {characterLoaded ? " loaded" : " none"}
      </span>
    </div>
  );
}
