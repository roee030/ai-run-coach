/**
 * RunSummary — post-run summary screen.
 * Shows total distance, time, and avg pace with a "Back to Home" CTA.
 */

import { motion } from "framer-motion";
import { formatDistance, formatPace } from "../utils/geolocation";
import { formatTime } from "../utils/formatting";

interface RunSummaryProps {
  distance: number;
  elapsedTime: number;
  pace: number;
  onHome: () => void;
}

export function RunSummary({ distance, elapsedTime, pace, onHome }: RunSummaryProps) {
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
            "radial-gradient(ellipse 60% 40% at 50% 20%, color-mix(in srgb, var(--brand-primary) 10%, transparent), transparent)",
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full px-6 pt-14 text-center"
      >
        <p
          className="text-xs uppercase tracking-widest font-bold"
          style={{ color: "var(--brand-primary)" }}
        >
          Run Complete
        </p>
        <h1
          className="brand-title text-5xl sm:text-6xl mt-2"
          style={{ color: "var(--text-bold)" }}
        >
          Great work!
        </h1>
      </motion.div>

      {/* Metric cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10 w-full px-6 flex flex-col gap-4 max-w-sm mx-auto"
      >
        {/* Distance — hero */}
        <div
          className="glass-card p-6 text-center"
          style={{ border: "1px solid color-mix(in srgb, var(--brand-primary) 25%, transparent)" }}
        >
          <p className="app-label" style={{ color: "var(--text-muted)" }}>
            Total Distance
          </p>
          <p
            className="mt-2 font-black font-mono tabular-nums leading-none"
            style={{
              fontSize: "clamp(56px, 18vw, 88px)",
              color: "var(--brand-primary)",
              fontFamily: "'Oswald', Inter, system-ui, sans-serif",
            }}
          >
            {formatDistance(distance)}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>km</p>
        </div>

        {/* Time + Pace side-by-side */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 text-center">
            <p className="app-label" style={{ color: "var(--text-muted)" }}>Time</p>
            <p
              className="mt-2 text-3xl font-black font-mono tabular-nums leading-none"
              style={{ color: "var(--text-bold)" }}
            >
              {formatTime(elapsedTime)}
            </p>
          </div>

          <div className="glass-card p-5 text-center">
            <p className="app-label" style={{ color: "var(--text-muted)" }}>Avg Pace</p>
            <p
              className="mt-2 text-3xl font-black font-mono tabular-nums leading-none"
              style={{ color: "var(--text-bold)" }}
            >
              {formatPace(pace)}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>min/km</p>
          </div>
        </div>
      </motion.div>

      {/* Back to Home */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="relative z-10 w-full px-6 pb-14 max-w-sm mx-auto"
      >
        <button
          type="button"
          onClick={onHome}
          style={{
            width: "100%",
            padding: "1.1rem",
            borderRadius: "9999px",
            background: "var(--brand-primary)",
            color: "var(--brand-fg)",
            fontWeight: 900,
            fontSize: "1rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            border: "none",
            boxShadow: "0 0 40px var(--brand-glow)",
            cursor: "pointer",
            fontFamily: "'Oswald', Inter, system-ui, sans-serif",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          Back to Home
        </button>
      </motion.div>
    </div>
  );
}
