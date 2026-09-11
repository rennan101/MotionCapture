import { clipIdOf } from "../store.js";
export { PlaybackState } from "../store.js";
export function renderClipPanel({
  clips,
  playbackState,
  playbackClipId,
  currentPoseActive,
  onPlay,
  onPause,
  onStop,
  onRename,
  onRemove,
  onExport,
  onExportDone,
  exportingClipId,
  exportedDoneId,
  exportedFileName,
  exportedBytes,
}) {
  if (clips.length === 0) {
    const empty = document.createElement("div");
    empty.className = "mf-clip-empty";
    empty.style.fontSize = "12px";
    empty.style.color = "#71717a";
    empty.style.padding = "8px 2px";
    empty.textContent = "Nenhum clipe salvo ainda. Grave durante uma captura e salve o clipe para vê-lo aqui.";
    return empty;
  }

  const list = document.createElement("div");
  list.className = "mf-clip-list";
  list.style.display = "flex";
  list.style.flexDirection = "column";
  list.style.gap = "8px";
  list.style.marginTop = "4px";

  clips.forEach((clip) => {
    const id = clipIdOf(clip);
    const isCurrent = playbackClipId === id && playbackState !== "stopped";
    const playing = isCurrent && playbackState === "playing";
    const paused = isCurrent && playbackState === "paused";

    const item = document.createElement("div");
    item.className = "mf-clip-item";
    item.style.display = "flex";
    item.style.flexDirection = "column";
    item.style.gap = "6px";
    item.style.padding = "10px";
    item.style.borderRadius = "8px";
    item.style.border = "1px solid #27272a";
    item.style.background = "#141519";
    if (isCurrent) {
      item.style.borderColor = "#6366f1aa";
    }

    // Head
    const head = document.createElement("div");
    head.style.display = "flex";
    head.style.alignItems = "baseline";
    head.style.justifyContent = "space-between";
    head.style.gap = "8px";

    const nameSpan = document.createElement("span");
    nameSpan.className = "mf-clip-name";
    nameSpan.title = clip.metadata.name;
    nameSpan.style.fontSize = "12px";
    nameSpan.style.fontWeight = "600";
    nameSpan.style.color = "#e4e4e7";
    nameSpan.style.overflow = "hidden";
    nameSpan.style.textOverflow = "ellipsis";
    nameSpan.style.whiteSpace = "nowrap";
    nameSpan.textContent = clip.metadata.name;
    head.appendChild(nameSpan);

    const metaSpan = document.createElement("span");
    metaSpan.className = "mf-clip-meta";
    metaSpan.style.fontSize = "11px";
    metaSpan.style.color = "#71717a";
    metaSpan.style.flexShrink = "0";
    metaSpan.textContent = `${(clip.metadata.durationMs / 1000).toFixed(1)}s · ${clip.metadata.frameCount}f · ${clip.metadata.sampleRateHz.toFixed(1)}Hz`;
    head.appendChild(metaSpan);

    item.appendChild(head);

    // Source
    const source = document.createElement("div");
    source.className = "mf-clip-source";
    source.style.fontSize = "10px";
    source.style.color = "#818cf8";
    source.style.textTransform = "uppercase";
    source.style.letterSpacing = "0.5px";
    source.textContent = clip.metadata.source.engineName;
    item.appendChild(source);

    // Actions row
    const actionsRow = document.createElement("div");
    actionsRow.style.display = "flex";
    actionsRow.style.gap = "6px";

    if (playing) {
      const pauseBtn = document.createElement("button");
      pauseBtn.type = "button";
      pauseBtn.className = "mf-clip-btn";
      pauseBtn.style.padding = "5px 8px";
      pauseBtn.style.borderRadius = "6px";
      pauseBtn.style.border = "1px solid #3f3f46";
      pauseBtn.style.background = "#1c1d24";
      pauseBtn.style.color = "#e4e4e7";
      pauseBtn.style.fontSize = "11px";
      pauseBtn.style.cursor = "pointer";
      pauseBtn.textContent = "⏸ Pausar";
      pauseBtn.addEventListener("click", onPause);
      actionsRow.appendChild(pauseBtn);
    } else {
      const playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.className = "mf-clip-btn";
      if (paused) {
        playBtn.style.borderColor = "#6366f1aa";
      }
      playBtn.style.padding = "5px 8px";
      playBtn.style.borderRadius = "6px";
      playBtn.style.border = "1px solid #3f3f46";
      playBtn.style.background = "#1c1d24";
      playBtn.style.color = "#e4e4e7";
      playBtn.style.fontSize = "11px";
      playBtn.style.cursor = paused ? "wait" : "pointer";
      playBtn.textContent = "▶ Tocar";
      if (paused) {
        playBtn.disabled = true;
      }
      playBtn.addEventListener("click", () => onPlay(id));
      actionsRow.appendChild(playBtn);
    }

    if (isCurrent) {
      const stopBtn = document.createElement("button");
      stopBtn.type = "button";
      stopBtn.className = "mf-clip-btn";
      stopBtn.style.padding = "5px 8px";
      stopBtn.style.borderRadius = "6px";
      stopBtn.style.border = "1px solid #3f3f46";
      stopBtn.style.background = "#1c1d24";
      stopBtn.style.color = "#e4e4e7";
      stopBtn.style.fontSize = "11px";
      stopBtn.style.cursor = "pointer";
      stopBtn.textContent = "⏹";
      stopBtn.addEventListener("click", onStop);
      actionsRow.appendChild(stopBtn);
    }

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "mf-clip-btn";
    renameBtn.style.padding = "5px 8px";
    renameBtn.style.borderRadius = "6px";
    renameBtn.style.border = "1px solid #3f3f46";
    renameBtn.style.background = "#1c1d24";
    renameBtn.style.color = "#e4e4e7";
    renameBtn.style.fontSize = "11px";
    renameBtn.style.cursor = "pointer";
    renameBtn.title = "Renomear";
    renameBtn.textContent = "✏";
    renameBtn.addEventListener("click", () => {
      const name = window.prompt("Novo nome do clipe:", clip.metadata.name);
      if (name && name.trim()) onRename(id, name.trim());
    });
    actionsRow.appendChild(renameBtn);

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "mf-clip-btn";
    if (exportingClipId === id) {
      exportBtn.style.borderColor = "#6366f1aa";
    }
    exportBtn.style.padding = "5px 8px";
    exportBtn.style.borderRadius = "6px";
    exportBtn.style.border = "1px solid #3f3f46";
    exportBtn.style.background = "#1c1d24";
    exportBtn.style.color = "#e4e4e7";
    exportBtn.style.fontSize = "11px";
    exportBtn.style.cursor = exportingClipId !== null ? "wait" : "pointer";
    exportBtn.title = "Exportar GLB para Blender/Unity/Unreal";
    exportBtn.disabled = exportingClipId !== null;
    exportBtn.textContent = exportingClipId === id ? "…" : "⤓ GLB";
    exportBtn.addEventListener("click", () => onExport(id));
    actionsRow.appendChild(exportBtn);

    if (exportedDoneId === id && exportedFileName) {
      const doneBox = document.createElement("div");
      doneBox.className = "mf-clip-export-done";
      doneBox.style.display = "flex";
      doneBox.style.alignItems = "center";
      doneBox.style.gap = "5px";
      doneBox.style.marginTop = "4px";
      doneBox.style.padding = "3px 6px";
      doneBox.style.borderRadius = "5px";
      doneBox.style.background = "#1c241f";
      doneBox.style.border = "1px solid #2f3a2c";

      const mark = document.createElement("span");
      mark.className = "mf-clip-export-mark";
      mark.style.fontSize = "11px";
      mark.style.color = "#a8e6cf";
      mark.textContent = "⬇";
      doneBox.appendChild(mark);

      const text = document.createElement("span");
      text.className = "mf-clip-export-text";
      text.style.fontSize = "11px";
      text.style.color = "#cfd8d0";
      text.style.wordBreak = "break-all";
      text.textContent = `${exportedFileName} (${exportedBytes?.toLocaleString("pt-BR") ?? "0"} bytes)`;
      doneBox.appendChild(text);

      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "mf-clip-export-clear";
      clearBtn.style.display = "inline-flex";
      clearBtn.style.alignItems = "center";
      clearBtn.style.justifyContent = "center";
      clearBtn.style.width = "16px";
      clearBtn.style.height = "16px";
      clearBtn.style.padding = "0";
      clearBtn.style.borderRadius = "4px";
      clearBtn.style.border = "1px solid #333";
      clearBtn.style.background = "#1c1d24";
      clearBtn.style.color = "#71717a";
      clearBtn.style.cursor = "pointer";
      clearBtn.style.fontSize = "10px";
      clearBtn.style.lineHeight = "1";
      clearBtn.style.marginLeft = "4px";
      clearBtn.title = "Ocultar confirmação";
      clearBtn.textContent = "✕";
      clearBtn.addEventListener("click", () => {
        onExportDone?.(id, exportedFileName ?? "", exportedBytes ?? 0);
      });
      doneBox.appendChild(clearBtn);

      actionsRow.appendChild(doneBox);
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mf-clip-btn mf-clip-btn-danger";
    removeBtn.style.padding = "5px 8px";
    removeBtn.style.borderRadius = "6px";
    removeBtn.style.border = "1px solid #f0888a55";
    removeBtn.style.background = "#1c1d24";
    removeBtn.style.color = "#f0888a";
    removeBtn.style.fontSize = "11px";
    removeBtn.style.cursor = "pointer";
    removeBtn.title = "Excluir";
    removeBtn.textContent = "🗑";
    removeBtn.addEventListener("click", () => onRemove(id));
    actionsRow.appendChild(removeBtn);

    item.appendChild(actionsRow);
    list.appendChild(item);
  });

  if (playbackState !== "stopped") {
    const hint = document.createElement("div");
    hint.className = "mf-clip-hint";
    hint.style.fontSize = "11px";
    hint.style.color = "#71717a";
    hint.style.padding = "2px 2px 0";
    hint.textContent = "Reprodução ativa — o personagem mostra o clipe gravado.";
    list.appendChild(hint);
  }

  if (!currentPoseActive && playbackState === "stopped" && clips.length > 0) {
    const hint = document.createElement("div");
    hint.className = "mf-clip-hint";
    hint.style.fontSize = "11px";
    hint.style.color = "#71717a";
    hint.style.padding = "2px 2px 0";
    hint.textContent = "Selecione um clipe e toque para revisar a captura.";
    list.appendChild(hint);
  }

  return list;
}
