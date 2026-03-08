import type { SavedRun } from "../../types/run";
import { fmtPace, fmtChipTime } from "../../utils/runFormatting";

interface RunHistoryItemProps {
  run:      SavedRun;
  onClick:  (run: SavedRun) => void;
  onDelete: (id: string) => void;
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function RunHistoryItem({ run, onClick, onDelete }: RunHistoryItemProps) {
  return (
    <div
      onClick={() => onClick(run)}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12, cursor: "pointer", transition: "background 0.15s",
        marginBottom: 8,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
    >
      {/* Date */}
      <div style={{ minWidth: 70 }}>
        <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {fmtDate(run.date)}
        </div>
      </div>

      {/* Metrics */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, textAlign: "center" }}>
        <div>
          <div style={{ color: "#d4ff00", fontSize: 18, fontWeight: 900, fontFamily: "'Oswald', Inter, sans-serif", fontVariantNumeric: "tabular-nums" }}>
            {(run.distance / 1000).toFixed(2)}
          </div>
          <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase" }}>km</div>
        </div>
        <div>
          <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {fmtChipTime(run.elapsedTime)}
          </div>
          <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase" }}>time</div>
        </div>
        <div>
          <div style={{ color: "#94a3b8", fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {fmtPace(run.pace)}
          </div>
          <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase" }}>pace</div>
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onDelete(run.id); }}
        style={{
          background: "transparent", border: "none", color: "#334155",
          fontSize: 14, cursor: "pointer", padding: "4px 6px", borderRadius: 6,
          flexShrink: 0,
        }}
        aria-label="Delete run"
        onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
        onMouseLeave={e => (e.currentTarget.style.color = "#334155")}
      >
        ✕
      </button>
    </div>
  );
}
