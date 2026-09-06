import "./App.css";
import { useAppStore } from "./store.ts";
import { Viewport } from "./components/Viewport.tsx";
import { StatusBar } from "./components/StatusBar.tsx";
import { ProviderSelector } from "./components/ProviderSelector.tsx";
import { ProviderStatus } from "./components/ProviderStatus.tsx";
import { Panel } from "./components/Panel.tsx";
import { CharacterPanel } from "./components/CharacterPanel.tsx";
import type { ProviderId } from "./store.ts";
import {
  createPoseProviderRegistry,
  resolveActiveProvider,
} from "./pose/provider-wiring.ts";
import { CameraSelector } from "./components/CameraSelector.tsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openCamera, closeCamera } from "./pose/provider-wiring.ts";
import { PosePipeline } from "./pose/pose-pipeline.ts";

export default function App() {
  const {
    providerId,
    activeProviderId,
    captureState,
    cameraReady,
    characterLoaded,
    selectedDeviceId,
    defaultCharacter,
    setProviderId,
    setActiveProviderId,
    setCaptureState,
    setCameraReady,
    setCurrentPose,
    setPoseError,
  } = useAppStore();

  const layout: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  };

  const registry = createPoseProviderRegistry();
  const resolvedActiveId = resolveActiveProvider(registry, providerId);

  const effectiveActiveProviderId = useMemo<ProviderId>(
    () => resolvedActiveId,
    [resolvedActiveId]
  );

  const handleProviderChange = (id: typeof providerId) => {
    setProviderId(id);
    const resolved = resolveActiveProvider(registry, id);
    setActiveProviderId(resolved);
  };

  const [viewportStream, setViewportStream] = useState<MediaStream | null>(null);
  const pipelineRef = useRef<PosePipeline | null>(null);

  // Inicializa a pipeline MediaPipe
  useEffect(() => {
    const pipeline = new PosePipeline(
      (pose, fps, latencyMs) => {
        setCurrentPose(pose, fps, latencyMs);
      },
      (err) => {
        setPoseError(err);
      }
    );
    pipelineRef.current = pipeline;

    return () => {
      pipeline.stop();
      pipelineRef.current = null;
    };
  }, [setCurrentPose, setPoseError]);

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
  }, [selectedDeviceId, setCaptureState, setCameraReady]);

  const closeCaptureStream = useCallback(async () => {
    if (pipelineRef.current) {
      pipelineRef.current.stop();
    }
    if (viewportStream) {
      closeCamera(viewportStream);
    }

    setViewportStream(null);
    setCaptureState("idle");
    setCameraReady(false);
    setCurrentPose(null);
  }, [viewportStream, setCaptureState, setCameraReady, setCurrentPose]);

  const handleStartCapture = useCallback(async () => {
    await openCaptureStream();
  }, [openCaptureStream]);

  const handleStopCapture = useCallback(async () => {
    await closeCaptureStream();
  }, [closeCaptureStream]);

  // Callback chamado pelo Viewport quando o elemento <video> estiver tocando o stream
  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    if (pipelineRef.current && captureState === "capturing") {
      pipelineRef.current.start(video);
    }
  }, [captureState]);

  useEffect(() => {
    return () => {
      if (viewportStream) {
        closeCamera(viewportStream);
      }
    };
  }, [viewportStream]);

  const isCaptureRunning = captureState === "capturing";

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
          <Viewport
            stream={isCaptureRunning ? viewportStream : null}
            onVideoReady={handleVideoReady}
          />
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
                message={
                  captureState === "camera-ready"
                    ? "câmera pronta"
                    : captureState === "requesting-camera"
                    ? "solicitando câmera…"
                    : isCaptureRunning
                    ? "capturando pose (MediaPipe)"
                    : "pendente"
                }
                requestedProviderId={providerId}
                captureState={captureState}
              />
              <CameraSelector
                captureState={captureState}
                onStartCapture={handleStartCapture}
                onStopCapture={handleStopCapture}
                onDeviceChange={(deviceId) =>
                  useAppStore.setState({ selectedDeviceId: deviceId })
                }
              />
            </Panel>
            <Panel
              title="Personagem"
              actions={
                <span style={{ fontSize: 11, color: "#818cf8" }}>
                  {defaultCharacter.toUpperCase()}
                </span>
              }
            >
              <CharacterPanel />
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
  borderBottom: "1px solid #27272a",
  background: "#12131a",
  flexShrink: 0,
};

const MAIN: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: "16px",
  minHeight: "calc(100vh - 56px)",
  background: "#09090b",
};

const WORKSPACE: React.CSSProperties = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1fr 340px",
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
