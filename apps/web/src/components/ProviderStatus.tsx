import { useMemo } from "react";
import type { ProviderId } from "../store.ts";
import type { PoseProviderRegistry } from "@motion-forge/pose";
import type { ProviderMetadata } from "@motion-forge/pose";

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 0",
};

const LABEL: React.CSSProperties = {
  fontSize: 12,
  color: "#b9b9c4",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const VALUE: React.CSSProperties = {
  fontSize: 12,
  color: "#b9b9c4",
  background: "#2a2a33",
  padding: "4px 8px",
  borderRadius: 6,
};

const REASON: React.CSSProperties = {
  fontSize: 11,
  color: "#f0888a",
  marginLeft: "auto",
};

type CaptureStateId =
  | "idle"
  | "requesting-camera"
  | "camera-ready"
  | "capturing"
  | "error";

interface ProviderStatusProps {
  providerId: ProviderId;
  active: boolean;
  message?: string;
  registry?: PoseProviderRegistry;
  requestedProviderId?: ProviderId;
  captureState?: string;
}

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

export function ProviderStatus({
  providerId,
  active,
  message = "pronto",
  registry,
  requestedProviderId,
  captureState,
}: ProviderStatusProps) {
  const resolvedId = useMemo<ProviderId>(() => {
    if (registry) {
      return registry.resolveSelection(providerId);
    }
    return providerId;
  }, [providerId, registry]);

  const resolvedLabel = useMemo<string>(() => {
    const effectiveRequestedId:
      | "auto"
      | "mediapipe"
      | "rtmpose"
      | "nvidia"
      | "custom"
      | "unknown" = requestedProviderId ?? providerId;

    if (registry && effectiveRequestedId === "auto") {
      if (resolvedId === "unknown") {
        return "nenhum backend disponível";
      }
      const metadata = registry.getMetadata(resolvedId);
      if (metadata) {
        return metadata.label;
      }
      return resolvedId;
    }

    if (resolvedId === "unknown") {
      return "nenhum backend disponível";
    }
    return resolvedId;
  }, [registry, providerId, resolvedId, requestedProviderId]);

  const reason = useMemo<string | undefined>(() => {
    if (!registry) return undefined;
    const targetId:
      | "auto"
      | "mediapipe"
      | "rtmpose"
      | "nvidia"
      | "custom"
      | "unknown" = requestedProviderId ?? providerId;
    const metadata = registry.getMetadata(targetId);
    return metadata?.reasonUnavailable;
  }, [registry, providerId, resolvedId, requestedProviderId]);

  const requestingCamera = asCaptureStateId(captureState) === "requesting-camera";
  const isCapturing = asCaptureStateId(captureState) === "capturing";
  const isCameraReady = asCaptureStateId(captureState) === "camera-ready";

  const backendPillColor: React.CSSProperties =
    requestingCamera
      ? { background: "#2a3a2e", color: "#cfe9d4" }
      : isCapturing && active
        ? { background: "#1c3a2e", color: "#7fe3b4" }
        : { background: "#2a2a33", color: "#b9b9c4" };

  const messagePillColor: React.CSSProperties =
    requestingCamera || isCapturing
      ? { background: "#2a3a2e", color: "#cfe9d4" }
      : { background: "#2a2a33", color: "#b9b9c4" };

  const messageToRender: string =
    requestingCamera
      ? "solicitando câmera…"
      : isCapturing && active
        ? message || "capturando…"
        : isCameraReady && active
          ? message || "câmera pronta"
          : active
            ? message
            : "pendente";

  return (
    <div style={ROW}>
      <span style={LABEL}>Backend ativo</span>
      <span style={{ ...VALUE, ...backendPillColor }}>
        {resolvedLabel}
      </span>
      <span style={{ ...VALUE, ...messagePillColor }}>
        {messageToRender}
      </span>
      {reason && <span style={REASON}>{reason}</span>}
    </div>
  );
}
