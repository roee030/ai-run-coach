/**
 * HomeScreen — "Mission Control"
 * Header + side drawer menu, sonar START, Command Center (workout list + intent input).
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { Workout } from "../types/workout";
import { STEP_META, isRepeatBlock, flattenWorkout } from "../types/workout";
import { SideDrawer } from "./SideDrawer";

// ─── Menu icon ────────────────────────────────────────────────────────────────

const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface HomeScreenProps {
  onStartRun:            (intent: string) => void;
  onHistory?:            () => void;
  onSettings?:           () => void;
  onOpenWorkoutBuilder?: () => void;
  onStartWorkout?:       (workout: Workout) => void;
  workouts?:             Workout[];
}

interface OnboardingData { goal?: string; weeklyGoal?: string; }

function loadOnboarding(): OnboardingData {
  try { const raw = localStorage.getItem("onboarding"); return raw ? (JSON.parse(raw) as OnboardingData) : {}; }
  catch { return {}; }
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  return "Good evening.";
}

// ─── Workout row (inside Command Center) ─────────────────────────────────────

function WorkoutRow({ workout, onStart }: { workout: Workout; onStart: () => void }) {
  const steps = flattenWorkout(workout);
  const meta  = STEP_META[steps[0]?.stepType ?? "run"];
  const reps  = workout.nodes.filter(isRepeatBlock).reduce((a, n) => isRepeatBlock(n) ? a + n.repeatCount : a, 0);

  return (
    <button
      type="button"
      onClick={onStart}
      className="btn-list-item w-full flex items-center gap-3 px-4 py-3"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        textTransform: "none",
        letterSpacing: "normal",
        fontWeight: "normal",
        borderRadius: 0,
        color: "var(--text-bold)",
        minHeight: 56,
      }}
    >
      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{meta.icon}</span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-sm font-bold truncate" style={{ color: "var(--text-bold)" }}>{workout.name}</span>
        <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {steps.length} steps{reps > 0 ? ` · ×${reps}` : ""}
        </span>
      </span>
      <span
        className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg flex-shrink-0"
        style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}30` }}
      >
        Start
      </span>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomeScreen({
  onStartRun, onHistory, onSettings, onOpenWorkoutBuilder, onStartWorkout, workouts = [],
}: HomeScreenProps) {
  const profile                     = useMemo(() => loadOnboarding(), []);
  const [intent, setIntent]         = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const goalChip = [profile.goal, profile.weeklyGoal ? `${profile.weeklyGoal} days/wk` : null]
    .filter(Boolean).join(" · ");

  return (
    <div
      className="app-screen w-full min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 72%, color-mix(in srgb, var(--brand-primary) 7%, transparent), transparent)" }}
      />

      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSettings={() => onSettings?.()}
        onHistory={() => onHistory?.()}
      />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full px-6 flex items-end justify-between flex-shrink-0"
        style={{ paddingTop: "max(3rem, env(safe-area-inset-top))", paddingBottom: "0.5rem" }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {greeting()}
          </p>
          <h1 className="brand-title text-5xl sm:text-6xl mt-1" style={{ color: "var(--text-bold)" }}>
            Ready to run?
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="btn-outline flex items-center justify-center flex-shrink-0"
          style={{ width: 44, height: 44, borderRadius: "50%", color: "var(--text-secondary)", marginBottom: 4 }}
        >
          <IconMenu />
        </button>
      </motion.div>

      {/* ── Sonar START button ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="relative z-10 flex-1 flex items-center justify-center min-h-0"
        style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
      >
        <div className="relative flex items-center justify-center">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{ width: 160, height: 160, border: "2px solid var(--brand-primary)", opacity: 0 }}
              animate={{ scale: [1, 2.3 + i * 0.4], opacity: [0.4, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.65, ease: "easeOut" }}
            />
          ))}
          <button
            type="button"
            onClick={() => onStartRun(intent)}
            aria-label="Start run"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            onMouseDown={(e)  => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
            onMouseUp={(e)    => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
            style={{
              width: 160, height: 160, borderRadius: "50%",
              background: "var(--brand-primary)", color: "var(--brand-fg)",
              fontSize: "1rem", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase",
              border: "none", cursor: "pointer", position: "relative", zIndex: 1,
              boxShadow: "0 0 50px var(--brand-glow), 0 0 100px color-mix(in srgb, var(--brand-primary) 18%, transparent)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              fontFamily: "'Oswald', Inter, system-ui, sans-serif",
            }}
          >
            <span style={{ fontSize: "2rem", lineHeight: 1 }}>▶</span>
            <span>Start</span>
          </button>
        </div>
      </motion.div>

      {/* ── Command Center ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="relative z-10 w-full px-4 flex-shrink-0"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="glass-card flex flex-col overflow-hidden" style={{ borderRadius: 20 }}>

          {/* Card header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Session Plan
            </span>
            <button
              type="button" onClick={onOpenWorkoutBuilder}
              style={{
                background: "transparent", border: "none", color: "var(--brand-primary)",
                fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                cursor: "pointer", padding: "2px 0",
              }}
            >
              Build ＋
            </button>
          </div>

          {/* Workout list — scrollable */}
          <div className="scrollable-thin" style={{ maxHeight: 180 }}>
            {workouts.length === 0 ? (
              <button
                type="button" onClick={onOpenWorkoutBuilder}
                className="w-full flex items-center gap-3 px-4 py-4"
                style={{
                  background: "transparent", textTransform: "none", letterSpacing: "normal",
                  fontWeight: "normal", borderRadius: 0,
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>＋</span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No workouts yet — build your first structured session
                </span>
              </button>
            ) : (
              workouts.slice(0, 6).map((w) => (
                <WorkoutRow key={w.id} workout={w} onStart={() => onStartWorkout?.(w)} />
              ))
            )}
          </div>

          {/* Intent input — pinned at bottom of card */}
          <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(0,0,0,0.40)", border: "1px solid rgba(255,255,255,0.11)" }}
            >
              <span style={{ color: "var(--brand-primary)", flexShrink: 0, fontSize: "1rem" }}>🎯</span>
              <input
                type="text"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onStartRun(intent); }}
                placeholder="Set a goal — 5 km easy, beat 5:30 pace…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "var(--text-bold)", fontSize: "0.875rem",
                  fontFamily: "Inter, system-ui, sans-serif",
                  caretColor: "var(--brand-primary)", minWidth: 0,
                }}
              />
              <button
                type="button"
                onClick={() => onStartRun(intent)}
                aria-label="Start run"
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "var(--brand-primary)", color: "var(--brand-fg)",
                  border: "none", cursor: "pointer", fontWeight: 900,
                  fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase",
                  fontFamily: "'Oswald', Inter, system-ui, sans-serif",
                  boxShadow: "0 0 16px var(--brand-glow)",
                }}
              >
                GO
              </button>
            </div>

            {/* Goal chip or tagline */}
            {goalChip ? (
              <div className="mt-2.5 flex justify-center">
                <div
                  className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                  style={{
                    background: "color-mix(in srgb, var(--brand-primary) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)",
                    color: "var(--brand-primary)",
                  }}
                >
                  {goalChip}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-center text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                GPS-powered · AI coach · Real-time metrics
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
