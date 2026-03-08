/**
 * WorkoutBuilder — two-view screen: Workout List → Workout Editor.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Workout, WorkoutNode, WorkoutStep, RepeatBlock } from "../../types/workout";
import { isRepeatBlock, isWorkoutStep, generateId, STEP_META, flattenWorkout } from "../../types/workout";
import { useWorkouts } from "../../hooks/useWorkouts";
import { StepCard, RepeatCard } from "./WorkoutNodeCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newStep(stepType: WorkoutStep["stepType"] = "run"): WorkoutStep {
  return { id: generateId(), stepType, duration: { type: "distance", value: 1000 }, target: { type: "none" } };
}
function newRepeat(): RepeatBlock {
  return { id: generateId(), repeatCount: 4, steps: [newStep("run"), newStep("rest")] };
}
function totalEstimatedMin(w: Workout): number {
  return flattenWorkout(w).reduce((acc, s) => {
    if (s.duration.type === "time" && s.duration.value) return acc + s.duration.value / 60;
    if (s.duration.type === "distance" && s.duration.value) return acc + (s.duration.value / 1000) * 5.5; // ~5:30/km est
    return acc + 1;
  }, 0);
}

// ─── List view ────────────────────────────────────────────────────────────────

function WorkoutListView({ onBack, onNew, onEdit, onStart }: {
  onBack: () => void; onNew: () => void; onEdit: (w: Workout) => void; onStart: (w: Workout) => void;
}) {
  const { workouts, deleteWorkout } = useWorkouts();
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px" }}>
      {workouts.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 50 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏋️</div>
          <div style={{ color: "#475569", fontSize: 14 }}>No workouts yet.</div>
          <div style={{ color: "#334155", fontSize: 12, marginTop: 4 }}>Tap ＋ New to build your first structured session.</div>
        </div>
      ) : workouts.map(w => {
        const steps = flattenWorkout(w);
        const mins  = Math.round(totalEstimatedMin(w));
        return (
          <div key={w.id} style={{ marginBottom: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "12px 14px 10px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700 }}>{w.name}</div>
                <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>{steps.length} steps · ~{mins} min</div>
                {/* Step type mini-strip */}
                <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                  {w.nodes.slice(0, 8).map(n => isRepeatBlock(n)
                    ? <span key={n.id} style={{ fontSize: 9, color: "#94a3b8", background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "2px 5px" }}>×{n.repeatCount}</span>
                    : <span key={n.id} style={{ fontSize: 9, color: STEP_META[n.stepType].color, background: `${STEP_META[n.stepType].color}18`, borderRadius: 4, padding: "2px 5px" }}>{STEP_META[n.stepType].label}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => onEdit(w)} style={ghostBtn("#94a3b8")}>✎</button>
                <button type="button" onClick={() => deleteWorkout(w.id)} style={ghostBtn("#f87171")}>✕</button>
              </div>
            </div>
            {/* Start button */}
            <button type="button" onClick={() => onStart(w)} style={{
              width: "100%", padding: "10px", background: "rgba(212,255,0,0.08)", border: "none",
              borderTop: "1px solid rgba(212,255,0,0.12)", color: "#d4ff00", fontWeight: 700,
              fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
            }}>▶ Start Workout</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Editor view ──────────────────────────────────────────────────────────────

function WorkoutEditorView({ initial, onSave, onCancel }: {
  initial: Workout; onSave: (w: Workout) => void; onCancel: () => void;
}) {
  const [workout, setWorkout]     = useState<Workout>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const nodes = workout.nodes;

  const patch = (nodes: WorkoutNode[]) => setWorkout(w => ({ ...w, nodes }));
  const move  = (i: number, dir: -1 | 1) => {
    const arr = [...nodes]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; patch(arr);
  };

  const updateRepeatStep = (blockId: string, updatedStep: WorkoutStep) =>
    patch(nodes.map(n => isRepeatBlock(n) && n.id === blockId ? { ...n, steps: n.steps.map(s => s.id === updatedStep.id ? updatedStep : s) } : n));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
      {/* Workout name */}
      <input value={workout.name} onChange={e => setWorkout(w => ({ ...w, name: e.target.value }))}
        placeholder="Workout name…"
        style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, color: "#e2e8f0", fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" }} />

      {/* Nodes */}
      {nodes.map((node, i) => isRepeatBlock(node) ? (
        <RepeatCard key={node.id} block={node} editingStepId={editingId}
          onSetRepeat={c => patch(nodes.map(n => n.id === node.id ? { ...node, repeatCount: c } : n))}
          onAddStep={() => patch(nodes.map(n => n.id === node.id ? { ...node, steps: [...node.steps, newStep()] } : n))}
          onEditStep={id => setEditingId(editingId === id ? null : id)}
          onChangeStep={s => updateRepeatStep(node.id, s)}
          onDeleteStep={id => patch(nodes.map(n => n.id === node.id ? { ...node, steps: node.steps.filter(s => s.id !== id) } : n))}
          onMoveStepUp={si => {
            const steps = [...node.steps]; [steps[si], steps[si-1]] = [steps[si-1], steps[si]];
            patch(nodes.map(n => n.id === node.id ? { ...node, steps } : n));
          }}
          onMoveStepDown={si => {
            const steps = [...node.steps]; [steps[si], steps[si+1]] = [steps[si+1], steps[si]];
            patch(nodes.map(n => n.id === node.id ? { ...node, steps } : n));
          }}
          onMoveBlockUp={i > 0 ? () => move(i, -1) : undefined}
          onMoveBlockDown={i < nodes.length - 1 ? () => move(i, 1) : undefined}
          onDelete={() => patch(nodes.filter(n => n.id !== node.id))}
        />
      ) : (
        <StepCard key={node.id} step={node} isEditing={editingId === node.id}
          onEdit={() => setEditingId(editingId === node.id ? null : node.id)}
          onChange={s => patch(nodes.map(n => isWorkoutStep(n) && n.id === s.id ? s : n))}
          onDelete={() => patch(nodes.filter(n => n.id !== node.id))}
          onMoveUp={i > 0 ? () => move(i, -1) : undefined}
          onMoveDown={i < nodes.length - 1 ? () => move(i, 1) : undefined}
        />
      ))}

      {/* Add buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
        <button type="button" onClick={() => patch([...nodes, newStep()])} style={addBtn}>＋ Step</button>
        <button type="button" onClick={() => patch([...nodes, newRepeat()])} style={addBtn}>🔁 Repeat</button>
      </div>

      {/* Save / Cancel */}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={onCancel} style={{ ...addBtn, flex: 1, color: "#64748b", borderColor: "rgba(255,255,255,0.1)" }}>Cancel</button>
        <button type="button" onClick={() => onSave(workout)} style={{
          flex: 2, padding: "11px", borderRadius: 9999, background: "#d4ff00", color: "#000",
          fontWeight: 900, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer", fontFamily: "inherit",
        }}>Save Workout</button>
      </div>
    </div>
  );
}

