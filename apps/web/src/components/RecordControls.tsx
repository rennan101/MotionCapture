import type { MotionClip } from "@motion-forge/pose";
import type { RecordState } from "../store.ts";

/**
 * Recording controls (Sprint 8): start/stop/pause/resume plus the
 * pending-clip decision (save to the list or discard) shown as soon as a
 * recording is stopped.
 */
export function RecordControls({
  recordState,
  canRecord,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  pendingClip,
  onSavePendingClip,
  onDiscardPendingClip,
}: {
  recordState: RecordState;
  canRecord: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  pendingClip: MotionClip | null;
  onSavePendingClip: () => void;
  onDiscardPendingClip: () => void;
}) {
  const recording = recordState === "recording";
  const paused = recordState === "paused";

  return (
    <div style={WRAPPER}>
      <div style={ROW}>
        {!recording && !paused && (
          <button
            type="button"
            style={{ ...BUTTON, ...PRIMARY }}
            disabled={!canRecord}
            onClick={onStartRecording}
            title={canRecord ? "Gravar um clipe da captura atual" : "Abra a câmera para gravar"}
          >
            ● Gravar
          </button>
        )}
        {recording && (
          <>
            <span style={REC_BADGE}>
              <span style={REC_DOT} /> REC
            </span>
            <button type="button" style={BUTTON} onClick={onPauseRecording}>
              ⏸ Pausar
            </button>
            <button
              type="button"
              style={{ ...BUTTON, ...STOP }}
              onClick={onStopRecording}
            >
              ⏹ Parar
            </button>
          </>
        )}
        {paused && (
          <>
            <span style={{ ...REC_BADGE, ...REC_BADGE_PAUSED }}>
              <span style={{ ...REC_DOT, background: "#a1a1aa" }} /> PAUSA
            </span>
            <button type="button" style={BUTTON} onClick={onResumeRecording}>
              ▶ Continuar
            </button>
            <button
              type="button"
              style={{ ...BUTTON, ...STOP }}
              onClick={onStopRecording}
            >
              ⏹ Parar
            </button>
          </>
        )}
      </div>

      {pendingClip && (
        <div style={PENDING}>
          <div style={PENDING_TITLE}>
            Clipe capturado — {pendingClip.metadata.frameCount} frames,{" "}
            {(pendingClip.metadata.durationMs / 1000).toFixed(1)}s
          </div>
          <div style={ROW}>
            <button
              type="button"
              style={{ ...BUTTON, ...PRIMARY }}
              onClick={onSavePendingClip}
            >
              💾 Salvar clipe
            </button>
            <button type="button" style={BUTTON} onClick={onDiscardPendingClip}>
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const WRAPPER: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  marginTop: 4,
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const BUTTON: React.CSSProperties = {
  flex: 1,
  minWidth: 90,
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid #3f3f46",
  background: "#1c1d24",
  color: "#e4e4e7",
  fontSize: 12,
  cursor: "pointer",
};

const PRIMARY: React.CSSProperties = {
  background: "#7f1d1d",
  borderColor: "#b91c1c",
};

const STOP: React.CSSProperties = {
  background: "#26262c",
};

const REC_BADGE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1,
  color: "#f87171",
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid #b91c1c88",
  background: "#271417",
};

const REC_BADGE_PAUSED: React.CSSProperties = {
  color: "#a1a1aa",
  borderColor: "#52525b88",
  background: "#1c1d24",
};

const REC_DOT: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "#ef4444",
};

const PENDING: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #3f3f46",
  background: "#141519",
};

const PENDING_TITLE: React.CSSProperties = {
  fontSize: 12,
  color: "#d4d4d8",
};
