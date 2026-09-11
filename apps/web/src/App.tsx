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
import { RecordControls } from "./components/RecordControls.tsx";
import { ClipPanel } from "./components/ClipPanel.tsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openCamera, closeCamera } from "./pose/provider-wiring.ts";
import { PosePipeline } from "./pose/pose-pipeline.ts";
import { ClipRecorder } from "@motion-forge/pose";
import { ClipPlayback } from "./pose/clip-playback.ts";
import { clipIdOf } from "./store.ts";
import type { RestPoseData } from "@motion-forge/retarget";
import { exportClipToGlb } from "./export/glb-export.ts";

export default function App() {
  const {
    providerId,
    activeProviderId,
    captureState,
    cameraReady,
    characterLoaded,
    currentPose,
    poseError,
    selectedDeviceId,
    defaultCharacter,
    recordState,
    pendingClip,
    clips,
    playbackState,
    playbackClipId,
    setProviderId,
    setActiveProviderId,
    setCaptureState,
    setCameraReady,
    setCurrentPose,
    setPoseError,
    setRecordState,
    setPendingClip,
    addClip,
    setPlaybackState,
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
  const recorderRef = useRef<ClipRecorder | null>(null);

  // --- Sprint 9: rest data for export (captured by Viewport at FBX load) ---
  const restRef = useRef<RestPoseData | null>(null);
  const [exportingClipId, setExportingClipId] = useState<string | null>(null);
  const [exportedDoneId, setExportedDoneId] = useState<string | null>(null);
  const [exportedFileName, setExportedFileName] = useState<string | null>(null);
  const [exportedBytes, setExportedBytes] = useState<number | null>(null);

  const clearExportDone = useCallback(() => {
    setExportedDoneId(null);
    setExportedFileName(null);
    setExportedBytes(null);
  }, []);

  const handleRetargetReady = useCallback((rest: RestPoseData) => {
    restRef.current = rest;
  }, []);

  const handleExportClip = useCallback(
    async (clipId: string) => {
      const state = useAppStore.getState();
      const clip = state.clips.find((c) => clipIdOf(c) === clipId);
      if (!clip || exportingClipId) return;
      setExportingClipId(clipId);
      setExportedDoneId(null);
      try {
        const { blob, fileName, diagnostics } = await exportClipToGlb(clip, {
          rest: restRef.current,
          fileStem: (clip.metadata.name || "motion-forge-clip").replace(/[^\w-]+/g, "_").slice(0, 60),
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        console.info(
          `GLB exportado: ${fileName} (${diagnostics.bytes} bytes, ${diagnostics.boneCount} ossos, ${diagnostics.frameCount} frames)`,
        );
        setExportedDoneId(clipId);
        setExportedFileName(fileName);
        setExportedBytes(diagnostics.bytes);
      } catch (err) {
        console.error("Falha ao exportar GLB:", err);
        setPoseError(`Falha ao exportar GLB: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setExportingClipId(null);
      }
    },
    [exportingClipId, setPoseError, setExportedDoneId, setExportedFileName, setExportedBytes],
  );

  // Inicializa a pipeline MediaPipe
  useEffect(() => {
    const pipeline = new PosePipeline(
      (pose, fps, latencyMs) => {
        setCurrentPose(pose, fps, latencyMs);
        // Sprint 8: todo pose aceito passa por aqui — grava se gravando.
        if (pose && recorderRef.current?.isRecording) {
          recorderRef.current.addPose(pose.canonical);
        }
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

  const handleStartRecording = useCallback(() => {
    if (captureState !== "capturing") return;
    // Um clipe pendente não escolhido é salvamento automaticamente ao
    // iniciar uma nova gravação (nunca descartar silenciosamente).
    const pending = useAppStore.getState().pendingClip;
    if (pending) {
      addClip(pending);
      setPendingClip(null);
    }
    const rec = new ClipRecorder();
    rec.start(providerId, effectiveActiveProviderId);
    recorderRef.current = rec;
    setRecordState("recording");
  }, [captureState, providerId, effectiveActiveProviderId, addClip, setPendingClip, setRecordState]);

  const finishRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    const clip = rec.stop();
    recorderRef.current = null;
    setRecordState("idle");
    if (clip) setPendingClip(clip);
  }, [setRecordState, setPendingClip]);

  const handleStopRecording = useCallback(() => {
    finishRecording();
  }, [finishRecording]);

  const handlePauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.pause();
    setRecordState("paused");
  }, [setRecordState]);

  const handleResumeRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.resume();
    setRecordState("recording");
  }, [setRecordState]);

  const handleSavePendingClip = useCallback(() => {
    const pending = useAppStore.getState().pendingClip;
    if (pending) addClip(pending);
    setPendingClip(null);
  }, [addClip, setPendingClip]);

  const handleDiscardPendingClip = useCallback(() => {
    setPendingClip(null);
  }, [setPendingClip]);

  const handleRenameClip = useCallback(
    (clipId: string, name: string) => {
      useAppStore.getState().renameClip(clipId, name);
    },
    [],
  );

  const handleRemoveClip = useCallback(
    (clipId: string) => {
      useAppStore.getState().removeClip(clipId);
    },
    [],
  );

  const openCaptureStream = useCallback(async () => {
    if (!selectedDeviceId) {
      return;
    }

    setCaptureState("requesting-camera");
    setCameraReady(false);

    const result = await openCamera(selectedDeviceId);

    if (!result.stream) {
      setCaptureState("error");
      return;
    }

    setViewportStream(result.stream);
    setCaptureState("capturing");
    setCameraReady(true);
  }, [selectedDeviceId, setCaptureState, setCameraReady]);

  const closeCaptureStream = useCallback(async () => {
    if (pipelineRef.current) {
      pipelineRef.current.stop();
    }
    // Gravação aberta ao parar a captura é finalizada e mantida como clipe
    // pendente (nunca descartada silenciosamente).
    if (recorderRef.current) {
      finishRecording();
    }
    if (viewportStream) {
      closeCamera(viewportStream);
    }

    setViewportStream(null);
    setCaptureState("idle");
    setCameraReady(false);
    setCurrentPose(null);
  }, [viewportStream, setCaptureState, setCameraReady, setCurrentPose, finishRecording]);

  const handleStartCapture = useCallback(async () => {
    await openCaptureStream();
  }, [openCaptureStream]);

  const handleStopCapture = useCallback(async () => {
    await closeCaptureStream();
  }, [closeCaptureStream]);

  // Callback chamado pelo Viewport quando o elemento <video> estiver tocando o stream
  const handleVideoReady = useCallback(
    (video: HTMLVideoElement) => {
      if (pipelineRef.current) {
        // O provider resolvido pelo registry decide qual backend o worker usa.
        pipelineRef.current.start(video, resolvedActiveId);
      }
    },
    [resolvedActiveId]
  );

  useEffect(() => {
    return () => {
      if (viewportStream) {
        closeCamera(viewportStream);
      }
    };
  }, [viewportStream]);

  const isCaptureRunning = captureState === "capturing";

  // --- Sprint 8: playback ---
  const playbackRef = useRef<ClipPlayback | null>(null);

  useEffect(() => {
    const pb = new ClipPlayback((result) => {
      setCurrentPose(result, 0, 0);
    });
    playbackRef.current = pb;
    return () => {
      pb.stop();
      playbackRef.current = null;
    };
  }, [setCurrentPose]);

  const handlePlayClip = useCallback(
    (clipId: string) => {
      const state = useAppStore.getState();
      const clip = state.clips.find((c) => clipIdOf(c) === clipId);
      if (!clip || !playbackRef.current) return;
      if (recorderRef.current) return; // não gravar e reproduzir ao mesmo tempo
      if (captureState === "capturing") return;
      state.setPlaybackState("playing", clipId);
      playbackRef.current.play(clip, effectiveActiveProviderId);
    },
    [captureState, effectiveActiveProviderId],
  );

  const handlePausePlayback = useCallback(() => {
    const pb = playbackRef.current;
    if (!pb) return;
    if (pb.isPaused) {
      pb.resume();
      setPlaybackState("playing");
    } else {
      pb.pause();
      setPlaybackState("paused");
    }
  }, [setPlaybackState]);

  const handleStopPlayback = useCallback(() => {
    playbackRef.current?.stop();
    setPlaybackState("stopped", null);
    setCurrentPose(null);
  }, [setPlaybackState, setCurrentPose]);

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
        {poseError && (
          <div style={ERROR_BANNER}>
            <span>⚠ {poseError}</span>
            <button
              type="button"
              style={ERROR_DISMISS}
              onClick={() => setPoseError(null)}
            >
              ✕
            </button>
          </div>
        )}
        <div style={WORKSPACE}>
          <Viewport
            stream={isCaptureRunning ? viewportStream : null}
            onVideoReady={handleVideoReady}
            onRetargetReady={handleRetargetReady}
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
              <RecordControls
                recordState={recordState}
                canRecord={isCaptureRunning}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onPauseRecording={handlePauseRecording}
                onResumeRecording={handleResumeRecording}
                pendingClip={pendingClip}
                onSavePendingClip={handleSavePendingClip}
                onDiscardPendingClip={handleDiscardPendingClip}
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
            <Panel
              title="Clipes"
              actions={
                <span style={{ fontSize: 11, color: "#818cf8" }}>
                  {clips.length}
                </span>
              }
            >
              <ClipPanel
                clips={clips}
                playbackState={playbackState}
                playbackClipId={playbackClipId}
                currentPoseActive={currentPose !== null}
                onPlay={handlePlayClip}
                onPause={handlePausePlayback}
                onStop={handleStopPlayback}
                onRename={handleRenameClip}
                onRemove={handleRemoveClip}
                onExport={handleExportClip}
                onExportDone={clearExportDone}
                exportingClipId={exportingClipId}
                exportedDoneId={exportedDoneId}
                exportedFileName={exportedFileName}
                exportedBytes={exportedBytes}
              />
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

const ERROR_BANNER: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 12px",
  marginBottom: 12,
  borderRadius: 8,
  background: "#3a2226",
  border: "1px solid #f0888a55",
  color: "#f0888a",
  fontSize: 13,
};

const ERROR_DISMISS: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#f0888a",
  cursor: "pointer",
  fontSize: 14,
  padding: "0 4px",
};
