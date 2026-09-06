import { useMemo } from "react";
import type { ProviderId } from "../store.ts";
import type { ProviderMetadata } from "@motion-forge/pose";

type ProviderInfo =
  | ProviderMetadata
  | { id: ProviderId; label: string; available: boolean };

interface ProviderSelectorProps {
  value: ProviderId;
  onSelect: (id: ProviderId) => void;
  providers?: readonly ProviderMetadata[];
  activeProvider?: ProviderId;
  activeProviderId?: ProviderId;
}

const FIELD: React.CSSProperties = {
  border: "none",
  padding: 0,
  margin: 0,
};

const LEGEND: React.CSSProperties = {
  padding: "0 4px",
  fontSize: 12,
  color: "#b9b9c4",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const GROUP: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: "6px 4px",
};

const LABEL: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 8px",
  borderRadius: 6,
  background: "#26262b",
  cursor: "pointer",
};

const RADIO: React.CSSProperties = {
  width: 14,
  height: 14,
  accentColor: "#7fe3b4",
};

const CAPTION: React.CSSProperties = {
  fontSize: 13,
  color: "#e7e7e7",
};

const UNAVAILABLE: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 11,
  color: "#f0888a",
};

const ACTIVE_INDICATOR: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 10,
  color: "#7fe3b4",
  fontWeight: 600,
};

const OPTIONS: { id: ProviderId; label: string; available: boolean }[] = [
  { id: "auto", label: "Auto", available: true },
  { id: "mediapipe", label: "MediaPipe", available: true },
  { id: "rtmpose", label: "RTMPose", available: false },
  { id: "nvidia", label: "NVIDIA RTX", available: false },
  { id: "custom", label: "Modelo personalizado", available: false },
];

export function ProviderSelector({
  value,
  onSelect,
  providers,
  activeProvider,
  activeProviderId,
}: ProviderSelectorProps) {
  const effectiveProviders = useMemo<ReadonlyArray<ProviderInfo>>(
    () =>
      providers
        ? providers.map((provider) => provider) as ReadonlyArray<ProviderInfo>
        : OPTIONS.map((option) => ({
            id: option.id,
            label: option.label,
            available: option.available,
          })),
    [providers],
  );

  const resolvedActiveId:
    | "auto"
    | "mediapipe"
    | "rtmpose"
    | "nvidia"
    | "custom"
    | "unknown" = useMemo<ProviderId>(
    () => activeProviderId ?? activeProvider ?? "auto",
    [activeProviderId, activeProvider],
  );

  return (
    <fieldset style={FIELD}>
      <legend style={LEGEND}>Motor de captura</legend>
      <div style={GROUP}>
        {OPTIONS.map((option) => {
          const isChecked = value === option.id;
          const isActive = activeProvider === option.id;
          const effective = effectiveProviders.find((p) => p.id === option.id);
          const effectiveAvailable =
            effective === undefined
              ? option.available
              : effective.available;
          const resolvedId:
            | "auto"
            | "mediapipe"
            | "rtmpose"
            | "nvidia"
            | "custom"
            | "unknown" = resolvedActiveId ?? activeProvider ?? value;
                  const isCurrentlyActive =
            value === "auto"
              ? resolvedActiveId === option.id
              : value === option.id;
          const disabled =
            !effectiveAvailable && option.id !== value;

          return (
            <label key={option.id} style={LABEL}>
              <input
                type="radio"
                name="provider"
                value={option.id}
                checked={isChecked}
                disabled={disabled}
                onChange={() => onSelect(option.id)}
                style={RADIO}
              />
              <span style={CAPTION}>{option.label}</span>
              {!effectiveAvailable && (
                <span style={UNAVAILABLE}>não disponível</span>
              )}
              {isCurrentlyActive && <span style={ACTIVE_INDICATOR}>ativo</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
