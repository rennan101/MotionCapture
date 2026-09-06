import "./App.css";
import { useAppStore } from "./store.ts";
import { Viewport } from "./components/Viewport.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { ProviderSelector } from "./components/ProviderSelector.tsx";
import { ProviderStatus } from "./components/ProviderStatus.tsx";
import { Panel } from "./components/Panel.tsx";
import type { CaptureState, ProviderId } from "./store.ts";
import {
  createPoseProviderRegistry,
  startCapture,
  stopCapture,
  resolveActiveProvider,
} from "./pose/provider-wiring.ts";
import { CameraSelector } from "./components/CameraSelector.tsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { openCamera, closeCamera } from "./pose/provider-wiring.ts";

export default function App() {
  const {
    providerId,
    activeProviderId,
    captureState,
    cameraReady,
    characterLoaded,
    selectedDeviceId,
    setProviderId,
    setActiveProviderId,
    setCaptureState,
    setCameraReady,
    setSelectedDeviceId,
  } = useAppStore();

  const layout: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  };

  const registry = createPoseProviderRegistry();
  const resolvedActiveId = resolveActiveProvider(registry, providerId);
  const activeProvider = resolvedActiveId;

  const effectiveActiveProviderId = useMemo<ProviderId>(
    () => resolvedActiveId,
    [resolvedActiveId],
  );



  const handleProviderChange = (id: typeof providerId) => {
    setProviderId(id);
    const resolved = resolveActiveProvider(registry, id);
    setActiveProviderId(resolved);
  };

  const [viewportStream, setViewportStream] = useState<MediaStream | null>(null);

  const openCaptureStream = useCallback(async () => {
    if (!selectedDeviceId) {
      return;
    }

    setCaptureState("requesting-camera");
    setCameraReady(false);

    const stream = await openCamera(selectedDeviceId);

    if (!stream) {
      setCaptureState("error");
      return;
    }

    setViewportStream(stream);
    setCaptureState("capturing");
    setCameraReady(true);
  }, [selectedDeviceId]);

  const closeCaptureStream = useCallback(async () => {
    if (viewportStream) {
      closeCamera(viewportStream);
    }

    setViewportStream(null);
    setCaptureState("idle");
    setCameraReady(false);
  }, [viewportStream]);

  const handleStartCapture = useCallback(async () => {
    await openCaptureStream();
  }, [openCaptureStream]);

  const handleStopCapture = useCallback(async () => {
    await closeCaptureStream();
  }, [closeCaptureStream]);

  useEffect(() => {
    return () => {
      if (viewportStream) {
        closeCamera(viewportStream);
      }
    };
  }, []);

  const isCaptureRunning =
    captureState === "capturing";

  return (
    <div style={layout}>
      <header style={HEADER}>
        <h1>Motion Forge</h1>
        <StatusBar
          providerId={providerId}
          registry={registry}
          isCaptureRunning={isCaptureRunning}
          cameraReady={cameraReady}
          characterLoaded={characterLoaded}
          captureState={captureState}
        />
      </header>
      <main style={MAIN}>
        <div style={WORKSPACE}>
          <Viewport stream={isCaptureRunning ? viewportStream : null} />
          <aside style={PANEL_COL}>
            <Panel
              title="Captura"
              actions={
                <>
                  <ProviderSelector
                    value={providerId}
                    onSelect={handleProviderChange}
                    providers={registry.getAvailable()}
                    activeProvider={effectiveActiveProviderId}
                  />
                </>
              }
            >
              <ProviderStatus
                providerId={effectiveActiveProviderId}
                registry={registry}
                active={isCaptureRunning && cameraReady}
                message={captureState === "camera-ready" ? "câmera pronta" : captureState === "requesting-camera" ? "solicitando câmera…" : "pendente"}
                requestedProviderId={providerId}
                captureState={captureState}
              />
              <CameraSelector
                captureState={captureState}
                onStartCapture={handleStartCapture}
                onStopCapture={handleStopCapture}
                onDeviceChange={(deviceId) => useAppStore.setState({ selectedDeviceId: deviceId })}
              />
            </Panel>
            <Panel
              title="Personagem"
              actions={
                <button
                  type="button"
                  style={BUTTON}
                  onClick={() => alert("carregar personagem")}
                >
                  Importar FBX
                </button>
              }
            >
              <div style={CHIP}>
                {characterLoaded ? "Personagem carregado" : "Sem personagem"}
              </div>
            </Panel>
          </aside>
        </div>
      </main>
    </div>
  );
}

const HEADER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  padding: "12px 16px",
  borderBottom: "1px solid #333",
  flexShrink: 0,
};

const MAIN: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "16px",
  minHeight: "calc(100vh - 56px)",
};

const WORKSPACE: React.CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1fr 320px",
  gap: 16,
  padding: "0 4px",
};

const PANEL_COL: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  overflowY: "auto",
  minHeight: 0,
};

const BUTTON: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #444",
  background: "#26262b",
  color: "#e7e7e7",
  cursor: "pointer",
};

const CHIP: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  background: "#26262b",
  color: "#ccc",
};
