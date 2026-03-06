/**
 * Coach decision function (pure)
 *
 * Exposes a single pure function `update` which, given a `RunState`
 * snapshot and a recent list of `RunEvent`s, returns one `CoachIntent`
 * or `null` if no feedback should be given. The function is pure and
 * deterministic — it performs cooldown checks using event timestamps
 * supplied in the `events` array.
 */

import type { RunState, RunEvent, CoachState, CoachIntent } from "./coachTypes";

// Cooldown durations in seconds per intent
const COOLDOWNS: Record<CoachIntent, number> = {
  SLOW_DOWN: 45,
  GREAT_JOB: 90,
  KEEP_GOING: 60,
  RECOVER: 60,
};

// Map high-level coach state to an intent
function stateToIntent(state: CoachState): CoachIntent | null {
  switch (state) {
    case "ENCOURAGING":
      return "KEEP_GOING";
    case "WARNING":
      return "SLOW_DOWN";
    case "PRAISING":
      return "GREAT_JOB";
    case "SILENT":
    default:
      return null;
  }
}

// Determine the dominant coach state from recent events and runState
function decideState(runState: RunState, events: RunEvent[]): CoachState {
  const now = runState.timestamp;

  // Event-driven priority
  const recent = (type: RunEvent["type"], windowSec = 15) =>
    events.some(
      (e) => e.type === type && Math.abs(now - e.timestamp) < windowSec * 1000,
    );

  if (recent("STOPPED", 10)) return "SILENT";
  if (recent("RESUMED", 10)) return "ENCOURAGING"; // welcome back
  if (recent("PACE_DROP", 15)) return "WARNING";
  if (recent("SUSTAINED_FAST_PACE", 20)) return "PRAISING";
  if (recent("UPHILL", 12)) return "ENCOURAGING";

  // Fallback to trend-based decision
  if (runState.trend.pace === "improving") return "PRAISING";
  if (runState.trend.pace === "declining") return "WARNING";

  // Default
  return "ENCOURAGING";
}

// Given an intent, determine which RunEvent types are considered its triggers.
const INTENT_TRIGGER_EVENTS: Record<CoachIntent, RunEvent["type"][]> = {
  SLOW_DOWN: ["PACE_DROP"],
  GREAT_JOB: ["SUSTAINED_FAST_PACE"],
  KEEP_GOING: ["UPHILL", "RESUMED"],
  RECOVER: ["RESUMED"],
};

// Check cooldown by inspecting the events list for last trigger timestamp
function passesCooldown(
  intent: CoachIntent,
  runState: RunState,
  events: RunEvent[],
): boolean {
  const now = runState.timestamp;
  const triggers = INTENT_TRIGGER_EVENTS[intent] || [];
  // If there are no trigger events, allow (e.g., fallback encourages)
  if (triggers.length === 0) return true;

  // Find the most recent trigger event for this intent
  let lastTriggerTs = 0;
  for (const e of events) {
    if (triggers.includes(e.type)) {
      lastTriggerTs = Math.max(lastTriggerTs, e.timestamp);
    }
  }

  if (!lastTriggerTs) return true; // no recent trigger -> allow

  const elapsedSec = (now - lastTriggerTs) / 1000;
  return elapsedSec >= COOLDOWNS[intent];
}

// Public pure API
export function update(
  runState: RunState,
  events: RunEvent[],
): CoachIntent | null {
  // Decide state purely from inputs
  const state = decideState(runState, events);

  // Map to intent
  const intent = stateToIntent(state);

  if (!intent) return null;

  // Check cooldown using provided events history
  if (!passesCooldown(intent, runState, events)) return null;

  return intent;
}

export default { update };
