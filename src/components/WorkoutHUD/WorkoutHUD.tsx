/**
 * WorkoutHUD — Garmin-style live workout step overlay.
 * Shows current step, target gauge, step progress, and next-step preview.
 */

import { motion, AnimatePresence } from "framer-motion";
import type { ActiveStep } from "../../types/workout";
import { STEP_META, HR_ZONE_LABELS } from "../../types/workout";
import { fmtPace } from "../../utils/runFormatting";

interface WorkoutHUDProps {
  workoutName:    string;
  currentStep:    ActiveStep | null;
  nextStep:       ActiveStep | null;
  stepIdx:        number;
  totalSteps:     number;
  remaining:      number | null;
  progress:       number;
  workoutMessage: string | null;
}

function fmtRemaining(remaining: number | null, type: "time" | "distance" | "open"): string {
  if (remaining === null || type === "open") return "Open";
  if (type === "time") {
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return remaining >= 1000 ? `${(remaining / 1000).toFixed(2)} km` : `${Math.round(remaining)} m`;
}

function TargetBadge({ step }: { step: ActiveStep }) {
  const t = step.target;
  if (t.type === "none") return null;
  if (t.type === "pace")
    return <span style={{ color: "#d4ff00", fontSize: 11, fontWeight: 700 }}>{fmtPace(t.minPaceMinPerKm)}–{fmtPace(t.maxPaceMinPerKm)}/km</span>;
  if (t.type === "heartRateZone")
    return <span style={{ color: "#ec4899", fontSize: 11, fontWeight: 700 }}>Zone {t.zone} — {HR_ZONE_LABELS[t.zone]}</span>;
  if (t.type === "cadence")
    return <span style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700 }}>{t.minSpm}–{t.maxSpm} spm</span>;
  return null;
}

export function WorkoutHUD({
  workoutName, currentStep, nextStep, stepIdx, totalSteps, remaining, progress, workoutMessage,
}: WorkoutHUDProps) {
  if (!currentStep) return null;
  const meta = STEP_META[currentStep.stepType];

  return (
    <div style={{ marginBottom: 8, borderRadius: 14, overflow: "hidden", border: `1px solid ${meta.color}30`, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          style={{ height: "100%", background: meta.color, transformOrigin: "left" }}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Main body */}
      <div style={{ padding: "10px 14px" }}>
        {/* Row 1: step type + repeat info + step counter */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14 }}>{meta.icon}</span>
            <span style={{ color: meta.color, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {meta.label}
            </span>
            {currentStep.repeatTotal && (
              <span style={{ color: "#475569", fontSize: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "1px 6px" }}>
                Rep {(currentStep.repeatIndex ?? 0) + 1}/{currentStep.repeatTotal}
              </span>
            )}
          </div>
          <span style={{ color: "#334155", fontSize: 10 }}>{stepIdx + 1} / {totalSteps}</span>
        </div>

        {/* Row 2: big remaining + target */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#ffffff", fontSize: 36, fontWeight: 900, lineHeight: 1, fontFamily: "'Oswald', Inter, sans-serif", fontVariantNumeric: "tabular-nums" }}>
              {fmtRemaining(remaining, currentStep.duration.type)}
            </div>
            <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", marginTop: 2 }}>
              {currentStep.duration.type === "time" ? "remaining" : currentStep.duration.type === "distance" ? "to go" : "lap press"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", marginBottom: 3 }}>target</div>
            <TargetBadge step={currentStep} />
            {currentStep.target.type === "none" && <span style={{ color: "#334155", fontSize: 11 }}>—</span>}
          </div>
        </div>

        {/* Row 3: workout alert (out-of-range) */}
        <AnimatePresence>
          {workoutMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginTop: 8, padding: "6px 10px", background: "rgba(250,204,21,0.12)", borderRadius: 6, border: "1px solid rgba(250,204,21,0.25)" }}
            >
              <span style={{ color: "#facc15", fontSize: 11, fontWeight: 700 }}>⚡ {workoutMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Next step strip */}
      {nextStep && (
        <div style={{ padding: "6px 14px", background: "rgba(255,255,255,0.03)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>Next</span>
          <span style={{ fontSize: 11 }}>{STEP_META[nextStep.stepType].icon}</span>
          <span style={{ color: STEP_META[nextStep.stepType].color, fontSize: 10, fontWeight: 700 }}>{STEP_META[nextStep.stepType].label}</span>
          {nextStep.duration.type !== "open" && nextStep.duration.value && (
            <span style={{ color: "#475569", fontSize: 10 }}>
              {nextStep.duration.type === "time"
                ? `${Math.floor(nextStep.duration.value / 60)}:${String(nextStep.duration.value % 60).padStart(2, "0")}`
                : `${(nextStep.duration.value / 1000).toFixed(1)} km`}
            </span>
          )}
          {nextStep.target.type !== "none" && (
            <span style={{ marginLeft: "auto" }}><TargetBadge step={nextStep} /></span>
          )}
        </div>
      )}
    </div>
  );
}
