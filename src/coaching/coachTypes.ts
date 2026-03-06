/**
 * Minimal Coach Brain Types (infrastructure only)
 *
 * This file defines the lightweight RunState used by the coach, the
 * RunEvent types emitted by the event detector, coach states and
 * the high-level coach intents (no text).
 */

export interface RunState {
  timestamp: number; // ms since epoch
  pace: number | null; // seconds per km
  speed: number; // m/s
  distance: number; // meters
  elevationGain: number; // meters (since run start or recent window)
  isMoving: boolean;
  trend: {
    pace: "improving" | "declining" | "stable";
    speed: "up" | "down" | "stable";
  };
}

export type RunEvent =
  | { type: "PACE_DROP"; amount: number; timestamp: number }
  | { type: "SUSTAINED_FAST_PACE"; duration: number; timestamp: number }
  | { type: "STOPPED"; timestamp: number }
  | { type: "RESUMED"; timestamp: number }
  | { type: "UPHILL"; grade: number; timestamp: number };

export type CoachState = "SILENT" | "ENCOURAGING" | "WARNING" | "PRAISING";

export type CoachIntent = "SLOW_DOWN" | "KEEP_GOING" | "GREAT_JOB" | "RECOVER";
