/**
 * Coaching Module - Public API
 *
 * Export all public types and functions for the rest of the app
 */

// Types
export type {
  RunMetrics,
  RunnerProfile,
  RunState,
  CoachingGoal,
  CoachingTone,
  CoachingUrgency,
  CoachingIntent,
  CoachingOutput,
  FeedbackHistory,
} from "./types";

// State Detection
export {
  detectRunState,
  getPaceDeviation,
  getEffortLevel,
} from "./stateDetector";

// Intent Mapping
export {
  mapStateToIntent,
  getIntentReason,
  COOLDOWN_BY_URGENCY,
  shouldSuppressDuplicateFeedback,
} from "./intentMapper";

// Main Engine
export { CoachingEngine, createCoachingEngine } from "./coachingEngine";
