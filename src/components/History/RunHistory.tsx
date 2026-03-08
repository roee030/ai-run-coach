import { motion } from "framer-motion";
import type { SavedRun } from "../../types/run";
import { useRunHistory } from "../../hooks/useRunHistory";
import { RunHistoryItem } from "./RunHistoryItem";

interface RunHistoryProps {
  onBack:    () => void;
  onViewRun: (run: SavedRun) => void;
}

export function RunHistory({ onBack, onViewRun }: RunHistoryProps) {
  const { runs, loading, deleteRun } = useRunHistory();

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
      style={{ background: "#050505", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <div style={{ color: "#d4ff00", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Your Runs</div>
          <div style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 900, fontFamily: "'Oswald', Inter, system-ui, sans-serif" }}>Run History</div>
        </div>
        {!loading && runs.length > 0 && (
          <div style={{ marginLeft: "auto", background: "rgba(212,255,0,0.1)", border: "1px solid rgba(212,255,0,0.2)", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: "#d4ff00", fontWeight: 700 }}>
            {runs.length} run{runs.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Stats bar (total distance) */}
      {!loading && runs.length > 0 && (() => {
        const totalKm  = runs.reduce((a, r) => a + r.distance, 0) / 1000;
        const totalMin = runs.reduce((a, r) => a + r.elapsedTime, 0) / 60;
        return (
          <div style={{ margin: "16px 20px 4px", display: "flex", gap: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { label: "Total Distance", value: `${totalKm.toFixed(1)} km` },
              { label: "Total Time",     value: `${Math.floor(totalMin / 60)}h ${Math.round(totalMin % 60)}m` },
              { label: "Runs Logged",    value: `${runs.length}` },
            ].map(({ label, value }) => (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ color: "#d4ff00", fontSize: 16, fontWeight: 900, fontFamily: "'Oswald', Inter, sans-serif" }}>{value}</div>
                <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#334155", fontSize: 12, marginTop: 40 }}>Loading…</div>
        ) : runs.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏃</div>
            <div style={{ color: "#475569", fontSize: 14 }}>No runs yet.</div>
            <div style={{ color: "#334155", fontSize: 12, marginTop: 4 }}>Complete your first run to see it here.</div>
          </div>
        ) : (
          <>
            <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
              Most recent first · tap to view full summary
            </div>
            {runs.map(run => (
              <RunHistoryItem key={run.id} run={run} onClick={onViewRun} onDelete={deleteRun} />
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}
