import type { MotionClip } from "@motion-forge/pose";
import { clipIdOf, type PlaybackState } from "../store.ts";

/**
 * Saved clip list (Sprint 8): play/pause/stop per clip, rename, remove.
 * Playback drives the same pose path as live capture, so the character
 * animates exactly as during recording.
 *
 * Sprint 9: per-clip GLB export (download .glb) for Blender/Unity/Unreal.
 *
 * Export UX: after a successful export, the clip row shows an inline
 * confirmation with the exported file name and byte size, plus a dismiss
 * control. The confirmation is cleared when the user dismisses it or when
 * a new export starts.
 */
export function ClipPanel({
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
}: {
  clips: MotionClip[];
  playbackState: PlaybackState;
  playbackClipId: string | null;
  currentPoseActive: boolean;
  onPlay: (clipId: string) => void;
  onPause: () => void;
  onStop: () => void;
  onRename: (clipId: string, name: string) => void;
  onRemove: (clipId: string) => void;
  onExport: (clipId: string) => void;
  onExportDone?: (clipId: string, fileName: string, bytes: number) => void;
  exportingClipId: string | null;
  exportedDoneId: string | null;
  exportedFileName: string | null;
  exportedBytes: number | null;
}) {
  if (clips.length === 0) {
    return (
      <div style={EMPTY}>
        Nenhum clipe salvo ainda. Grave durante uma captura e salve o clipe
        para vê-lo aqui.
      </div>
    );
  }

  return (
    <div style={LIST}>
      {clips.map((clip) => {
        const id = clipIdOf(clip);
        const isCurrent = playbackClipId === id && playbackState !== "stopped";
        const playing = isCurrent && playbackState === "playing";
        const paused = isCurrent && playbackState === "paused";
        return (
          <div key={id} style={{ ...ITEM, ...(isCurrent ? ITEM_CURRENT : {}) }}>
            <div style={ITEM_HEAD}>
              <span style={ITEM_NAME} title={clip.metadata.name}>
                {clip.metadata.name}
              </span>
              <span style={ITEM_META}>
                {(clip.metadata.durationMs / 1000).toFixed(1)}s ·{" "}
                {clip.metadata.frameCount}f ·{" "}
                {clip.metadata.sampleRateHz.toFixed(1)}Hz
              </span>
            </div>
            <div style={ITEM_SOURCE}>
              {clip.metadata.source.engineName}
            </div>
            <div style={ROW}>
              {playing ? (
                <button type="button" style={BTN} onClick={onPause}>
                  ⏸ Pausar
                </button>
              ) : (
                <button
                  type="button"
                  style={{ ...BTN, ...(paused ? BTN_PRIMARY : {}) }}
                  disabled={paused}
                  onClick={() => onPlay(id)}
                >
                  ▶ Tocar
                </button>
              )}
              {isCurrent && (
                <button type="button" style={BTN} onClick={onStop}>
                  ⏹
                </button>
              )}
              <button
                type="button"
                style={BTN}
                title="Renomear"
                onClick={() => {
                  const name = window.prompt("Novo nome do clipe:", clip.metadata.name);
                  if (name && name.trim()) onRename(id, name.trim());
                }}
              >
                ✏
              </button>
              <button
                type="button"
                style={{ ...BTN, ...(exportingClipId === id ? BTN_PRIMARY : {}) }}
                title="Exportar GLB para Blender/Unity/Unreal"
                disabled={exportingClipId !== null}
                onClick={() => onExport(id)}
              >
                {exportingClipId === id ? "…" : "⤓ GLB"}
              </button>
              {exportedDoneId === id && exportedFileName && (
                <div style={EXPORT_DONE}>
                  <span style={EXPORT_MARK}>⬇</span>
                  <span style={EXPORT_TEXT}>
                    {exportedFileName} ({exportedBytes?.toLocaleString("pt-BR") ?? "0"} bytes)
                  </span>
                  <button
                    type="button"
                    style={EXPORT_CLEAR}
                    title="Ocultar confirmação"
                    onClick={() => onExportDone?.(id, exportedFileName ?? "", exportedBytes ?? 0)}
                  >
                    ✕
                  </button>
                </div>
              )}
              <button
                type="button"
                style={{ ...BTN, ...BTN_DANGER }}
                title="Excluir"
                onClick={() => onRemove(id)}
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}
      {playbackState !== "stopped" && (
        <div style={HINT}>
          Reprodução ativa — o personagem mostra o clipe gravado.
        </div>
      )}
      {!currentPoseActive && playbackState === "stopped" && clips.length > 0 && (
        <div style={HINT}>Selecione um clipe e toque para revisar a captura.</div>
      )}
    </div>
  );
}

const LIST: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 4,
};

const EMPTY: React.CSSProperties = {
  fontSize: 12,
  color: "#71717a",
  padding: "8px 2px",
};

const ITEM: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #27272a",
  background: "#141519",
};

const ITEM_CURRENT: React.CSSProperties = {
  borderColor: "#6366f1aa",
};

const ITEM_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: 8,
};

const ITEM_NAME: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#e4e4e7",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const ITEM_META: React.CSSProperties = {
  fontSize: 11,
  color: "#71717a",
  flexShrink: 0,
};

const ITEM_SOURCE: React.CSSProperties = {
  fontSize: 10,
  color: "#818cf8",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const ROW: React.CSSProperties = {
  display: "flex",
  gap: 6,
};

const BTN: React.CSSProperties = {
  padding: "5px 8px",
  borderRadius: 6,
  border: "1px solid #3f3f46",
  background: "#1c1d24",
  color: "#e4e4e7",
  fontSize: 11,
  cursor: "pointer",
};

const BTN_PRIMARY: React.CSSProperties = {
  borderColor: "#6366f1aa",
};

const BTN_DANGER: React.CSSProperties = {
  color: "#f0888a",
  borderColor: "#f0888a55",
};

const HINT: React.CSSProperties = {
  fontSize: 11,
  color: "#71717a",
  padding: "2px 2px 0",
};

const EXPORT_DONE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  marginTop: 4,
  padding: "3px 6px",
  borderRadius: 5,
  background: "#1c241f",
  border: "1px solid #2f3a2c",
};

const EXPORT_MARK: React.CSSProperties = {
  fontSize: 11,
  color: "#a8e6cf",
};

const EXPORT_TEXT: React.CSSProperties = {
  fontSize: 11,
  color: "#cfd8d0",
  wordBreak: "break-all",
};

const EXPORT_CLEAR: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 16,
  height: 16,
  padding: 0,
  borderRadius: 4,
  border: "1px solid #333",
  background: "#1c1d24",
  color: "#71717a",
  cursor: "pointer",
  fontSize: 10,
  lineHeight: 1,
  marginLeft: 4,
};
