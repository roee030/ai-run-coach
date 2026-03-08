/**
 * Coaching Module - Public API
 */

// Coach Brain types
export type { RunState, RunEvent, CoachState, CoachIntent } from "./coachTypes";

// Event detection
export { EventDetector } from "./eventDetector";

// Pure decision function
export { update as coachUpdate } from "./coach";

// Narrative memory layer
export { RunNarrative } from "./runNarrative";
export type { RunChapter, NarrativeEvent, NarrativeEventType, NarrativeScoreParams } from "./runNarrative";
