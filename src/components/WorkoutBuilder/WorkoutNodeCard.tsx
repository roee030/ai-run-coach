/**
 * WorkoutNodeCard — renders a WorkoutStep or RepeatBlock row.
 */

import type { WorkoutStep, RepeatBlock } from "../../types/workout";
import { STEP_META } from "../../types/workout";
import { fmtPace } from "../../utils/runFormatting";
import { StepEditor } from "./StepEditor";

// ─── Step summary helpers ─────────────────────────────────────────────────────

function durationLabel({ type, value }: WorkoutStep["duration"]): string {
  if (type === "open") return "Open";
  if (!value) return "—";
  if (type === "distance") return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value} m`;
  const m = Math.floor(value / 60), s = value % 60;
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, "0")}`;
}

function targetLabel(t: WorkoutStep["target"]): string {
  if (t.type === "none") return "";
  if (t.type === "pace") return `${fmtPace(t.minPaceMinPerKm)}–${fmtPace(t.maxPaceMinPerKm)}/km`;
  if (t.type === "heartRateZone") return `Zone ${t.zone}`;
  if (t.type === "cadence") return `${t.minSpm}–${t.maxSpm} spm`;
  return "";
}

// ─── Single step card ────────────────────────────────────────────────────────

interface StepCardProps {
  step:       WorkoutStep;
  isEditing:  boolean;
  onEdit:     () => void;
  onChange:   (s: WorkoutStep) => void;
  onDelete:   () => void;
  onMoveUp?:  () => void;
  onMoveDown?: () => void;
}

export function StepCard({ step, isEditing, onEdit, onChange, onDelete, onMoveUp, onMoveDown }: StepCardProps) {
  const meta = STEP_META[step.stepType];
  const tLabel = targetLabel(step.target);
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${meta.color}22`, borderRadius: 10 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{meta.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: meta.color, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{meta.label}</div>
          <div style={{ color: "#475569", fontSize: 10, marginTop: 1 }}>
            {durationLabel(step.duration)}{tLabel ? ` · ${tLabel}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {onMoveUp   && <Btn label="↑" onClick={onMoveUp}   />}
          {onMoveDown && <Btn label="↓" onClick={onMoveDown} />}
          <Btn label={isEditing ? "▾" : "✎"} onClick={onEdit} accent />
          <Btn label="✕" onClick={onDelete} danger />
        </div>
      </div>
      {isEditing && <StepEditor step={step} onChange={onChange} onClose={onEdit} />}
    </div>
  );
}

// ─── Repeat block card ───────────────────────────────────────────────────────

interface RepeatCardProps {
  block:         RepeatBlock;
  editingStepId: string | null;
  onSetRepeat:   (count: number) => void;
  onAddStep:     () => void;
  onEditStep:    (id: string) => void;
  onChangeStep:  (s: WorkoutStep) => void;
  onDeleteStep:  (id: string) => void;
  onMoveStepUp:  (i: number) => void;
  onMoveStepDown:(i: number) => void;
  onMoveBlockUp?: () => void;
  onMoveBlockDown?: () => void;
  onDelete:      () => void;
}

export function RepeatCard({
  block, editingStepId, onSetRepeat, onAddStep, onEditStep, onChangeStep,
  onDeleteStep, onMoveStepUp, onMoveStepDown, onMoveBlockUp, onMoveBlockDown, onDelete,
}: RepeatCardProps) {
  return (
    <div style={{ marginBottom: 8, border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, overflow: "hidden" }}>
      {/* Block header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "rgba(148,163,184,0.08)" }}>
        <span style={{ fontSize: 13 }}>🔁</span>
        <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, flex: 1 }}>Repeat</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button type="button" onClick={() => onSetRepeat(Math.max(2, block.repeatCount - 1))} style={miniBtn}>−</button>
          <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{block.repeatCount}×</span>
          <button type="button" onClick={() => onSetRepeat(Math.min(40, block.repeatCount + 1))} style={miniBtn}>＋</button>
        </div>
        {onMoveBlockUp   && <Btn label="↑" onClick={onMoveBlockUp}   />}
        {onMoveBlockDown && <Btn label="↓" onClick={onMoveBlockDown} />}
        <Btn label="✕" onClick={onDelete} danger />
      </div>
      {/* Nested steps */}
      <div style={{ padding: "8px 12px 4px" }}>
        {block.steps.map((s, i) => (
          <StepCard
            key={s.id} step={s} isEditing={editingStepId === s.id}
            onEdit={() => onEditStep(editingStepId === s.id ? "" : s.id)}
            onChange={onChangeStep} onDelete={() => onDeleteStep(s.id)}
            onMoveUp={i > 0 ? () => onMoveStepUp(i) : undefined}
            onMoveDown={i < block.steps.length - 1 ? () => onMoveStepDown(i) : undefined}
          />
        ))}
        <button type="button" onClick={onAddStep} style={{
          width: "100%", padding: "6px", borderRadius: 7, border: "1px dashed rgba(255,255,255,0.1)",
          background: "transparent", color: "#334155", fontSize: 11, cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
        }}>＋ Add step</button>
      </div>
    </div>
  );
}

// ─── Shared tiny button ───────────────────────────────────────────────────────

const miniBtn: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 5, background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 13,
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
};

function Btn({ label, onClick, accent, danger }: { label: string; onClick: () => void; accent?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: 26, height: 26, borderRadius: 6, border: "none", cursor: "pointer",
      background: danger ? "rgba(248,113,113,0.1)" : accent ? "rgba(212,255,0,0.1)" : "rgba(255,255,255,0.06)",
      color: danger ? "#f87171" : accent ? "#d4ff00" : "#64748b", fontSize: 12,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>{label}</button>
  );
}
