/**
 * Coaching Brain - Type Definitions
 *
 * Core data structures for the running analysis engine
 */

/**
 * Real-time metrics captured during a run
 * Provided by the tracking system every few seconds
 */
export type RunMetrics = {
  timestamp: number; // ms since epoch
  elapsedTimeSec: number; // total elapsed time in seconds
  distanceMeters: number; // total distance in meters
  currentPaceSecPerKm: number; // current pace in seconds per km
  avgPaceSecPerKm: number; // average pace since start
  speedMps: number; // current speed in m/s
  elevationMeters: number; // current elevation in meters
  elevationDeltaLast30s: number; // elevation change in last 30 seconds (meters)
  paceDeltaLast30s: number; // pace change in last 30 seconds (sec/km, may be negative)
};

/**
 * Runner's baseline profile and goals
 * Provided at run start, helps personalize coaching
 */
export type RunnerProfile = {
  level: "beginner" | "intermediate" | "advanced";
  typicalPaceSecPerKm: number; // their normal easy pace (sec/km)
  goal: "easy" | "tempo" | "long" | "interval";
};

/**
 * Detected running state - finite set of meaningful situations
 * Priority order: special states > general states
 */
export type RunState =
  | "START" // First 10 seconds of run
  | "STEADY" // Stable pace, comfortable effort
  | "SPEEDING_UP" // Pace improving, runner getting faster
  | "SLOWING_DOWN" // Pace deteriorating, runner tiring
  | "UPHILL" // Significant elevation gain
  | "DOWNHILL" // Significant elevation loss
  | "FATIGUE" // Pace dropping steadily, effort struggling
  | "STRONG" // Pace faster than typical, strong effort
  | "FINISHING" // Last 20% of run, time to wrap up
  | "STRUGGLING"; // Major pace drop, needs support

/**
 * What the coach should try to accomplish
 * Decision logic for what type of feedback to give
 */
export type CoachingGoal =
  | "maintain" // Keep doing what you're doing
  | "reduce_effort" // You're pushing too hard, back off
  | "increase_effort" // You can do better, push harder
  | "stay_calm" // Don't panic, you're okay
  | "prepare_finish"; // End is near, prepare to finish strong

/**
 * Emotional tone for feedback
 * Informs how the AI should phrase the message
 */
export type CoachingTone =
  | "calm" // Reassuring, measured
  | "motivational" // Energetic, encouraging
  | "supportive" // Empathetic, understanding
  | "cautionary"; // Warning, be careful

/**
 * How soon feedback should be delivered
 * Helps determine cooldown periods
 */
export type CoachingUrgency = "low" | "medium" | "high";

/**
 * The coaching decision produced by the brain
 * Structured output: NOT text, just the decision
 */
export type CoachingIntent = {
  goal: CoachingGoal;
  tone: CoachingTone;
  urgency: CoachingUrgency;
};

/**
 * Final output from the coaching engine
 * Everything the brain has decided, ready for AI/voice layer
 */
export type CoachingOutput = {
  state: RunState; // What's happening
  intent: CoachingIntent; // What to do about it
  confidence: number; // 0–1, how sure we are (based on trend strength)
  reason: string; // Internal explanation, for debugging/logging
  timestamp: number; // When this decision was made
};

/**
 * Internal state for tracking feedback history
 * Used by the cooldown manager to prevent over-talking
 */
export type FeedbackHistory = {
  lastFeedbackTimestamp: number;
  lastIntent: CoachingIntent | null;
  feedbacksSinceStart: number;
};
