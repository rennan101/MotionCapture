import { useMemo } from "react";
import type { ProviderId } from "../store.ts";
import type { PoseProviderRegistry } from "@motion-forge/pose";

export function StatusBar({
  providerId,
  isCaptureRunning,
  cameraReady,
  characterLoaded,
  registry,
}: {
  providerId: ProviderId;
  isCaptureRunning: boolean;
  cameraReady: boolean;
  characterLoaded: boolean;
  registry?: PoseProviderRegistry;
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

  return (
    <div style={STATUS_WRAPPER}>
      <span style={{ ...PILL, ...providerPillColor }}>Provider: {displayProvider}</span>
      <span style={PILL}>Capture:{isCaptureRunning ? " on" : " off"}</span>
      <span style={PILL}>Camera:{cameraReady ? " ready" : " no"}</span>
      <span style={PILL}>Character:{characterLoaded ? " loaded" : " none"}</span>
    </div>
  );
}

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
