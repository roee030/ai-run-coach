/**
 * RunningScreen — "Cockpit" layout.
 * Dark brand background. Map is a contained card.
 * Metrics perfectly centred. Back button at z-50.
 */

import { useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RunStats } from "./RunStats";
import { RunControls } from "./RunControls";
import { MapTracker } from "./MapTracker";

interface RunningScreenProps {
  onBack: () => void;
  elapsedTime: number;
  distance: number;
  pace: number;
  currentSpeed: number;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  gpsAcquired: boolean;
  error: string | null;
  lastLocation: any;
  locations: any[];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  coachMessage?: string | null;
  coachIsSpeaking?: boolean;
  coachMessageType?: string | null;
  coachDeviation?: number;
  isCoachSatisfied?: boolean;
  workoutHud?: ReactNode;
}

export function RunningScreen({
  onBack,
  elapsedTime,
  distance,
  pace,
  currentSpeed,
  isRunning,
  isPaused,
  isFinished,
  gpsAcquired,
  error,
  lastLocation,
  locations,
  onStart,
  onPause,
  onResume,
  onStop,
  coachMessageType,
  coachIsSpeaking,
  coachDeviation,
  isCoachSatisfied,
  workoutHud,
}: RunningScreenProps) {
  const [showQuit, setShowQuit] = useState(false);

  const handleBackClick = () => {
    if (isRunning || isPaused) {
      setShowQuit(true);
    } else {
      onBack();
    }
  };

  return (
    <div
      className="w-full min-h-screen flex flex-col"
      style={{ background: "var(--bg-base)", color: "var(--text-bold)" }}
    >
      {/* ── Header — always on top ── */}
      <div
        className="flex items-center px-4"
        style={{
          paddingTop: "max(3rem, env(safe-area-inset-top))",
          paddingBottom: "0.75rem",
          position: "relative",
          zIndex: 50,
        }}
      >
        {/* Left: back button */}
        <button
          type="button"
          onClick={handleBackClick}
          aria-label="Back"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-mid)",
            color: "var(--brand-primary)",
            fontSize: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            position: "relative",
            zIndex: 50,
          }}
        >
          ←
        </button>

        {/* Center: absolutely positioned so it's always truly centred */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {isRunning && !isPaused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{
                background: "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--brand-primary) 35%, transparent)",
              }}
            >
              <span
                className="inline-flex h-2 w-2 rounded-full animate-pulse"
                style={{ background: "var(--brand-primary)" }}
              />
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: "var(--brand-primary)" }}
              >
                Live
              </span>
            </motion.div>
          )}

          {isPaused && (
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-mid)",
              }}
            >
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Paused
              </span>
            </div>
          )}
        </div>

        {/* Right: Flow badge or fixed-width spacer to keep back button left-anchored */}
        <div style={{ marginLeft: "auto", width: 44, display: "flex", justifyContent: "flex-end" }}>
          {isCoachSatisfied && isRunning && !isPaused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "color-mix(in srgb, #4ade80 10%, transparent)",
                border: "1px solid color-mix(in srgb, #4ade80 25%, transparent)",
                whiteSpace: "nowrap",
              }}
              title="Coach is satisfied — you are running perfectly."
            >
              <span style={{ fontSize: 13 }}>😌</span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4ade80" }}>
                Flow
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-5 pb-4">
        {workoutHud}
        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.45)", color: "white" }}
          >
            {error}
          </div>
        )}

        {/* Metrics */}
        <RunStats
          elapsedTime={elapsedTime}
          distance={distance}
          currentSpeed={currentSpeed}
          pace={pace}
          isRunning={isRunning}
          gpsAcquired={gpsAcquired}
          coachMessageType={coachMessageType}
          coachIsSpeaking={coachIsSpeaking}
          coachDeviation={coachDeviation}
        />

        {/* Map — contained card */}
        <div
          className="w-full overflow-hidden"
          style={{
            borderRadius: "20px",
            height: 220,
            border: "1px solid var(--border-mid)",
            flexShrink: 0,
          }}
        >
          <MapTracker
            lastLocation={lastLocation}
            isRunning={isRunning}
            locations={locations}
            isSummary={!isRunning && isFinished}
          />
        </div>
      </div>

      {/* ── Controls — pinned to bottom ── */}
      <div
        className="px-4"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <RunControls
          isRunning={isRunning}
          isPaused={isPaused}
          error={error}
          onStart={onStart}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
        />
      </div>

      {/* ── Quit confirmation overlay ── */}
      <AnimatePresence>
        {showQuit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(10px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass-card w-full flex flex-col items-center gap-6 text-center"
              style={{ maxWidth: 320, padding: "2rem" }}
            >
              <div>
                <h2 className="brand-title text-3xl" style={{ color: "var(--text-bold)" }}>
                  Quit Run?
                </h2>
                <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                  Your progress will not be saved.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowQuit(false)}
                  style={{
                    padding: "0.9rem",
                    background: "var(--brand-primary)",
                    color: "var(--brand-fg)",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    letterSpacing: "0.08em",
                    border: "none",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    fontFamily: "'Oswald', Inter, system-ui, sans-serif",
                  }}
                >
                  Keep Running
                </button>
                <button
                  type="button"
                  onClick={() => { setShowQuit(false); onBack(); }}
                  style={{
                    padding: "0.9rem",
                    background: "transparent",
                    color: "var(--danger)",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    letterSpacing: "0.08em",
                    border: "2px solid var(--danger)",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    fontFamily: "'Oswald', Inter, system-ui, sans-serif",
                  }}
                >
                  Quit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
