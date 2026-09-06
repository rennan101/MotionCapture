import { useAppStore } from "../store.ts";

export function StatusBar() {
  const { providerId, isCaptureRunning, cameraReady, characterLoaded } =
    useAppStore();

  return (
    <div style={STATUS_WRAPPER}>
      <span style={PILL}>Provider: {providerId}</span>
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
