import { store, setProviderId, setActiveProviderId, setCaptureState, setCameraReady, setCurrentPose, setPoseError, setSelectedDeviceId, setRecordState, setPendingClip, addClip, removeClip, renameClip, setPlaybackState } from "./store.js";
import { createPoseProviderRegistry, resolveActiveProvider, listVideoInputDevices, openCamera, closeCamera } from "./pose/provider-wiring.js";
import { PosePipeline } from "./pose/pose-pipeline.js";
import { ClipRecorder } from "@motion-forge/pose";
import { ClipPlayback } from "./pose/clip-playback.js";
import { clipIdOf } from "./store.js";
import { exportClipToGlb } from "./export/glb-export.js";

import { renderHeader } from "./components/status-bar.js";
import { renderProviderSelector } from "./components/provider-selector.js";
import { renderProviderStatus } from "./components/provider-status.js";
import { renderCameraSelector } from "./components/camera-selector.js";
import { renderRecordControls } from "./components/record-controls.js";
import { renderCharacterPanel } from "./components/character-panel.js";
import { renderClipPanel } from "./components/clip-panel.js";
import { createViewport } from "./components/viewport.js";

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

export function createApp(root) {
  // --- Registry ---
  const registry = createPoseProviderRegistry();
  let resolvedActiveId = resolveActiveProvider(registry, store.getState().providerId);

  // --- Refs ---
  const pipelineRef = { current: null };
  const recorderRef = { current: null };
  const playbackRef = { current: null };
  const restRef = { current: null };
  const viewportStreamRef = { current: null };

  // --- Export state ---
  let exportingClipId = null;
  let exportedDoneId = null;
  let exportedFileName = null;
  let exportedBytes = null;

  // --- Main layout ---
  root.innerHTML = "";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.height = "100vh";

  const header = document.createElement("header");
  header.className = "mf-header";
  root.appendChild(header);

  const main = document.createElement("main");
  main.className = "mf-main";
  root.appendChild(main);

  // Header: title + status bar
  const title = document.createElement("h1");
  title.className = "mf-title";
  title.textContent = "Motion Forge";
  header.appendChild(title);

  const statusBarContainer = document.createElement("div");
  statusBarContainer.className = "mf-status-bar";
  header.appendChild(statusBarContainer);

  // Main: error banner + workspace
  const errorBanner = document.createElement("div");
  errorBanner.className = "mf-error-banner";
  errorBanner.style.display = "none";
  const errorText = document.createElement("span");
  errorText.className = "mf-error-text";
  const errorDismiss = document.createElement("button");
  errorDismiss.type = "button";
  errorDismiss.className = "mf-error-dismiss";
  errorDismiss.textContent = "✕";
  errorDismiss.setAttribute("aria-label", "Fechar erro");
  errorBanner.appendChild(errorText);
  errorBanner.appendChild(errorDismiss);
  main.appendChild(errorBanner);

  const workspace = document.createElement("div");
  workspace.className = "mf-workspace";
  main.appendChild(workspace);

  const panelCol = document.createElement("aside");
  panelCol.className = "mf-panel-col";
  workspace.appendChild(panelCol);

  // Viewport (left)
  const viewportContainer = document.createElement("div");
  viewportContainer.className = "mf-viewport-col";
  workspace.appendChild(viewportContainer);

  const viewport = createViewport({
    mount: viewportContainer,
    onVideoReady: (video) => {
      if (pipelineRef.current) {
        pipelineRef.current.start(video, resolvedActiveId);
      }
    },
    onRetargetReady: (rest) => {
      restRef.current = rest;
    },
  });

  // ---- Panels (right column) ----
  function renderPanels() {
    // Remove existing panels
    while (panelCol.firstChild) {
      panelCol.removeChild(panelCol.firstChild);
    }

    const state = store.getState();

    // Captura panel
    const capturePanel = document.createElement("section");
    capturePanel.className = "mf-panel";
    const captureHeader = document.createElement("div");
    captureHeader.className = "mf-panel-header";
    const captureTitle = document.createElement("h2");
    captureTitle.className = "mf-panel-title";
    captureTitle.textContent = "Captura";
    captureHeader.appendChild(captureTitle);
    const captureActions = document.createElement("div");
    captureActions.className = "mf-panel-actions";
    captureActions.appendChild(renderProviderSelector({
      value: state.providerId,
      onSelect: (id) => {
        setProviderId(id);
        const resolved = resolveActiveProvider(registry, id);
        setActiveProviderId(resolved);
        resolvedActiveId = resolved;
      },
      providers: registry.getAvailable(),
      activeProvider: resolvedActiveProviderId(),
    }));
    captureHeader.appendChild(captureActions);
    capturePanel.appendChild(captureHeader);

    const captureBody = document.createElement("div");
    captureBody.className = "mf-panel-body";
    captureBody.appendChild(renderProviderStatus({
      providerId: resolvedActiveProviderId(),
      registry,
      active: state.captureState === "capturing" && state.cameraReady,
      message: stateCaptureMessage(state),
      requestedProviderId: state.providerId,
      captureState: state.captureState,
    }));
    captureBody.appendChild(renderCameraSelector({
      captureState: state.captureState,
      onStartCapture: handleStartCapture,
      onStopCapture: handleStopCapture,
      onDeviceChange: (deviceId) => {
        setSelectedDeviceId(deviceId);
      },
    }));
    captureBody.appendChild(renderRecordControls({
      recordState: state.recordState,
      canRecord: state.captureState === "capturing",
      onStartRecording: handleStartRecording,
      onStopRecording: handleStopRecording,
      onPauseRecording: handlePauseRecording,
      onResumeRecording: handleResumeRecording,
      pendingClip: state.pendingClip,
      onSavePendingClip: handleSavePendingClip,
      onDiscardPendingClip: handleDiscardPendingClip,
    }));
    capturePanel.appendChild(captureBody);
    panelCol.appendChild(capturePanel);

    // Personagem panel
    const charPanel = document.createElement("section");
    charPanel.className = "mf-panel";
    const charHeader = document.createElement("div");
    charHeader.className = "mf-panel-header";
    const charTitle = document.createElement("h2");
    charTitle.className = "mf-panel-title";
    charTitle.textContent = "Personagem";
    charHeader.appendChild(charTitle);
    const charActions = document.createElement("div");
    charActions.className = "mf-panel-actions";
    const charBadge = document.createElement("span");
    charBadge.className = "mf-char-badge";
    charBadge.textContent = (state.defaultCharacter || "eric").toUpperCase();
    charActions.appendChild(charBadge);
    charHeader.appendChild(charActions);
    charPanel.appendChild(charHeader);

    const charBody = document.createElement("div");
    charBody.className = "mf-panel-body";
    charBody.appendChild(renderCharacterPanel({
      defaultCharacter: state.defaultCharacter,
      setDefaultCharacter,
      setCustomCharacterUrl,
      setCharacterLoaded,
    }));
    charPanel.appendChild(charBody);
    panelCol.appendChild(charPanel);

    // Clipes panel
    const clipsPanel = document.createElement("section");
    clipsPanel.className = "mf-panel";
    const clipsHeader = document.createElement("div");
    clipsHeader.className = "mf-panel-header";
    const clipsTitle = document.createElement("h2");
    clipsTitle.className = "mf-panel-title";
    clipsTitle.textContent = "Clipes";
    clipsHeader.appendChild(clipsTitle);
    const clipsActions = document.createElement("div");
    clipsActions.className = "mf-panel-actions";
    const clipsBadge = document.createElement("span");
    clipsBadge.className = "mf-clips-badge";
    clipsBadge.textContent = String(state.clips.length);
    clipsActions.appendChild(clipsBadge);
    clipsHeader.appendChild(clipsActions);
    clipsPanel.appendChild(clipsHeader);

    const clipsBody = document.createElement("div");
    clipsBody.className = "mf-panel-body";
    clipsBody.appendChild(renderClipPanel({
      clips: state.clips,
      playbackState: state.playbackState,
      playbackClipId: state.playbackClipId,
      currentPoseActive: state.currentPose !== null,
      onPlay: handlePlayClip,
      onPause: handlePausePlayback,
      onStop: handleStopPlayback,
      onRename,
      onRemove,
      onExport: handleExportClip,
      onExportDone: clearExportDone,
      exportingClipId,
      exportedDoneId,
      exportedFileName,
      exportedBytes,
    }));
    clipsPanel.appendChild(clipsBody);
    panelCol.appendChild(clipsPanel);
  }

  function stateCaptureMessage(state) {
    if (state.captureState === "camera-ready") return "câmera pronta";
    if (state.captureState === "requestingcamera") return "solicitando câmera…";
    if (state.captureState === "capturing") return "capturando pose (MediaPipe)";
    return "pendente";
  }

  function resolvedActiveProviderId() {
    return resolveActiveProvider(registry, store.getState().providerId);
  }

  // ---- Capture lifecycle ----
  async function handleStartCapture() {
    const state = store.getState();
    if (!state.selectedDeviceId) return;
    await openCaptureStream();
  }

  async function handleStopCapture() {
    await closeCaptureStream();
  }

  async function openCaptureStream() {
    const state = store.getState();
    if (!state.selectedDeviceId) return;
    setCaptureState("requestingcamera");
    setCameraReady(false);
    const result = await openCamera(state.selectedDeviceId);
    if (!result.stream) {
      setCaptureState("error");
      return;
    }
    viewportStreamRef.current = result.stream;
    setViewportStream(result.stream);
    setCaptureState("capturing");
    setCameraReady(true);
  }

  async function closeCaptureStream() {
    if (pipelineRef.current) {
      pipelineRef.current.stop();
    }
    if (recorderRef.current) {
      finishRecording();
    }
    if (viewportStreamRef.current) {
      closeCamera(viewportStreamRef.current);
    }
    viewportStreamRef.current = null;
    setViewportStream(null);
    setCaptureState("idle");
    setCameraReady(false);
    setCurrentPose(null);
  }

  function setViewportStream(stream) {
    viewport.setStream(stream);
  }

  // ---- Recording ----
  function handleStartRecording() {
    const state = store.getState();
    if (state.captureState !== "capturing") return;
    const pending = store.getState().pendingClip;
    if (pending) {
      addClip(pending);
      setPendingClip(null);
    }
    const rec = new ClipRecorder();
    rec.start(store.getState().providerId, resolvedActiveProviderId());
    recorderRef.current = rec;
    setRecordState("recording");
  }

  function finishRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    const clip = rec.stop();
    recorderRef.current = null;
    setRecordState("idle");
    if (clip) setPendingClip(clip);
  }

  function handleStopRecording() {
    finishRecording();
  }

  function handlePauseRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.pause();
    setRecordState("paused");
  }

  function handleResumeRecording() {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.resume();
    setRecordState("recording");
  }

  function handleSavePendingClip() {
    const pending = store.getState().pendingClip;
    if (pending) addClip(pending);
    setPendingClip(null);
  }

  function handleDiscardPendingClip() {
    setPendingClip(null);
  }

  // ---- Playback ----
  function handlePlayClip(clipId) {
    const state = store.getState();
    const clip = state.clips.find((c) => clipIdOf(c) === clipId);
    if (!clip || !playbackRef.current) return;
    if (recorderRef.current) return;
    if (state.captureState === "capturing") return;
    setPlaybackState("playing", clipId);
    playbackRef.current.play(clip, resolvedActiveProviderId());
  }

  function handlePausePlayback() {
    const pb = playbackRef.current;
    if (!pb) return;
    if (pb.isPaused) {
      pb.resume();
      setPlaybackState("playing");
    } else {
      pb.pause();
      setPlaybackState("paused");
    }
  }

  function handleStopPlayback() {
    playbackRef.current?.stop();
    setPlaybackState("stopped", null);
    setCurrentPose(null);
  }

  // ---- Clip management ----
  function handleRename(clipId, name) {
    renameClip(clipId, name);
  }

  function handleRemove(clipId) {
    removeClip(clipId);
  }

  // ---- Export ----
  async function handleExportClip(clipId) {
    const state = store.getState();
    const clip = state.clips.find((c) => clipIdOf(c) === clipId);
    if (!clip || exportingClipId) return;
    exportingClipId = clipId;
    exportedDoneId = null;
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
      exportedDoneId = clipId;
      exportedFileName = fileName;
      exportedBytes = diagnostics.bytes;
    } catch (err) {
      console.error("Falha ao exportar GLB:", err);
      setPoseError(`Falha ao exportar GLB: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      exportingClipId = null;
    }
    renderPanels();
  }

  function clearExportDone() {
    exportedDoneId = null;
    exportedFileName = null;
    exportedBytes = null;
    renderPanels();
  }

  // ---- Error banner ----
  function updateErrorBanner() {
    const state = store.getState();
    if (state.poseError) {
      errorText.textContent = "⚠ " + state.poseError;
      errorBanner.style.display = "flex";
    } else {
      errorBanner.style.display = "none";
    }
  }

  errorDismiss.addEventListener("click", () => {
    setPoseError(null);
  });

  // ---- Pipeline init ----
  function initPipeline() {
    const pipeline = new PosePipeline(
      (pose, fps, latencyMs) => {
        setCurrentPose(pose, fps, latencyMs);
        if (pose && recorderRef.current?.isRecording) {
          recorderRef.current.addPose(pose.canonical);
        }
      },
      (err) => {
        setPoseError(err);
      },
    );
    pipelineRef.current = pipeline;
    return () => {
      pipeline.stop();
      pipelineRef.current = null;
    };
  }

  let teardownPipeline = initPipeline();

  // ---- Playback init ----
  function initPlayback() {
    const pb = new ClipPlayback((result) => {
      setCurrentPose(result, 0, 0);
    });
    playbackRef.current = pb;
    return () => {
      pb.stop();
      playbackRef.current = null;
    };
  }

  let teardownPlayback = initPlayback();

  // ---- Camera cleanup on unmount ----
  function teardownCamera() {
    if (viewportStreamRef.current) {
      closeCamera(viewportStreamRef.current);
    }
  }

  // ---- Subscribe to state changes ----
  const unsubscribeAll = [
    store.subscribe(() => {
      updateErrorBanner();
      renderPanels();
    }),
  ];

  // Initial render
  renderPanels();
  updateErrorBanner();

  // ---- Lifecycle ----
  return {
    destroy() {
      teardownPipeline();
      teardownPipeline = null;
      teardownPlayback();
      teardownPlayback = null;
      teardownCamera();
      for (const unsub of unsubscribeAll) {
        unsub();
      }
    },
  };
}
