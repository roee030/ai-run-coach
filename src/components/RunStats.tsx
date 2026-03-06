/**
 * RunStats — "Command Center" cockpit layout.
 * Timer/Pace hero takes ~40% of screen height.
 * Metric cards use glassmorphism (backdrop-filter: blur).
 */

import { motion } from "framer-motion";
import { formatDistance, formatPace, speedMpsToKmh } from "../utils/geolocation";
import { formatTime } from "../utils/formatting";

interface RunStatsProps {
  elapsedTime: number;
  distance: number;
  currentSpeed: number;
  pace: number;
  isRunning: boolean;
  gpsAcquired: boolean;
  coachMessageType?: string | null;
  coachIsSpeaking?: boolean;
  coachDeviation?: number;
}

export function RunStats({
  elapsedTime,
  distance,
  currentSpeed,
  pace,
  coachMessageType,
  coachDeviation,
}: RunStatsProps) {
  const speedKmh = speedMpsToKmh(currentSpeed);
  const dev = coachDeviation ?? 0;
  const absDev = Math.min(1, Math.abs(dev));
  const pulseDuration = Math.max(0.6, 2 - absDev * 1.4);

  const pacePulsing = coachMessageType === "slow" || coachMessageType === "speed";
  const pacePulseColor =
    coachMessageType === "slow"
      ? "rgba(255,99,71,0.45)"
      : coachMessageType === "speed"
        ? "rgba(250,204,21,0.45)"
        : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center w-full gap-4"
    >
      {/* ── Hero: Timer + Pace (takes ~40% screen height) ── */}
      <div className="w-full grid grid-cols-2 gap-0">
        {/* Timer — left hero cell */}
        <div className="flex flex-col items-center justify-center py-6 px-2">
          <div className="app-label" style={{ color: "var(--text-muted)" }}>
            TIME
          </div>
          <div
            className="app-timer mt-1 leading-none"
            style={{ color: "var(--text-bold)", fontSize: "clamp(52px, 14vw, 88px)" }}
          >
            {formatTime(elapsedTime)}
          </div>
        </div>

        {/* Pace — right hero cell, pulses on coach warnings */}
        <div
          className="flex flex-col items-center justify-center py-6 px-2 rounded-2xl transition-all"
          style={
            pacePulsing
              ? {
                  background: `color-mix(in srgb, ${pacePulseColor} 60%, transparent)`,
                  boxShadow: `0 0 32px ${pacePulseColor}`,
                  animationDuration: `${pulseDuration}s`,
                }
              : undefined
          }
        >
          <div className="app-label" style={{ color: pacePulsing ? "rgba(255,255,255,0.6)" : "var(--text-muted)" }}>
            PACE
          </div>
          <div
            className={`app-timer mt-1 leading-none ${pacePulsing ? "animate-pulse" : ""}`}
            style={{
              color: "var(--brand-primary)",
              fontSize: "clamp(52px, 14vw, 88px)",
            }}
          >
            {formatPace(pace)}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            min/km
          </div>
        </div>
      </div>

      {/* ── Secondary metrics — glassmorphism cards ── */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <GlassCard
          label="Distance"
          value={formatDistance(distance)}
          unit="km"
          highlight
        />
        <GlassCard
          label="Speed"
          value={speedKmh.toFixed(1)}
          unit="km/h"
        />
      </div>
    </motion.div>
  );
}

/* ---- Glassmorphism metric card ----------------------------- */

function GlassCard({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="glass-card p-4 text-center"
    >
      <div className="app-label" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div
        className="mt-2 text-4xl font-black leading-none"
        style={{
          color: highlight ? "var(--brand-primary)" : "var(--text-bold)",
          fontFamily: "'Oswald', Inter, system-ui, sans-serif",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {unit && (
        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {unit}
        </div>
      )}
    </div>
  );
}
