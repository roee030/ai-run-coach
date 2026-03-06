/**
 * HomeScreen — "Mission Control"
 * Greeting from localStorage, Today's Plan card, massive sonar-pulse START button, goal chip.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";

interface HomeScreenProps {
  onStartRun: () => void;
  onHistory?: () => void;
}

interface OnboardingData {
  gender?: string;
  fitnessLevel?: string;
  goal?: string;
  weeklyGoal?: string;
  coachStyle?: string;
  easyPace?: string;
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

  const goalChip = [profile.goal, profile.weeklyGoal ? `${profile.weeklyGoal} days/wk` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="app-screen w-full min-h-screen flex flex-col items-center justify-between relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 80%, color-mix(in srgb, var(--brand-primary) 8%, transparent), transparent)",
        }}
      />

      {/* Top bar: greeting + history icon */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full px-6 pt-14 flex items-start justify-between"
      >
        <div>
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {greeting()}
          </p>
          <h1
            className="brand-title text-5xl sm:text-6xl mt-1"
            style={{ color: "var(--text-bold)" }}
          >
            Ready to run?
          </h1>
        </div>

        {/* History icon (placeholder — wired to onHistory when feature lands) */}
        <button
          type="button"
          onClick={onHistory}
          aria-label="Run history"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-mid)",
            color: "var(--text-secondary)",
            fontSize: "1.1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            marginTop: "4px",
          }}
        >
          ≡
        </button>
      </motion.div>

      {/* Today's Plan card + sonar button area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        {/* Today's Plan placeholder card */}
        <div
          className="glass-card px-6 py-4 flex items-center gap-4"
          style={{ minWidth: 260 }}
        >
          <div
            className="text-2xl flex-shrink-0"
            style={{ color: "var(--brand-primary)" }}
          >
            📋
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-widest font-bold"
              style={{ color: "var(--text-muted)" }}
            >
              Today's Plan
            </p>
            <p
              className="text-sm font-black uppercase mt-0.5"
              style={{ color: "var(--text-bold)" }}
            >
              Free Run — No Limits
            </p>
          </div>
        </div>

        {/* Sonar rings + START button */}
        <div className="relative flex items-center justify-center">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 200,
                height: 200,
                border: "2px solid var(--brand-primary)",
                opacity: 0,
              }}
              animate={{
                scale: [1, 2.2 + i * 0.4],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: i * 0.65,
                ease: "easeOut",
              }}
            />
          ))}

          <button
            type="button"
            onClick={onStartRun}
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            <span style={{ fontSize: "2.5rem", lineHeight: 1 }}>▶</span>
            <span>Start</span>
          </button>
        </div>
      </motion.div>

      {/* Goal chip + tagline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
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
        <p
          className="text-xs uppercase tracking-wider text-center"
          style={{ color: "var(--text-muted)" }}
        >
          GPS-powered · AI coach · Real-time metrics
        </p>
      </motion.div>
    </div>
  );
}
