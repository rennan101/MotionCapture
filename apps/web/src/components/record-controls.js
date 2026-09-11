
export function renderRecordControls({
  recordState,
  canRecord,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  pendingClip,
  onSavePendingClip,
  onDiscardPendingClip,
}) {
  const container = document.createElement("div");
  container.className = "mf-record-controls";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "8px";
  container.style.marginTop = "4px";

  const recording = recordState === "recording";
  const paused = recordState === "paused";

  const row = document.createElement("div");
  row.className = "mf-record-row";
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "8px";
  row.style.flexWrap = "wrap";

  if (!recording && !paused) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mf-record-btn mf-record-btn-primary";
    btn.disabled = !canRecord;
    btn.style.flex = "1";
    btn.style.minWidth = "90px";
    btn.style.padding = "7px 10px";
    btn.style.borderRadius = "8px";
    btn.style.border = "1px solid #3f3f46";
    btn.style.background = canRecord ? "#7f1d1d" : "#1c1d24";
    btn.style.borderColor = canRecord ? "#b91c1c" : "#3f3f46";
    btn.style.color = "#e4e4e7";
    btn.style.fontSize = "12px";
    btn.style.cursor = canRecord ? "pointer" : "not-allowed";
    btn.textContent = "● Gravar";
    btn.title = canRecord ? "Gravar um clipe da captura atual" : "Abra a câmera para gravar";
    btn.addEventListener("click", onStartRecording);
    row.appendChild(btn);
  }

  if (recording) {
    const badge = document.createElement("span");
    badge.className = "mf-rec-badge";
    badge.style.display = "inline-flex";
    badge.style.alignItems = "center";
    badge.style.gap = "6px";
    badge.style.fontSize = "11px";
    badge.style.fontWeight = "700";
    badge.style.letterSpacing = "1px";
    badge.style.color = "#f87171";
    badge.style.padding = "4px 8px";
    badge.style.borderRadius = "999px";
    badge.style.border = "1px solid rgba(185, 28, 28, 0.53)";
    badge.style.background = "#271417";
    const dot = document.createElement("span");
    dot.className = "mf-rec-dot";
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.borderRadius = "999px";
    dot.style.background = "#ef4444";
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode("REC"));
    row.appendChild(badge);

    const pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "mf-record-btn";
    pauseBtn.style.flex = "1";
    pauseBtn.style.minWidth = "90px";
    pauseBtn.style.padding = "7px 10px";
    pauseBtn.style.borderRadius = "8px";
    pauseBtn.style.border = "1px solid #3f3f46";
    pauseBtn.style.background = "#1c1d24";
    pauseBtn.style.color = "#e4e4e7";
    pauseBtn.style.fontSize = "12px";
    pauseBtn.style.cursor = "pointer";
    pauseBtn.textContent = "⏸ Pausar";
    pauseBtn.addEventListener("click", onPauseRecording);
    row.appendChild(pauseBtn);

    const stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "mf-record-btn mf-record-btn-stop";
    stopBtn.style.flex = "1";
    stopBtn.style.minWidth = "90px";
    stopBtn.style.padding = "7px 10px";
    stopBtn.style.borderRadius = "8px";
    stopBtn.style.border = "1px solid #3f3f46";
    stopBtn.style.background = "#26262c";
    stopBtn.style.color = "#e4e4e7";
    stopBtn.style.fontSize = "12px";
    stopBtn.style.cursor = "pointer";
    stopBtn.textContent = "⏹ Parar";
    stopBtn.addEventListener("click", onStopRecording);
    row.appendChild(stopBtn);
  }

  if (paused) {
    const badge = document.createElement("span");
    badge.className = "mf-rec-badge mf-rec-badge-paused";
    badge.style.display = "inline-flex";
    badge.style.alignItems = "center";
    badge.style.gap = "6px";
    badge.style.fontSize = "11px";
    badge.style.fontWeight = "700";
    badge.style.letterSpacing = "1px";
    badge.style.color = "#a1a1aa";
    badge.style.padding = "4px 8px";
    badge.style.borderRadius = "999px";
    badge.style.border = "1px solid rgba(82, 82, 91, 0.53)";
    badge.style.background = "#1c1d24";
    const dot = document.createElement("span");
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.borderRadius = "999px";
    dot.style.background = "#a1a1aa";
    badge.appendChild(dot);
    badge.appendChild(document.createTextNode("PAUSA"));
    row.appendChild(badge);

    const resumeBtn = document.createElement("button");
    resumeBtn.type = "button";
    resumeBtn.className = "mf-record-btn";
    resumeBtn.style.flex = "1";
    resumeBtn.style.minWidth = "90px";
    resumeBtn.style.padding = "7px 10px";
    resumeBtn.style.borderRadius = "8px";
    resumeBtn.style.border = "1px solid #3f3f46";
    resumeBtn.style.background = "#1c1d24";
    resumeBtn.style.color = "#e4e4e7";
    resumeBtn.style.fontSize = "12px";
    resumeBtn.style.cursor = "pointer";
    resumeBtn.textContent = "▶ Continuar";
    resumeBtn.addEventListener("click", onResumeRecording);
    row.appendChild(resumeBtn);

    const stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "mf-record-btn mf-record-btn-stop";
    stopBtn.style.flex = "1";
    stopBtn.style.minWidth = "90px";
    stopBtn.style.padding = "7px 10px";
    stopBtn.style.borderRadius = "8px";
    stopBtn.style.border = "1px solid #3f3f46";
    stopBtn.style.background = "#26262c";
    stopBtn.style.color = "#e4e4e7";
    stopBtn.style.fontSize = "12px";
    stopBtn.style.cursor = "pointer";
    stopBtn.textContent = "⏹ Parar";
    stopBtn.addEventListener("click", onStopRecording);
    row.appendChild(stopBtn);
  }

  container.appendChild(row);

  if (pendingClip) {
    const pending = document.createElement("div");
    pending.className = "mf-record-pending";
    pending.style.display = "flex";
    pending.style.flexDirection = "column";
    pending.style.gap = "8px";
    pending.style.padding = "10px";
    pending.style.borderRadius = "8px";
    pending.style.border = "1px solid #3f3f46";
    pending.style.background = "#141519";

    const pendingTitle = document.createElement("div");
    pendingTitle.className = "mf-record-pending-title";
    pendingTitle.style.fontSize = "12px";
    pendingTitle.style.color = "#d4d4d8";
    pendingTitle.textContent = `Clipe capturado — ${pendingClip.metadata.frameCount} frames, ${(pendingClip.metadata.durationMs / 1000).toFixed(1)}s`;
    pending.appendChild(pendingTitle);

    const pendingRow = document.createElement("div");
    pendingRow.style.display = "flex";
    pendingRow.style.gap = "8px";
    pendingRow.style.alignItems = "center";
    pendingRow.style.flexWrap = "wrap";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "mf-record-btn mf-record-btn-primary";
    saveBtn.style.flex = "1";
    saveBtn.style.minWidth = "90px";
    saveBtn.style.padding = "7px 10px";
    saveBtn.style.borderRadius = "8px";
    saveBtn.style.border = "1px solid #3f3f46";
    saveBtn.style.background = "#7f1d1d";
    saveBtn.style.borderColor = "#b91c1c";
    saveBtn.style.color = "#e4e4e7";
    saveBtn.style.fontSize = "12px";
    saveBtn.style.cursor = "pointer";
    saveBtn.textContent = "💾 Salvar clipe";
    saveBtn.addEventListener("click", onSavePendingClip);
    pendingRow.appendChild(saveBtn);

    const discardBtn = document.createElement("button");
    discardBtn.type = "button";
    discardBtn.className = "mf-record-btn";
    discardBtn.style.flex = "1";
    discardBtn.style.minWidth = "90px";
    discardBtn.style.padding = "7px 10px";
    discardBtn.style.borderRadius = "8px";
    discardBtn.style.border = "1px solid #3f3f46";
    discardBtn.style.background = "#1c1d24";
    discardBtn.style.color = "#e4e4e7";
    discardBtn.style.fontSize = "12px";
    discardBtn.style.cursor = "pointer";
    discardBtn.textContent = "Descartar";
    discardBtn.addEventListener("click", onDiscardPendingClip);
    pendingRow.appendChild(discardBtn);

    pending.appendChild(pendingRow);
    container.appendChild(pending);
  }

  return container;
}
