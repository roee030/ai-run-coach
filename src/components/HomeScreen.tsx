/**
 * HomeScreen — "Mission Control"
 * Greeting, session-intent input, sonar-pulse START, goal chip.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface HomeScreenProps {
  onStartRun: (intent: string) => void;
  onHistory?: () => void;
}

interface OnboardingData {
  goal?: string;
  weeklyGoal?: string;
}

function loadOnboarding(): OnboardingData {
  try {
    const raw = localStorage.getItem("onboarding");
    return raw ? (JSON.parse(raw) as OnboardingData) : {};
  } catch {
    return {};
  }
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 17) return "Good afternoon.";
  return "Good evening.";
}

export function HomeScreen({ onStartRun, onHistory }: HomeScreenProps) {
  const profile = useMemo(() => loadOnboarding(), []);
  const [sessionIntent, setSessionIntent] = useState("");

  const goalChip = [profile.goal, profile.weeklyGoal ? `${profile.weeklyGoal} days/wk` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="app-screen w-full min-h-screen flex flex-col items-center justify-between relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 80%, color-mix(in srgb, var(--brand-primary) 8%, transparent), transparent)",
        }}
      />

      {/* ── Top bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full px-6 pt-14 flex items-start justify-between"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            {greeting()}
          </p>
          <h1 className="brand-title text-5xl sm:text-6xl mt-1" style={{ color: "var(--text-bold)" }}>
            Ready to run?
          </h1>
        </div>

        <button
          type="button"
          onClick={onHistory}
          aria-label="Run history"
          className="btn-outline"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            fontSize: "1.1rem",
            flexShrink: 0,
            marginTop: "4px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-mid)",
            color: "var(--text-secondary)",
          }}
        >
          ≡
        </button>
      </motion.div>

      {/* ── Centre: intent input + sonar button ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="relative z-10 flex flex-col items-center gap-8 w-full px-6"
      >
        {/* Session intent input */}
        <div style={{ width: "100%", maxWidth: 340 }}>
          <label
            htmlFor="session-intent"
            className="block text-xs uppercase tracking-widest font-bold mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            What's your goal for today's run?
          </label>
          <div
            className="glass-card flex items-center gap-3 px-4 py-3"
            style={{ borderRadius: "14px" }}
          >
            <span style={{ color: "var(--brand-primary)", fontSize: "1rem", flexShrink: 0 }}>🎯</span>
            <input
              id="session-intent"
              type="text"
              value={sessionIntent}
              onChange={(e) => setSessionIntent(e.target.value)}
              placeholder="e.g., 5km easy, beat 5:30 pace..."
              maxLength={120}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-bold)",
                fontSize: "0.875rem",
                fontFamily: "Inter, system-ui, sans-serif",
                caretColor: "var(--brand-primary)",
                minWidth: 0,
              }}
            />
          </div>
        </div>

        {/* Extra breathing room between input and button */}
        <div style={{ height: 16 }} />

        {/* Sonar rings + START button */}
        <div className="relative flex items-center justify-center">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{ width: 200, height: 200, border: "2px solid var(--brand-primary)", opacity: 0 }}
              animate={{ scale: [1, 2.2 + i * 0.4], opacity: [0.45, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.65, ease: "easeOut" }}
            />
          ))}

          <button
            type="button"
            onClick={() => onStartRun(sessionIntent)}
            aria-label="Start run"
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "var(--brand-primary)",
              color: "var(--brand-fg)",
              fontSize: "1.1rem",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "none",
              boxShadow: "0 0 60px var(--brand-glow), 0 0 120px color-mix(in srgb, var(--brand-primary) 20%, transparent)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              cursor: "pointer",
              position: "relative",
              zIndex: 1,
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              fontFamily: "'Oswald', Inter, system-ui, sans-serif",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            onMouseDown={(e)  => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
            onMouseUp={(e)    => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
          >
            <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>▶</span>
            <span>Start</span>
          </button>
        </div>
      </motion.div>

      {/* ── Bottom: goal chip + tagline ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="relative z-10 w-full px-6 pb-14 flex flex-col items-center gap-3"
      >
        {goalChip ? (
          <div
            className="px-5 py-2 rounded-full text-sm font-bold uppercase tracking-widest"
            style={{
              background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)",
              color: "var(--brand-primary)",
            }}
          >
            {goalChip}
          </div>
        ) : null}
        <p className="text-xs uppercase tracking-wider text-center" style={{ color: "var(--text-muted)" }}>
          GPS-powered · AI coach · Real-time metrics
        </p>
      </motion.div>
    </div>
  );
}
