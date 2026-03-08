/**
 * RunControls — three-state run lifecycle:
 *   !isRunning          → START button
 *   isRunning + !paused → PAUSE button
 *   paused              → RESUME (neon) + STOP (red) → Finish confirmation modal
 */

import { useState } from "react";
import { createPortal } from "react-dom";
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

      {/* ── Finish Run? confirmation modal — portalled to body to escape motion transforms ── */}
      {createPortal(
        <AnimatePresence>
          {showFinish && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed", inset: 0, zIndex: 9000,
                display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px",
                background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
              }}
            >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20,
                padding: "2rem 1.5rem",
                width: "100%",
                maxWidth: 360,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.5rem",
                textAlign: "center",
              }}
            >
              <div>
                <h2 style={{ color: "#fff", fontSize: "1.6rem", fontWeight: 900, fontFamily: "'Oswald', Inter, system-ui, sans-serif", margin: 0 }}>
                  Finish Run?
                </h2>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", marginTop: 8, marginBottom: 0 }}>
                  Your run will be saved and summarized.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                <button
                  type="button"
                  onClick={() => { setShowFinish(false); onStop(); }}
                  style={{
                    padding: "0.9rem",
                    borderRadius: "9999px",
                    background: "#d4ff00",
                    color: "#000",
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
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    border: "2px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                  }}
                >
                  Keep Going
                </button>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
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
