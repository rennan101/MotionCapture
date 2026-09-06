import { useState, useEffect } from "react";
import {
  listVideoInputDevices,
  openCamera,
  closeCamera,
} from "../pose/provider-wiring.ts";
import type { CaptureState } from "../store.ts";

export type CameraSession = {
  stream: MediaStream | null;
  deviceId: string | null;
};

export function CameraSelector({
  captureState = "idle",
  onStartCapture = () => {
    /* noop */
  },
  onStopCapture = () => {
    /* noop */
  },
  onDeviceChange,
}: {
  captureState?: CaptureState;
  onStartCapture?: () => void;
  onStopCapture?: () => void;
  onDeviceChange?: (deviceId: string | null) => void;
} = {}) {
  const [devices, setDevices] = useState<Array<{ label: string; deviceId: string }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listVideoInputDevices()
      .then((list) => {
        if (!cancelled) {
          setDevices(list);
          if (list.length > 0 && !selectedDeviceId) {
            const first = list[0].deviceId;
            setSelectedDeviceId(first);
            onDeviceChange?.(first);
          }
        }
      })
      .catch(() => {
        /* keep selector usable even when enumeration fails */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isRequesting =
    captureState === "requesting-camera";
  const isCapturing =
    captureState === "capturing";
  const isIdle =
    captureState === "idle";
  const ok =
    captureState === "camera-ready";

  return (
    <div style={SECTION}>
      <span style={LABEL}>Câmera</span>

      <div style={ROW}>
        <select
          style={DROPDOWN}
          value={selectedDeviceId ?? ""}
          onChange={(event) => {
            const candidate =
              devices.find(
                (device) => device.deviceId === event.target.value,
              );
            if (candidate) {
              const next = candidate.deviceId;
              setSelectedDeviceId(next);
              onDeviceChange?.(next);
            }
          }}
          disabled={isRequesting || isCapturing}
        >
          <option value="">Selecionar câmera…</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>

        {isIdle && (
          <button
            type="button"
            style={BUTTON}
            onClick={onStartCapture}
          >
            Abrir câmera
          </button>
        )}

        {isRequesting && (
          <span style={STATUS}>solicitando câmera…</span>
        )}

        {isCapturing && (
          <button
            type="button"
            style={BUTTON}
            onClick={onStopCapture}
          >
            Parar câmera
          </button>
        )}

        {ok && (
          <span style={OK}>câmera ativa</span>
        )}
      </div>
    </div>
  );
}

const SECTION: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const LABEL: React.CSSProperties = {
  fontSize: 12,
  color: "#b9b9c4",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const DROPDOWN: React.CSSProperties = {
  flex: 1,
  appearance: "menulist",
  background: "#26262b",
  color: "#e7e7e7",
  border: "1px solid #444",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
  cursor: "pointer",
};

const BUTTON: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #444",
  background: "#26262b",
  color: "#e7e7e7",
  cursor: "pointer",
};

const STATUS: React.CSSProperties = {
  fontSize: 12,
  color: "#f0888a",
};

const OK: React.CSSProperties = {
  fontSize: 12,
  color: "#7fe3b4",
};
