/\*\*

- COACHING BRAIN - INTEGRATION GUIDE
-
- This file documents how to integrate the coaching engine with the existing
- running app (specifically with useRunTracker hook).
-
- Current Status: LOGIC COMPLETE, ready for AI/voice layer
  \*/

// ============================================================================
// PHASE 1: ACTIVATE COACHING ENGINE IN useRunTracker
// ============================================================================
//
// File: src/hooks/useRunTracker.ts
//
// Add these imports:
//
// import { createCoachingEngine, type RunMetrics, type RunnerProfile } from '../coaching';
//
// In the hook, add:
//
// const coachingEngineRef = useRef<CoachingEngine | null>(null);
// const [coachingOutput, setCoachingOutput] = useState<CoachingOutput | null>(null);
//
// In startRun(), initialize engine:
//
// coachingEngineRef.current = createCoachingEngine();
//
// In the location update callback (where metrics are calculated), add:
//
// if (coachingEngineRef.current && session) {
// const metrics: RunMetrics = {
// timestamp: Date.now(),
// elapsedTimeSec: Math.floor(session.elapsedTime / 1000),
// distanceMeters: session.distance,
// currentPaceSecPerKm: calculateCurrentPace(speedMps, distance, time),
// avgPaceSecPerKm: session.distance > 0
// ? (session.elapsedTime / 1000) / (session.distance / 1000)
// : 0,
// speedMps: speedMps,
// elevationMeters: elevation,
// elevationDeltaLast30s: calculateElevationDelta30s(elevationHistory),
// paceDeltaLast30s: calculatePaceDelta30s(paceHistory),
// };
//
// const runnerProfile: RunnerProfile = {
// level: 'intermediate', // Eventually load from user settings
// typicalPaceSecPerKm: 300, // Eventually load from user settings
// goal: session.goal || 'easy',
// };
//
// const coaching = coachingEngineRef.current.update(metrics, runnerProfile);
// if (coaching) {
// setCoachingOutput(coaching);
// }
// }
//
// Return coachingOutput in the hook's return value:
//
// return {
// ...other fields...,
// coachingOutput,
// };

// ============================================================================
// PHASE 2: UPDATE RunSession TYPE
// ============================================================================
//
// File: src/types/index.ts
//
// Add to RunSession interface:
//
// coachingOutput: CoachingOutput | null;
// coachingHistory: CoachingOutput[]; // Track all coaching decisions

// ============================================================================
// PHASE 3: PASS TO UI (RunTracker container)
// ============================================================================
//
// File: src/components/RunTracker.tsx
//
// Pass coaching data to RunningScreen:
//
// <RunningScreen
// ...existing props...
// coachingOutput={session.coachingOutput}
// coachingHistory={session.coachingHistory}
// />

// ============================================================================
// PHASE 4: OPTIONAL - ADD TO UI (RunningScreen)
// ============================================================================
//
// File: src/components/RunningScreen.tsx
//
// Add to props:
//
// coachingOutput?: CoachingOutput | null;
// coachingHistory?: CoachingOutput[];
//
// Optional: Display coaching state for debugging:
//
// {coachingOutput && (
// <div className="text-sm text-gray-400">
// <p>State: {coachingOutput.state}</p>
// <p>Goal: {coachingOutput.intent.goal}</p>
// </div>
// )}

// ============================================================================
// METRICS CALCULATION HELPERS
// ============================================================================
//
// Add these helper functions to useRunTracker.ts:

import type { LocationPoint } from '../types';

/\*\*

- Calculate current pace (seconds per kilometer)
- Based on instant speed and smoothed over a window
  \*/
  function calculateCurrentPace(speedMps: number, distanceMeters: number, elapsedTimeSec: number): number {
  if (speedMps < 0.1) return Infinity; // Stationary

// Current pace = time per km at current speed
const kmPerSec = speedMps / 1000;
if (kmPerSec < 0.0001) return Infinity;

return 1 / kmPerSec;
}

/\*\*

- Calculate elevation change in last 30 seconds
  \*/
  function calculateElevationDelta30s(
  elevationHistory: Array<{ time: number; elevation: number }>
  ): number {
  if (elevationHistory.length < 2) return 0;

const now = Date.now();
const thirtySecondsAgo = now - 30000;

const recent = elevationHistory.filter(e => e.time >= thirtySecondsAgo);
if (recent.length < 2) return 0;

const oldestRecent = recent[0];
const newestRecent = recent[recent.length - 1];

return newestRecent.elevation - oldestRecent.elevation;
}

/\*\*

- Calculate pace change in last 30 seconds
  \*/
  function calculatePaceDelta30s(
  paceHistory: Array<{ time: number; paceSec: number }>
  ): number {
  if (paceHistory.length < 2) return 0;

const now = Date.now();
const thirtySecondsAgo = now - 30000;

const recent = paceHistory.filter(p => p.time >= thirtySecondsAgo);
if (recent.length < 2) return 0;

const oldestRecent = recent[0];
const newestRecent = recent[recent.length - 1];

return newestRecent.paceSec - oldestRecent.paceSec;
}

// ============================================================================
// PHASE 5: CONNECT TO AI/VOICE LAYER (Future)
// ============================================================================
//
// When you build the AI layer, create a new hook or service:
//
// src/services/coachingVoice.ts
//
// export async function speakCoaching(output: CoachingOutput) {
// // Step 1: Call AI language model
// const message = await generateCoachingMessage({
// state: output.state,
// goal: output.intent.goal,
// tone: output.intent.tone,
// urgency: output.intent.urgency,
// });
//
// // Step 2: Convert to speech
// await playAudio(message);
//
// // Step 3: Log for analytics
// logCoachingEvent(output, message);
// }
//
// Then in RunningScreen or a coach module:
//
// if (coachingOutput) {
// await speakCoaching(coachingOutput);
// }

// ============================================================================
// TESTING THE BRAIN (Without Integration)
// ============================================================================
//
// The coaching module is fully testable standalone:
//
// Import and run examples:
//
// import { runAllExamples } from '../coaching/examples';
//
// Or run individual scenarios:
//
// import {
// scenarioUphillFatigueRun,
// scenarioHitTheWall,
// } from '../coaching/examples';
//
// scenarioHitTheWall();

// ============================================================================
// DEBUGGING
// ============================================================================
//
// Enable logging in useRunTracker:
//
// if (coachingEngineRef.current) {
// const coaching = coachingEngineRef.current.update(metrics, profile);
//  
// if (coaching) {
// console.log('[COACHING]', {
// state: coaching.state,
// intent: coaching.intent,
// confidence: coaching.confidence,
// reason: coaching.reason,
// });
// }
// }
//
// Check cooldown status:
//
// const history = coachingEngineRef.current?.getHistory();
// console.log('Last feedback:', new Date(history.lastFeedbackTimestamp));
// console.log('Feedbacks given:', history.feedbacksSinceStart);

// ============================================================================
// SUMMARY
// ============================================================================
//
// The coaching brain is COMPLETE and ready for integration:
//
// ✅ Detects 10 running states
// ✅ Maps states to coaching intents
// ✅ Manages cooldown/feedback timing
// ✅ Calculates confidence scores
// ✅ Pure, testable functions
// ✅ No UI, no audio, no AI calls (those come next)
//
// Next steps:
// 1. Integrate with useRunTracker (collect metrics)
// 2. Build AI connector (generate natural language)
// 3. Add voice/TTS layer (speak messages)
// 4. Train on runner feedback (improve over time)

export {};
