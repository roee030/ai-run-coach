/**
 * RunningScreen — "Command Center"
 * Map fills the full background; stats + controls float over it.
 */

import { useState } from "react";
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
    <div className="app-screen w-full min-h-screen relative overflow-hidden">
      {/* ── Full-bleed map background ── */}
      <div className="absolute inset-0 z-0">
        <MapTracker
          lastLocation={lastLocation}
          isRunning={isRunning}
          locations={locations}
          isSummary={!isRunning && isFinished}
        />
      </div>

      {/* Gradient scrim: bottom two-thirds darkened so stats are readable */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.15) 100%)",
        }}
      />

      {/* ── Header bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3"
      >
        <button
          type="button"
          onClick={handleBackClick}
          aria-label="Back"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "var(--brand-primary)",
            fontSize: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          ←
        </button>

        {isRunning && !isPaused && (
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)",
              border: "1px solid color-mix(in srgb, var(--brand-primary) 30%, transparent)",
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
          </div>
        )}

        {isPaused && (
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-white/60">
              Paused
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Stats + controls floating panel ── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-4"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-lg mx-auto flex flex-col gap-4">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.5)" }}
            >
              {error}
            </motion.div>
          )}

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
      </div>

      {/* ── Quit confirmation overlay ── */}
      <AnimatePresence>
        {showQuit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 w-full max-w-sm flex flex-col items-center gap-6 text-center"
            >
              <div>
                <h2
                  className="brand-title text-3xl"
                  style={{ color: "var(--text-bold)" }}
                >
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
                    borderRadius: "9999px",
                    background: "var(--brand-primary)",
                    color: "var(--brand-fg)",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Keep Running
                </button>
                <button
                  type="button"
                  onClick={() => { setShowQuit(false); onBack(); }}
                  style={{
                    padding: "0.9rem",
                    borderRadius: "9999px",
                    background: "transparent",
                    color: "var(--danger)",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    border: "2px solid var(--danger)",
                    cursor: "pointer",
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