const addBtn: React.CSSProperties = {
  flex: 1, padding: "10px", borderRadius: 9, border: "1px dashed rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.03)", color: "#475569", fontSize: 12, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn = (color: string): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 7, background: `${color}15`, border: `1px solid ${color}30`,
  color, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
});

// ─── Main export ──────────────────────────────────────────────────────────────

export function WorkoutBuilder({ onBack, onStartWorkout }: {
  onBack: () => void; onStartWorkout: (w: Workout) => void;
}) {
  const { saveWorkout } = useWorkouts();
  const [editing, setEditing] = useState<Workout | null>(null);

  const handleNew  = () => setEditing({ id: generateId(), name: "", nodes: [newStep("warmup"), newStep("run"), newStep("cooldown")], createdAt: Date.now() });
  const handleSave = async (w: Workout) => { await saveWorkout(w); setEditing(null); };

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3 }}
      style={{ background: "#050505", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button type="button" onClick={editing ? () => setEditing(null) : onBack}
          style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 8 }} aria-label="Back">←</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#d4ff00", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Training</div>
          <div style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 900, fontFamily: "'Oswald', Inter, system-ui, sans-serif" }}>
            {editing ? (editing.name || "New Workout") : "Workouts"}
          </div>
        </div>
        {!editing && (
          <button type="button" onClick={handleNew} style={{
            padding: "7px 14px", borderRadius: 9999, background: "#d4ff00", color: "#000",
            fontWeight: 900, fontSize: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
          }}>＋ New</button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <WorkoutEditorView initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <WorkoutListView onBack={onBack} onNew={handleNew} onEdit={setEditing} onStart={onStartWorkout} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
