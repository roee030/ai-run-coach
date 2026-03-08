/**
 * CoachDevPanel — DEV-only "Command Center"
 *
 * A fixed bottom panel giving full visibility into the coach engine:
 *   Row 1 — Scenario buttons (Sprint / Fade / Flow / Reset)
 *   Row 2 — Environment sliders (Incline, simulated HR override)
 *   Row 3 — Brain State grid (8 cells)
 *   Row 4 — Thought Log terminal (scrollable, copyable)
 */

import { useEffect, useRef, useState } from "react";
import type { UseCoachEngineResult, ThoughtEntry } from "../hooks/useCoachEngine";
import { runStressTests, formatStressTestSummary } from "../coaching/coachingSimulator";
import type { ScenarioResult } from "../coaching/coachingSimulator";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Scenario = "sprint" | "fade" | "steady" | null;

export interface SimState {
  scenario: Scenario;
  paceOverride: number | null;  // min/km
  hrSimulated: number;          // BPM
  cadenceSimulated: number;     // steps/min
  incline: number;              // percent 0-15
}

interface CoachDevPanelProps {
  debug: UseCoachEngineResult["debug"];
  isCoachSatisfied: boolean;
  isSpeaking: boolean;
  simState: SimState;
  thoughtLog: ThoughtEntry[];
  altitudeM?: number | null;
  onScenario: (s: Scenario) => void;
  onInclineChange: (v: number) => void;
  onClearLog: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCENARIO_META: Record<
  NonNullable<Scenario>,
  { label: string; desc: string; color: string }
> = {
  sprint: { label: "⚡ Sprint",     desc: "Pace −35% · HR 175 · Cad 185",  color: "#facc15" },
  fade:   { label: "🌊 Fade",       desc: "Pace +40% · HR 148 · Incline 8%", color: "#f87171" },
  steady: { label: "✅ Flow",       desc: "Easy pace · HR 142 · Cad 168",   color: "#4ade80" },
};

const DECISION_COLOR: Record<ThoughtEntry["decision"], string> = {
  SPEAK:     "#d4ff00",
  SILENT:    "#64748b",
  MILESTONE: "#a78bfa",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Cell({ label, value, color = "#e2e8f0" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#475569", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color, fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, unit, color, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: "#64748b", fontSize: 11, minWidth: 60 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: color, cursor: "pointer", height: 4 }}
      />
      <span style={{ color, fontWeight: 700, fontSize: 12, minWidth: 38, textAlign: "right" }}>
        {value}{unit}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CoachDevPanel({
  debug,
  isCoachSatisfied,
  isSpeaking,
  simState,
  thoughtLog,
  altitudeM,
  onScenario,
  onInclineChange,
  onClearLog,
}: CoachDevPanelProps) {
  const [open, setOpen] = useState(true);
  const [stressResults, setStressResults] = useState<ScenarioResult[] | null>(null);
  const [stressRunning, setStressRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever a new thought arrives
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [thoughtLog.length]);

  const handleRunStressTests = () => {
    setStressRunning(true);
    setStressResults(null);
    // Run synchronously but defer one frame so the button state updates first
    setTimeout(() => {
      const results = runStressTests();
      setStressResults(results);
      setStressRunning(false);
      // Copy summary to clipboard
      void navigator.clipboard?.writeText(formatStressTestSummary(results));
    }, 10);
  };

  const copyLog = () => {
    // Entries are chronological (oldest first) — newest last in clipboard = most useful order
    const text = thoughtLog
      .map(e => `[${e.time}] Score:${e.score} | ${e.inputDesc} | ${e.decision}${e.msgType ? ` (${e.msgType})` : ""} | ${e.reason}`)
      .join("\n");
    void navigator.clipboard?.writeText(text);
  };

  const panelH = open ? 420 : 34;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 200,
        height: panelH,
        transition: "height 0.2s ease",
        background: "#0a0a0a",
        borderTop: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: 12,
        userSelect: "text",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "0 12px", height: 34, flexShrink: 0,
          borderBottom: open ? "1px solid #1e293b" : "none",
          cursor: "pointer",
        }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ color: "#d4ff00", fontWeight: 700, fontSize: 10, letterSpacing: "0.1em" }}>DEV</span>
        <span style={{ color: "#475569", fontSize: 10 }}>│</span>
        <span style={{ color: "#94a3b8", fontSize: 11 }}>Coach Command Center</span>

        {isCoachSatisfied && (
          <span style={{ color: "#4ade80", fontSize: 10, marginLeft: 8 }}>😌 Flow</span>
        )}
        {isSpeaking && (
          <span style={{ color: "#d4ff00", fontSize: 10, marginLeft: 4 }}>🔊 Speaking</span>
        )}
        {simState.scenario && (
          <span style={{
            color: SCENARIO_META[simState.scenario].color,
            fontSize: 10, marginLeft: 8,
          }}>
            ● {simState.scenario.toUpperCase()}
          </span>
        )}

        <span style={{ color: "#334155", marginLeft: "auto", fontSize: 11 }}>
          {open ? "▼" : "▲"}
        </span>
      </div>

      {open && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* ── Scrollable body ───────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* ROW 1 — Scenarios */}
            <div>
              <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Simulate Scenario
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["sprint", "fade", "steady"] as NonNullable<Scenario>[]).map(s => {
                  const meta    = SCENARIO_META[s];
                  const active  = simState.scenario === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      title={meta.desc}
                      onClick={() => onScenario(active ? null : s)}
                      style={{
                        padding: "5px 12px",
                        background: active ? meta.color : "transparent",
                        color: active ? "#000" : meta.color,
                        border: `1px solid ${meta.color}`,
                        borderRadius: 6, cursor: "pointer",
                        fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                        transition: "all 0.12s",
                        flexShrink: 0,
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onScenario(null)}
                  title="Clear all overrides"
                  style={{
                    padding: "5px 12px",
                    background: "transparent",
                    color: "#64748b",
                    border: "1px solid #334155",
                    borderRadius: 6, cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11,
                    transition: "all 0.12s",
                  }}
                >
                  🔄 Reset
                </button>
              </div>
              {simState.scenario && (
                <div style={{ color: SCENARIO_META[simState.scenario].color, fontSize: 10, marginTop: 5 }}>
                  Active: {SCENARIO_META[simState.scenario].desc} — auto-clears in 30s
                </div>
              )}
            </div>

            {/* ROW 2 — Environment */}
            <div>
              <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Environment
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <SliderRow
                  label="Incline"
                  value={simState.incline} min={0} max={15} step={1}
                  unit="%" color="#f97316"
                  onChange={onInclineChange}
                />
                <SliderRow
                  label="Sim HR"
                  value={simState.hrSimulated} min={100} max={200} step={1}
                  unit=" bpm" color="#ec4899"
                  onChange={() => { /* controlled via scenario */ }}
                />
              </div>
            </div>

            {/* ROW 3 — Brain State Grid */}
            <div>
              <div style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Brain State
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 16px" }}>
                <Cell
                  label="Score"
                  value={`${debug.needToSpeakScore}/100`}
                  color={debug.needToSpeakScore > 80 ? "#d4ff00" : debug.needToSpeakScore > 50 ? "#facc15" : "#4ade80"}
                />
                <Cell label="Chapter" value={debug.chapter} color="#a78bfa" />
                <Cell
                  label="HR"
                  value={`${simState.hrSimulated} bpm`}
                  color="#ec4899"
                />
                <Cell
                  label="Settling"
                  value={debug.settlingRemainMs > 0 ? `${Math.ceil(debug.settlingRemainMs / 1000)}s` : "ready"}
                  color={debug.settlingRemainMs > 0 ? "#facc15" : "#4ade80"}
                />
                <Cell
                  label="Direction"
                  value={debug.lastDirection ?? "neutral"}
                  color={debug.lastDirection === "slow_down" ? "#facc15" : debug.lastDirection === "speed_up" ? "#f87171" : "#64748b"}
                />
                <Cell label="Cemetery" value={`${debug.phraseCemeterySize}`} color="#94a3b8" />
                <Cell
                  label="Deviation"
                  value={`${(debug.deviation * 100).toFixed(1)}%`}
                  color={Math.abs(debug.deviation) > 0.15 ? "#f87171" : Math.abs(debug.deviation) > 0.08 ? "#facc15" : "#4ade80"}
                />
                <Cell
                  label="Cooldown"
                  value={debug.cooldownRemainingMs > 0 ? `${Math.ceil(debug.cooldownRemainingMs / 1000)}s` : "ready"}
                  color={debug.cooldownRemainingMs > 0 ? "#f87171" : "#4ade80"}
                />
                <Cell
                  label="Altitude"
                  value={altitudeM != null ? `${altitudeM.toFixed(0)}m` : "n/a"}
                  color={altitudeM != null ? "#f97316" : "#334155"}
                />
              </div>
            </div>

            {/* ROW 3b — Stress Tests */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Stress Tests
                </span>
                <button
                  type="button"
                  onClick={handleRunStressTests}
                  disabled={stressRunning}
                  style={{
                    padding: "4px 12px",
                    background: stressRunning ? "#1e293b" : "transparent",
                    color: stressRunning ? "#64748b" : "#a78bfa",
                    border: "1px solid #a78bfa",
                    borderRadius: 6, cursor: stressRunning ? "default" : "pointer",
                    fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                  }}
                >
                  {stressRunning ? "Running…" : "Run Stress Tests"}
                </button>
                {stressResults && (
                  <span style={{ color: stressResults.every(r => r.passed) ? "#4ade80" : "#f87171", fontSize: 10 }}>
                    {stressResults.every(r => r.passed) ? "All PASS" : `${stressResults.filter(r => !r.passed).length} FAILED`}
                  </span>
                )}
              </div>

              {stressResults && (
                <div style={{
                  background: "#050505", border: "1px solid #1e293b", borderRadius: 4,
                  padding: "6px 8px", fontSize: 10, fontFamily: "inherit",
                  overflowX: "auto",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto auto", gap: "2px 12px", alignItems: "center" }}>
                    {/* Header */}
                    {["Scenario", "Speaks", "Alerts", "HR Warn", "Goal", "Status"].map(h => (
                      <span key={h} style={{ color: "#475569", fontSize: 9, textTransform: "uppercase" }}>{h}</span>
                    ))}
                    {/* Rows */}
                    {stressResults.map(r => (
                      <>
                        <span key={`n_${r.name}`} style={{ color: "#94a3b8" }}>{r.name}</span>
                        <span key={`s_${r.name}`} style={{ color: "#e2e8f0", textAlign: "right" }}>{r.totalSpeaks}</span>
                        <span key={`a_${r.name}`} style={{ color: r.criticalAlerts > 0 ? "#facc15" : "#4ade80", textAlign: "right" }}>{r.criticalAlerts}</span>
                        <span key={`h_${r.name}`} style={{ color: r.hrWarnings > 0 ? "#ec4899" : "#4ade80", textAlign: "right" }}>{r.hrWarnings}</span>
                        <span key={`g_${r.name}`} style={{ color: r.goalSuccess ? "#4ade80" : "#64748b", textAlign: "right" }}>{r.goalSuccess ? "yes" : "no"}</span>
                        <span key={`p_${r.name}`} style={{ color: r.passed ? "#4ade80" : "#f87171", fontWeight: 700 }}>{r.passed ? "PASS" : "FAIL"}</span>
                        {r.conflicts.map((c, i) => (
                          <span key={`c_${r.name}_${i}`} style={{ gridColumn: "1 / -1", color: "#f87171", paddingLeft: 8, fontSize: 9 }}>!! {c}</span>
                        ))}
                      </>
                    ))}
                  </div>
                  <div style={{ color: "#334155", fontSize: 9, marginTop: 6 }}>
                    Full audit copied to clipboard.
                  </div>
                </div>
              )}
            </div>

            {/* ROW 4 — Thought Log */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                <span style={{ color: "#334155", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Thought Log
                </span>
                <span style={{ color: "#1e293b", margin: "0 8px" }}>({thoughtLog.length})</span>
                <button
                  type="button" onClick={copyLog}
                  style={{ color: "#475569", fontSize: 10, cursor: "pointer", background: "none", border: "none", padding: "0 6px", fontFamily: "inherit" }}
                >
                  📋 Copy
                </button>
                <button
                  type="button" onClick={onClearLog}
                  style={{ color: "#475569", fontSize: 10, cursor: "pointer", background: "none", border: "none", padding: "0 6px", fontFamily: "inherit" }}
                >
                  🧹 Clear
                </button>
              </div>

              <div
                ref={logRef}
                style={{
                  flex: 1,
                  minHeight: 80,
                  maxHeight: 120,
                  overflowY: "auto",
                  background: "#050505",
                  border: "1px solid #1e293b",
                  borderRadius: 4,
                  padding: "6px 8px",
                }}
              >
                {thoughtLog.length === 0 && (
                  <div style={{ color: "#334155", fontSize: 11 }}>Waiting for run to start...</div>
                )}
                {thoughtLog.map((e, i) => (
                  <div key={`${e.timestamp}_${i}`} style={{ marginBottom: 6, lineHeight: 1.4 }}>
                    {/* Line 1 */}
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ color: "#475569" }}>[{e.time}]</span>
                      <span style={{ color: "#334155" }}>Score:{e.score}</span>
                      <span
                        style={{
                          color: DECISION_COLOR[e.decision],
                          fontWeight: 700,
                          fontSize: 11,
                          background: e.decision === "SPEAK" ? "rgba(212,255,0,0.08)" : "transparent",
                          padding: e.decision === "SPEAK" ? "0 4px" : undefined,
                          borderRadius: 2,
                        }}
                      >
                        {e.decision}{e.msgType ? `: ${e.msgType}` : ""}
                      </span>
                    </div>
                    {/* Line 2 */}
                    <div style={{ color: "#334155", paddingLeft: 44, fontSize: 10 }}>
                      {e.inputDesc}
                    </div>
                    {/* Line 3 */}
                    <div style={{ color: "#475569", paddingLeft: 44, fontSize: 10, fontStyle: "italic" }}>
                      → {e.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
