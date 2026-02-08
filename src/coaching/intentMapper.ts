/**
 * Coaching Brain - Intent Mapper
 *
 * Maps RunState → CoachingIntent
 * This is the CORE decision logic:
 * What feedback goal and tone should we use for each situation?
 */

import type { RunState, CoachingIntent } from "./types";

/**
 * Maps a detected run state to the coaching intent
 *
 * This is where we decide WHAT the coach should try to accomplish
 * NOT what the coach should SAY (that comes later from AI/templates)
 */
export function mapStateToIntent(state: RunState): CoachingIntent {
  switch (state) {
    // ════════════════════════════════════════════════════════════
    // START - Welcome the runner, set expectations
    // ════════════════════════════════════════════════════════════
    case "START":
      return {
        goal: "maintain",
        tone: "motivational",
        urgency: "low",
      };

    // ════════════════════════════════════════════════════════════
    // STEADY - They're doing great, just maintain it
    // ════════════════════════════════════════════════════════════
    case "STEADY":
      return {
        goal: "maintain",
        tone: "calm",
        urgency: "low",
      };

    // ════════════════════════════════════════════════════════════
    // SPEEDING_UP - Great! Keep the momentum but be smart
    // ════════════════════════════════════════════════════════════
    case "SPEEDING_UP":
      return {
        goal: "maintain",
        tone: "motivational",
        urgency: "low",
      };

    // ════════════════════════════════════════════════════════════
    // STRONG - Running fast and strong! Keep it up
    // ════════════════════════════════════════════════════════════
    case "STRONG":
      return {
        goal: "maintain",
        tone: "motivational",
        urgency: "medium",
      };

    // ════════════════════════════════════════════════════════════
    // SLOWING_DOWN - Pace is drifting, gently encourage hold
    // ════════════════════════════════════════════════════════════
    case "SLOWING_DOWN":
      return {
        goal: "maintain",
        tone: "supportive",
        urgency: "low",
      };

    // ════════════════════════════════════════════════════════════
    // UPHILL - Acknowledge the challenge, remind them to manage effort
    // ════════════════════════════════════════════════════════════
    case "UPHILL":
      return {
        goal: "reduce_effort", // Don't go too hard up the hill
        tone: "supportive",
        urgency: "medium",
      };

    // ════════════════════════════════════════════════════════════
    // DOWNHILL - Encourage, remind to control descent
    // ════════════════════════════════════════════════════════════
    case "DOWNHILL":
      return {
        goal: "maintain",
        tone: "calm",
        urgency: "low",
      };

    // ════════════════════════════════════════════════════════════
    // FATIGUE - They're tiring over time. Be empathetic, normalize it
    // ════════════════════════════════════════════════════════════
    case "FATIGUE":
      return {
        goal: "stay_calm",
        tone: "supportive",
        urgency: "high",
      };

    // ════════════════════════════════════════════════════════════
    // STRUGGLING - Major difficulty. Priority 1: keep them moving
    // ════════════════════════════════════════════════════════════
    case "STRUGGLING":
      return {
        goal: "stay_calm",
        tone: "supportive",
        urgency: "high",
      };

    // ════════════════════════════════════════════════════════════
    // FINISHING - They can see the end. Motivate hard finish
    // ════════════════════════════════════════════════════════════
    case "FINISHING":
      return {
        goal: "prepare_finish",
        tone: "motivational",
        urgency: "high",
      };

    default:
      // Fallback: maintain steady state if unknown
      return {
        goal: "maintain",
        tone: "calm",
        urgency: "low",
      };
  }
}

/**
 * Explains why we're giving this intent
 * For logging/debugging to understand the coaching decision
 */
export function getIntentReason(state: RunState): string {
  switch (state) {
    case "START":
      return "Run has just started";
    case "STEADY":
      return "Pace is stable and sustainable";
    case "SPEEDING_UP":
      return "Pace improving, momentum building";
    case "STRONG":
      return "Running significantly faster than typical";
    case "SLOWING_DOWN":
      return "Pace deteriorating, needs encouragement";
    case "UPHILL":
      return "Elevation gain detected";
    case "DOWNHILL":
      return "Elevation loss detected";
    case "FATIGUE":
      return "Sustained pace degradation over time";
    case "STRUGGLING":
      return "Major pace collapse, needs immediate support";
    case "FINISHING":
      return "Run nearing end, prepare to finish";
    default:
      return "Unknown state";
  }
}

/**
 * Default cooldown intervals (in seconds)
 * How long to wait before giving feedback of the same type again
 *
 * High urgency: shorter cooldown (get message through faster)
 * Low urgency: longer cooldown (don't over-talk)
 */
export const COOLDOWN_BY_URGENCY = {
  high: 30, // Critical feedback: give quickly
  medium: 45, // Important: brief pause
  low: 60, // Nice-to-have: longer pause to let them focus
};

/**
 * Should we interrupt with feedback?
 * Even if cooldown is ready, don't repeat the exact same intent back-to-back
 *
 * This prevents: "slow down... slow down... slow down..."
 */
export function shouldSuppressDuplicateFeedback(
  lastIntent: CoachingIntent | null,
  currentIntent: CoachingIntent,
): boolean {
  if (!lastIntent) return false;

  // If goals are different, definitely give feedback
  if (lastIntent.goal !== currentIntent.goal) return false;

  // If goals are the same but tone is different, give feedback
  // (keeps coaching varied even with same goal)
  if (lastIntent.tone !== currentIntent.tone) return false;

  // Same goal AND same tone = suppress to avoid repetition
  return true;
}
