import type { NarrativeEvent } from "../../coaching/runNarrative";
import type { PhaseAnalysis } from "../../hooks/useRunAnalytics";
import { fmtPace } from "../../utils/runFormatting";

interface CoachingInsightsProps {
  phases:      PhaseAnalysis;
  hasSplits:   boolean;
  targetPace:  number | null;
  deltaSec:    number | null;
  deltaColor:  string;
  pace:        number;
  coachEvents: NarrativeEvent[];
}

function InsightCard({ icon, title, body, accent }: { icon: string; title: string; body: string; accent: string }) {
  return (
    <div style={{
      display: "flex", gap: 10, marginBottom: 10,
      background: "rgba(255,255,255,0.02)", borderRadius: 10,
      padding: "10px 12px", border: `1px solid ${accent}33`,
    }}>
      <div style={{ fontSize: 16, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ color: accent, fontSize: 11, fontWeight: 700 }}>{title}</div>
        <div style={{ color: "#475569", fontSize: 10, marginTop: 3, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

function FormAdvice({ phases, targetPace, avgPace }: { phases: PhaseAnalysis; targetPace: number | null; avgPace: number }) {
  const tips: string[] = [];
  if (phases.paceStdDevPct > 7)
    tips.push("High pace variability. Count cadence (aim 170–180 spm) to hold a more consistent rhythm.");
  if (phases.breakPointKm !== null) {
    const total = phases.stabilityKmCount + phases.decayKmCount;
    const pct   = total > 0 ? Math.round((phases.breakPointKm / total) * 100) : 0;
    tips.push(`Fatigue onset at ${pct}% of the run (KM ${phases.breakPointKm}). Add easy long runs to push this break-point further.`);
  }
  if (targetPace && avgPace > targetPace * 1.15)
    tips.push("Pace was significantly below target. Start 10–15% slower and build into race pace after KM 1.");
  if (tips.length === 0 && phases.paceStdDevPct < 3)
    tips.push("Exceptional pacing. Maintain this consistency and focus on volume in your next training block.");
  if (tips.length === 0) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Form Advice</div>
      {tips.map((tip, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, color: "#475569", fontSize: 10, lineHeight: 1.5 }}>
          <span style={{ color: "#d4ff00", flexShrink: 0 }}>›</span>{tip}
        </div>
      ))}
    </div>
  );
}

export function CoachingInsights({ phases, hasSplits, targetPace, deltaSec, deltaColor, pace, coachEvents }: CoachingInsightsProps) {
  return (
    <>
      {phases.breakPointKm !== null ? (
        <InsightCard icon="⚠️" title={`Break-point at KM ${phases.breakPointKm}`} accent="#f97316"
          body={`Pace diverged >10% from stable average at KM ${phases.breakPointKm} and didn't recover.${phases.decayPctWorse != null ? ` Decay phase averaged ${phases.decayPctWorse.toFixed(1)}% slower.` : ""}`} />
      ) : hasSplits ? (
        <InsightCard icon="✅" title="No break-point detected" accent="#4ade80"
          body="Pace held within 10% of stable average throughout. Excellent pacing discipline." />
      ) : null}

      {deltaSec !== null && targetPace !== null && (
        <InsightCard
          icon={deltaSec <= 0 ? "🎯" : deltaSec <= 15 ? "📊" : "📉"}
          accent={deltaColor}
          title={deltaSec <= 5 ? "Target achieved" : deltaSec <= 15 ? "Slightly over target pace" : "Pace below target"}
          body={deltaSec <= 5
            ? `Average pace ${fmtPace(pace)} was within 5s of your ${fmtPace(targetPace)} target. Excellent execution.`
            : `Average pace was ${deltaSec}s/km slower than target ${fmtPace(targetPace)}. Focus on holding target effort in the first half.`}
        />
      )}

      {coachEvents.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Coach Observations</div>
          {coachEvents.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: e.type === "struggled" || e.type === "hill_effort" ? "#f97316" : e.type === "surged" ? "#4ade80" : "#a78bfa" }} />
              <div>
                <div style={{ color: "#94a3b8", fontSize: 10, textTransform: "capitalize" }}>{e.type.replace("_", " ")}</div>
                <div style={{ color: "#475569", fontSize: 10 }}>{e.description}</div>
              </div>
              <div style={{ marginLeft: "auto", color: "#334155", fontSize: 9, flexShrink: 0 }}>{(e.distanceMeters / 1000).toFixed(1)} km</div>
            </div>
          ))}
        </div>
      )}

      {hasSplits && <FormAdvice phases={phases} targetPace={targetPace} avgPace={pace} />}

      {!hasSplits && coachEvents.length === 0 && deltaSec == null && (
        <div style={{ color: "#334155", fontSize: 11, textAlign: "center", padding: "12px 0" }}>
          Run with GPS and a target pace to unlock detailed insights.
        </div>
      )}
    </>
  );
}
