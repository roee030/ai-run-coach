import type { RunReport } from "../../hooks/useCoachEngine";
import { fmtPace, fmtChipTime } from "../../utils/runFormatting";

interface SummaryHeroProps {
  distance:    number;
  elapsedTime: number;
  pace:        number;
  targetPace:  number | null;
  deltaSec:    number | null;
  deltaColor:  string;
  deltaStr:    string | null;
  hasHr:       boolean;
  runReport:   RunReport | null | undefined;
}

function Stat({ label, value, unit, accent }: {
  label: string; value: string; unit?: string; accent?: boolean;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "#475569", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{
        color: accent ? "#d4ff00" : "#e2e8f0", fontSize: 28, fontWeight: 900, lineHeight: 1.1, marginTop: 2,
        fontFamily: "'Oswald', Inter, system-ui, sans-serif", fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      {unit && <div style={{ color: "#334155", fontSize: 9, marginTop: 2 }}>{unit}</div>}
    </div>
  );
}

export function SummaryHero({ distance, elapsedTime, pace, targetPace, deltaSec, deltaColor, deltaStr, hasHr, runReport }: SummaryHeroProps) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(212,255,0,0.06), rgba(212,255,0,0.01))",
      border: "1px solid rgba(212,255,0,0.15)", borderRadius: 16, padding: "20px 16px", marginBottom: 12,
    }}>
      {/* Chip time */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ color: "#475569", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase" }}>Chip Time</div>
        <div style={{ color: "#ffffff", fontSize: "clamp(44px, 12vw, 72px)", fontWeight: 900, lineHeight: 1, fontFamily: "'Oswald', Inter, system-ui, sans-serif", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>
          {fmtChipTime(elapsedTime)}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <Stat label="Distance" value={(distance / 1000).toFixed(2)} unit="KM" accent />
        <Stat label="Avg Pace" value={fmtPace(pace)} unit="min/km" />
        {targetPace ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#475569", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>Vs Target</div>
            <div style={{ color: deltaColor, fontSize: 26, fontWeight: 900, lineHeight: 1.1, marginTop: 2, fontFamily: "'Oswald', Inter", fontVariantNumeric: "tabular-nums" }}>
              {deltaSec === 0 ? "±0s" : `${deltaSec! > 0 ? "+" : ""}${deltaSec}s`}
            </div>
            <div style={{ color: "#334155", fontSize: 9, marginTop: 2 }}>target {fmtPace(targetPace)}</div>
            {deltaStr && <div style={{ color: deltaColor, fontSize: 9, marginTop: 2 }}>{deltaStr}</div>}
          </div>
        ) : hasHr ? (
          <Stat label="Peak HR" value={`${runReport!.maxHeartRate!}`} unit="BPM" />
        ) : (
          <Stat label="Goal" value={runReport?.goalCompletionPct ? `${Math.round(runReport.goalCompletionPct * 100)}%` : "—"} unit="complete" />
        )}
      </div>

      {/* Optional HR + altitude badges */}
      {(hasHr || (runReport?.peakAltitudeM ?? 0) > 0) && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center" }}>
          {hasHr && (
            <div style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 8, padding: "6px 14px", textAlign: "center" }}>
              <div style={{ color: "#ec4899", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>Peak HR</div>
              <div style={{ color: "#ec4899", fontSize: 20, fontWeight: 900 }}>{runReport!.maxHeartRate!}</div>
              <div style={{ color: "#334155", fontSize: 9 }}>BPM</div>
            </div>
          )}
          {(runReport?.peakAltitudeM ?? 0) > 0 && (
            <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 8, padding: "6px 14px", textAlign: "center" }}>
              <div style={{ color: "#f97316", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" }}>Peak Alt</div>
              <div style={{ color: "#f97316", fontSize: 20, fontWeight: 900 }}>{Math.round(runReport!.peakAltitudeM!)}</div>
              <div style={{ color: "#334155", fontSize: 9 }}>metres</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
