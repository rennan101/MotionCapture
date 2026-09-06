import "./App.css";
import { useAppStore } from "./store.ts";
import { Viewport } from "./components/Viewport.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { ProviderSelector } from "./components/ProviderSelector.tsx";
import { ProviderStatus } from "./components/ProviderStatus.tsx";
import { Panel } from "./components/Panel.tsx";
import {
  createPoseProviderRegistry,
  startCapture,
  stopCapture,
  resolveActiveProvider,
} from "./pose/provider-wiring.ts";
import { useMemo } from "react";
import type { ProviderId } from "./store.ts";

export default function App() {
  const {
    providerId,
    activeProviderId,
    captureState,
    cameraReady,
    characterLoaded,
    setProviderId,
    setActiveProviderId,
    setCaptureState,
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

  const handleStartCapture = async () => {
    setCaptureState("requesting-camera");
    const session = {
      providerId: activeProvider,
      source: null,
      running: false,
    };
    const result = await startCapture(session, registry, {
      type: "webcam",
      deviceId: undefined,
    });
    setActiveProviderId(result.session.providerId);
    setCaptureState(result.session.running ? "capturing" : "idle");
  };

  const handleStopCapture = async () => {
    const session = {
      providerId: activeProviderId,
      source: null,
      running: true,
    };
    await stopCapture(session);
    setCaptureState("idle");
  };

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
        />
      </header>
      <main style={MAIN}>
        <div style={WORKSPACE}>
          <Viewport />
          <aside style={PANEL_COL}>
            <Panel
              title="Captura"
              actions={
                <ProviderSelector
                  value={providerId}
                  onSelect={handleProviderChange}
                  providers={registry.getAvailable()}
                  activeProvider={effectiveActiveProviderId}
                />
              }
            >
              <ProviderStatus
                providerId={effectiveActiveProviderId}
                registry={registry}
                active={isCaptureRunning && cameraReady}
                message={cameraReady ? "câmera pronta" : "pendente"}
                requestedProviderId={providerId}
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
