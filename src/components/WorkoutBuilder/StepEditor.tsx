/**
 * StepEditor — inline form for editing a single WorkoutStep.
 */

import type { WorkoutStep, StepType, DurationType, StepTarget } from "../../types/workout";
import { STEP_META } from "../../types/workout";
import { fmtPace } from "../../utils/runFormatting";

const STEP_TYPES: StepType[] = ["warmup", "run", "recover", "rest", "cooldown", "other"];
const DURATION_TYPES: { value: DurationType; label: string }[] = [
  { value: "distance", label: "Distance" },
  { value: "time",     label: "Time"     },
  { value: "open",     label: "Open"     },
];

interface Props { step: WorkoutStep; onChange: (s: WorkoutStep) => void; onClose: () => void; }

function parsePace(raw: string): number | undefined {
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1], 10) + parseInt(m[2], 10) / 60 : undefined;
}

export function StepEditor({ step, onChange, onClose }: Props) {
  const patch = (p: Partial<WorkoutStep>) => onChange({ ...step, ...p });
  const patchTarget = (t: Partial<StepTarget>) => patch({ target: { ...step.target, ...t } as StepTarget });

  const dur = step.duration;
  const tgt = step.target;

  return (
    <div style={{ background: "rgba(212,255,0,0.04)", border: "1px solid rgba(212,255,0,0.15)", borderRadius: 12, padding: "14px 14px 10px", marginTop: 6 }}>
      {/* Step type */}
      <div style={{ color: "#64748b", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Step Type</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
        {STEP_TYPES.map(t => {
          const m = STEP_META[t];
          const active = step.stepType === t;
          return (
            <button key={t} type="button" onClick={() => patch({ stepType: t })} style={{
              padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: active ? `${m.color}20` : "rgba(255,255,255,0.04)",
              border: `1px solid ${active ? m.color : "rgba(255,255,255,0.1)"}`,
              color: active ? m.color : "#475569", fontFamily: "inherit",
            }}>
              {m.icon} {m.label}
            </button>
          );
        })}
      </div>

      {/* Duration */}
      <div style={{ color: "#64748b", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Duration</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {DURATION_TYPES.map(d => (
          <button key={d.value} type="button" onClick={() => patch({ duration: { type: d.value } })} style={{
            flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
            background: dur.type === d.value ? "rgba(212,255,0,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${dur.type === d.value ? "rgba(212,255,0,0.4)" : "rgba(255,255,255,0.08)"}`,
            color: dur.type === d.value ? "#d4ff00" : "#475569", fontFamily: "inherit",
          }}>{d.label}</button>
        ))}
      </div>
      {dur.type !== "open" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <input type="number" min={1} value={dur.value ?? ""}
            placeholder={dur.type === "distance" ? "metres" : "seconds"}
            onChange={e => patch({ duration: { ...dur, value: e.target.value ? Number(e.target.value) : undefined } })}
            style={{ flex: 1, padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit" }}
          />
          <span style={{ color: "#475569", fontSize: 11 }}>{dur.type === "distance" ? "m" : "sec"}</span>
        </div>
      )}

      {/* Target */}
      <div style={{ color: "#64748b", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Target</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {(["none", "pace", "heartRateZone", "cadence"] as const).map(t => (
          <button key={t} type="button" onClick={() => patch({ target: { type: t } as StepTarget })} style={{
            padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
            background: tgt.type === t ? "rgba(212,255,0,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${tgt.type === t ? "rgba(212,255,0,0.4)" : "rgba(255,255,255,0.08)"}`,
            color: tgt.type === t ? "#d4ff00" : "#475569", fontFamily: "inherit",
          }}>{{ none: "None", pace: "Pace", heartRateZone: "HR Zone", cadence: "Cadence" }[t]}</button>
        ))}
      </div>

      {tgt.type === "pace" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          {["Min", "Max"].map((lbl, i) => {
            const val = i === 0 ? (tgt as {type:"pace";minPaceMinPerKm:number;maxPaceMinPerKm:number}).minPaceMinPerKm : (tgt as {type:"pace";minPaceMinPerKm:number;maxPaceMinPerKm:number}).maxPaceMinPerKm;
            return (
              <div key={lbl} style={{ flex: 1 }}>
                <div style={{ color: "#334155", fontSize: 9, marginBottom: 4 }}>{lbl} pace</div>
                <input type="text" defaultValue={val ? fmtPace(val) : ""} placeholder="M:SS"
                  onBlur={e => { const v = parsePace(e.target.value); if (v) patchTarget(i === 0 ? { type: "pace", minPaceMinPerKm: v } : { type: "pace", maxPaceMinPerKm: v }); }}
                  style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }}
                />
              </div>
            );
          })}
        </div>
      )}

      {tgt.type === "heartRateZone" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {([1,2,3,4,5] as const).map(z => (
            <button key={z} type="button" onClick={() => patchTarget({ type: "heartRateZone", zone: z })} style={{
              flex: 1, padding: "7px 0", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: (tgt as {type:"heartRateZone";zone:number}).zone === z ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${(tgt as {type:"heartRateZone";zone:number}).zone === z ? "#ec4899" : "rgba(255,255,255,0.08)"}`,
              color: (tgt as {type:"heartRateZone";zone:number}).zone === z ? "#ec4899" : "#475569", fontFamily: "inherit",
            }}>Z{z}</button>
          ))}
        </div>
      )}

      {tgt.type === "cadence" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          {["Min", "Max"].map((lbl, i) => (
            <div key={lbl} style={{ flex: 1 }}>
              <div style={{ color: "#334155", fontSize: 9, marginBottom: 4 }}>{lbl} spm</div>
              <input type="number" min={100} max={220}
                defaultValue={i === 0 ? (tgt as {type:"cadence";minSpm:number;maxSpm:number}).minSpm : (tgt as {type:"cadence";minSpm:number;maxSpm:number}).maxSpm}
                placeholder={i === 0 ? "150" : "200"}
                onBlur={e => { const v = Number(e.target.value); patchTarget(i === 0 ? { type: "cadence", minSpm: v } : { type: "cadence", maxSpm: v }); }}
                style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" }}
              />
            </div>
          ))}
        </div>
      )}

      <button type="button" onClick={onClose} style={{
        width: "100%", padding: "8px", borderRadius: 8, background: "rgba(212,255,0,0.1)",
        border: "1px solid rgba(212,255,0,0.3)", color: "#d4ff00", fontWeight: 700, fontSize: 12,
        cursor: "pointer", fontFamily: "inherit",
      }}>Done</button>
    </div>
  );
}
