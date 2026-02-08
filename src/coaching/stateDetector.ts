/**
 * Coaching Brain - State Detection
 *
 * Pure function that analyzes RunMetrics and determines the current RunState
 * All detection rules are deterministic and explainable
 */

import type { RunMetrics, RunnerProfile, RunState } from "./types";

/**
 * Detects the current running state based on metrics and profile
 *
 * State Priority (checked in order):
 * 1. START (first 10 seconds)
 * 2. FATIGUE or STRUGGLING (pace dropping significantly)
 * 3. UPHILL / DOWNHILL (elevation change overrides pace)
 * 4. SPEEDING_UP / STRONG (pace improving or high)
 * 5. SLOWING_DOWN (pace deteriorating slightly)
 * 6. FINISHING (near end)
 * 7. STEADY (default stable state)
 */
export function detectRunState(
  metrics: RunMetrics,
  profile: RunnerProfile,
): RunState {
  // Priority 1: START - first 10 seconds of run
  if (metrics.elapsedTimeSec < 10) {
    return "START";
  }

  // Priority 2a: FATIGUE - sustained pace drop with high elapsed time
  // Defined as: average pace 15%+ slower than typical, and deteriorating
  const paceDegradationPercent =
    ((metrics.avgPaceSecPerKm - profile.typicalPaceSecPerKm) /
      profile.typicalPaceSecPerKm) *
    100;

  if (
    paceDegradationPercent > 15 &&
    metrics.paceDeltaLast30s > 2 &&
    metrics.elapsedTimeSec > 120
  ) {
    return "FATIGUE";
  }

  // Priority 2b: STRUGGLING - major pace collapse
  // Defined as: current pace 25%+ slower than typical, or pace dropped >5 sec/km in 30s
  const currentPaceDegradationPercent =
    ((metrics.currentPaceSecPerKm - profile.typicalPaceSecPerKm) /
      profile.typicalPaceSecPerKm) *
    100;

  if (
    currentPaceDegradationPercent > 25 ||
    metrics.paceDeltaLast30s > 5 ||
    metrics.speedMps < 2.5 // Less than 9 km/h
  ) {
    return "STRUGGLING";
  }

  // Priority 3a: UPHILL - significant sustained elevation gain
  // Defined as: elevation gaining >0.5m per second over last 30s
  if (metrics.elevationDeltaLast30s > 15) {
    return "UPHILL";
  }

  // Priority 3b: DOWNHILL - significant elevation loss
  // Defined as: elevation dropping >0.5m per second over last 30s
  if (metrics.elevationDeltaLast30s < -15) {
    return "DOWNHILL";
  }

  // Priority 4a: SPEEDING_UP - pace improving consistently
  // Defined as: pace faster than avg, and getting faster (delta negative)
  if (
    metrics.currentPaceSecPerKm < metrics.avgPaceSecPerKm &&
    metrics.paceDeltaLast30s < -1
  ) {
    return "SPEEDING_UP";
  }

  // Priority 4b: STRONG - running significantly faster than typical
  // Defined as: current pace 10%+ faster than typical
  if (currentPaceDegradationPercent < -10 && metrics.speedMps > 5) {
    return "STRONG";
  }

  // Priority 5: SLOWING_DOWN - pace deteriorating but not critical
  // Defined as: pace slightly slower than avg and getting worse (delta positive)
  if (
    metrics.currentPaceSecPerKm > metrics.avgPaceSecPerKm &&
    metrics.paceDeltaLast30s > 0.5
  ) {
    return "SLOWING_DOWN";
  }

  // Priority 6: FINISHING - in final 15 minutes OR final 2km of a longer run
  // (For now, we detect based on pace + duration; actual end distance needs run goal info)
  // Heuristic: if running steady for >20min and maintaining pace, assume possible finish
  if (
    metrics.elapsedTimeSec > 30 &&
    Math.abs(metrics.paceDeltaLast30s) < 1 &&
    Math.abs(currentPaceDegradationPercent) < 10
  ) {
    // Could transition to FINISHING if run duration suggests it's nearing end
    // For now, we'll leave this to a higher-level system that knows the target
    // This rule activates if we need to suggest a strong finish
  }

  // Priority 7: STEADY - stable, comfortable state (default)
  return "STEADY";
}

/**
 * Helper: Calculate how far off target pace the runner is
 */
export function getPaceDeviation(
  currentPace: number,
  targetPace: number,
): number {
  return ((currentPace - targetPace) / targetPace) * 100;
}

/**
 * Helper: Determine effort level based on speed
 */
export function getEffortLevel(speedMps: number): "easy" | "moderate" | "hard" {
  // Easy: <4 m/s (14.4 km/h)
  // Moderate: 4–5.5 m/s (14.4–19.8 km/h)
  // Hard: >5.5 m/s (19.8 km/h)
  if (speedMps < 4) return "easy";
  if (speedMps < 5.5) return "moderate";
  return "hard";
}
