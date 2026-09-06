import { useMemo } from "react";
import type { ProviderId } from "../store.ts";
import type { ProviderMetadata, PoseProviderRegistry } from "@motion-forge/pose";

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

interface ProviderStatusProps {
  providerId: ProviderId;
  active: boolean;
  message?: string;
  registry?: PoseProviderRegistry;
  requestedProviderId?: ProviderId;
}

export function ProviderStatus({
  providerId,
  active,
  message = "pronto",
  registry,
  requestedProviderId,
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

  return (
    <div style={ROW}>
      <span style={LABEL}>Backend ativo</span>
      <span
        style={{
          ...VALUE,
          background: active ? "#1c3a2e" : "#2a2a33",
          color: active ? "#7fe3b4" : "#b9b9c4",
        }}
      >
        {resolvedLabel}
      </span>
      <span style={VALUE}>{message}</span>
      {reason && <span style={REASON}>{reason}</span>}
    </div>
  );
}
