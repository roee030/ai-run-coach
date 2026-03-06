/**
 * RunControls — three-state run lifecycle:
 *   !isRunning          → START button
 *   isRunning + !paused → PAUSE button
 *   paused              → RESUME (neon) + STOP (red) → Finish confirmation modal
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RunControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  error: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function RunControls({
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
}: RunControlsProps) {
  const [showFinish, setShowFinish] = useState(false);

  return (
    <>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex gap-4 items-center justify-center w-full"
      >
        {/* Not started → START */}
        {!isRunning && !isPaused && (
          <Btn
            onClick={onStart}
            size={120}
            label="▶"
            sublabel="Start"
            variant="brand"
          />
        )}

        {/* Running → PAUSE */}
        {isRunning && !isPaused && (
          <Btn
            onClick={onPause}
            size={100}
            label="⏸"
            sublabel="Pause"
            variant="brand"
          />
        )}

        {/* Paused → RESUME + STOP */}
        {isPaused && (
          <>
            <Btn
              onClick={onResume}
              size={100}
              label="▶"
              sublabel="Resume"
              variant="brand"
            />
            <Btn
              onClick={() => setShowFinish(true)}
              size={80}
              label="■"
              sublabel="Stop"
              variant="danger"
            />
          </>
        )}
      </motion.div>

      {/* ── Finish Run? confirmation modal ── */}
      <AnimatePresence>
        {showFinish && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)" }}
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
                  Finish Run?
                </h2>
                <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                  Your run will be saved and summarised.
                </p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setShowFinish(false);
                    onStop();
                  }}
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
                    fontFamily: "'Oswald', Inter, system-ui, sans-serif",
                  }}
                >
                  Yes, Finish
                </button>
                <button
                  type="button"
                  onClick={() => setShowFinish(false)}
                  style={{
                    padding: "0.9rem",
                    borderRadius: "9999px",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    border: "2px solid var(--border-mid)",
                    cursor: "pointer",
                  }}
                >
                  Keep Going
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---- Circular action button ---- */
function Btn({
  onClick,
  size,
  label,
  sublabel,
  variant,
}: {
  onClick: () => void;
  size: number;
  label: string;
  sublabel: string;
  variant: "brand" | "danger";
}) {
  const isBrand = variant === "brand";
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        aria-label={sublabel}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: isBrand ? "var(--brand-primary)" : "rgba(239,68,68,0.15)",
          color: isBrand ? "var(--brand-fg)" : "var(--danger)",
          border: isBrand ? "none" : "2px solid var(--danger)",
          boxShadow: isBrand
            ? "0 0 40px var(--brand-glow)"
            : "0 0 24px var(--danger-glow)",
          fontSize: size >= 100 ? "1.8rem" : "1.3rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
          fontFamily: "'Oswald', Inter, system-ui, sans-serif",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
        }}
      >
        {label}
      </button>
      <span
        className="text-xs font-bold uppercase tracking-widest"
        style={{ color: isBrand ? "var(--brand-primary)" : "var(--danger)" }}
      >
        {sublabel}
      </span>
    </div>
  );
}
