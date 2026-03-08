import type { KmSplit, PhaseAnalysis } from "../../hooks/useRunAnalytics";
import { fmtPace, paceColorFor } from "../../utils/runFormatting";

interface SplitsAnalysisProps {
  splits:     KmSplit[];
  phases:     PhaseAnalysis;
  targetPace: number | null;
}

function SplitTable({ splits, phases, targetPace }: SplitsAnalysisProps) {
  if (splits.length === 0) return (
    <div style={{ color: "#334155", fontSize: 11, textAlign: "center", padding: "12px 0" }}>
      Not enough GPS data for splits.
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr>{["KM", "Pace", "Δ Target", "Phase"].map(h => (
            <th key={h} style={{ textAlign: "right", padding: "4px 6px", fontWeight: 600, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#334155" }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {splits.map(s => {
            const isDecay = phases.breakPointKm !== null && s.km >= phases.breakPointKm;
            const deltaS  = targetPace ? Math.round((s.paceMinPerKm - targetPace) * 60) : null;
            const color   = paceColorFor(s.paceMinPerKm, targetPace);
            return (
              <tr key={s.km} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "5px 6px", textAlign: "right", color: "#64748b" }}>{s.km}</td>
                <td style={{ padding: "5px 6px", textAlign: "right", color, fontWeight: 700 }}>{fmtPace(s.paceMinPerKm)}</td>
                <td style={{ padding: "5px 6px", textAlign: "right", color: deltaS == null ? "#334155" : deltaS <= 0 ? "#4ade80" : "#f87171" }}>
                  {deltaS == null ? "—" : `${deltaS >= 0 ? "+" : ""}${deltaS}s`}
                </td>
                <td style={{ padding: "5px 6px", textAlign: "right", color: isDecay ? "#f97316" : "#4ade80", fontSize: 9 }}>
                  {isDecay ? "DECAY" : "STABLE"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FiveKmSegments({ splits }: { splits: KmSplit[] }) {
  if (splits.length < 5) return null;
  const segs: { label: string; avg: number }[] = [];
  for (let i = 0; i < splits.length; i += 5) {
    const chunk = splits.slice(i, i + 5);
    segs.push({
      label: `KM ${chunk[0].km}–${chunk[chunk.length - 1].km}`,
      avg:   chunk.reduce((a, s) => a + s.paceMinPerKm, 0) / chunk.length,
    });
  }
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ color: "#334155", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>5 KM Segments</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {segs.map((seg, i) => (
          <div key={i} style={{ flex: "1 1 auto", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px", textAlign: "center", minWidth: 80 }}>
            <div style={{ color: "#475569", fontSize: 9, textTransform: "uppercase" }}>{seg.label}</div>
            <div style={{ color: paceColorFor(seg.avg, null), fontSize: 18, fontWeight: 900, marginTop: 2 }}>{fmtPace(seg.avg)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SplitsAnalysis({ splits, phases, targetPace }: SplitsAnalysisProps) {
  return (
    <>
      {/* Phase cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10, padding: "12px 10px" }}>
          <div style={{ color: "#4ade80", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Stability Phase</div>
          <div style={{ color: "#4ade80", fontSize: 24, fontWeight: 900, marginTop: 4 }}>{fmtPace(phases.stabilityAvgPace)}</div>
          <div style={{ color: "#334155", fontSize: 10, marginTop: 2 }}>{phases.stabilityKmCount} km · avg pace</div>
        </div>
        {phases.breakPointKm !== null ? (
          <div style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10, padding: "12px 10px" }}>
            <div style={{ color: "#f97316", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Decay Phase</div>
            <div style={{ color: "#f97316", fontSize: 24, fontWeight: 900, marginTop: 4 }}>{phases.decayAvgPace ? fmtPace(phases.decayAvgPace) : "—"}</div>
            <div style={{ color: "#334155", fontSize: 10, marginTop: 2 }}>
              from KM {phases.breakPointKm}{phases.decayPctWorse != null ? ` · +${phases.decayPctWorse.toFixed(1)}%` : ""}
            </div>
          </div>
        ) : (
          <div style={{ background: "rgba(74,222,128,0.04)", border: "1px solid rgba(74,222,128,0.1)", borderRadius: 10, padding: "12px 10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 18 }}>✅</div>
            <div style={{ color: "#4ade80", fontSize: 10, marginTop: 4, textAlign: "center" }}>No decay detected</div>
            <div style={{ color: "#334155", fontSize: 9, marginTop: 2 }}>Strong finish</div>
          </div>
        )}
      </div>

      {/* Consistency badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px" }}>
        <div>
          <div style={{ color: "#475569", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>Pace Consistency</div>
          <div style={{ color: phases.paceStdDevPct < 3 ? "#4ade80" : phases.paceStdDevPct < 7 ? "#facc15" : "#f87171", fontSize: 18, fontWeight: 700 }}>
            {phases.paceStdDevPct < 3 ? "Excellent" : phases.paceStdDevPct < 7 ? "Good" : "Variable"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ color: "#334155", fontSize: 9 }}>Std dev</div>
          <div style={{ color: "#94a3b8", fontSize: 16, fontWeight: 700 }}>±{phases.paceStdDevPct.toFixed(1)}%</div>
        </div>
      </div>

      <SplitTable splits={splits} phases={phases} targetPace={targetPace} />
      <FiveKmSegments splits={splits} />
    </>
  );
}
