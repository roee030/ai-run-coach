# Coaching Brain - Running Analysis Engine

## Overview

The coaching brain is a **logic-only** decision engine that:

1. **Analyzes** real-time running metrics
2. **Detects** meaningful running states
3. **Decides** what coaching feedback is appropriate
4. **Outputs** structured coaching instructions (NOT text)

This brain is designed to be connected later to:

- **Voice System** (TTS) to speak feedback aloud
- **AI Language Model** (GPT) to generate natural language
- **Telemetry** to log coaching decisions

## Architecture

### Module Structure

```
src/coaching/
├── types.ts              # All type definitions
├── stateDetector.ts      # State detection logic
├── intentMapper.ts       # State → Intent mapping
├── coachingEngine.ts     # Main engine + cooldown
└── index.ts              # Public API
```

### Data Flow

```
RunMetrics + RunnerProfile
        ↓
    [detectRunState]
        ↓
    RunState
        ↓
   [mapStateToIntent]
        ↓
   CoachingIntent
        ↓
  [cooldownCheck]
        ↓
 CoachingOutput (or null if cooldown active)
```

## Core Concepts

### 1. RunMetrics

Real-time data captured every 2-5 seconds during a run:

```typescript
type RunMetrics = {
  timestamp: number; // When this sample was taken
  elapsedTimeSec: number; // Total elapsed time (0 to runtime)
  distanceMeters: number; // Total distance covered
  currentPaceSecPerKm: number; // How fast RIGHT NOW
  avgPaceSecPerKm: number; // Overall average pace
  speedMps: number; // Current speed m/s
  elevationMeters: number; // Current altitude
  elevationDeltaLast30s: number; // How much elevation changed recently
  paceDeltaLast30s: number; // How pace changed recently
};
```

### 2. RunnerProfile

Runner's baseline and goals (set at run start):

```typescript
type RunnerProfile = {
  level: "beginner" | "intermediate" | "advanced";
  typicalPaceSecPerKm: number; // Their easy pace baseline
  goal: "easy" | "tempo" | "long" | "interval";
};
```

### 3. RunState

The brain detects **10 distinct running states**:

| State            | Meaning               | Detection Rule                      |
| ---------------- | --------------------- | ----------------------------------- |
| **START**        | First 10 seconds      | `elapsedTime < 10s`                 |
| **STEADY**       | Comfortable, stable   | Pace ≈ average, low variation       |
| **SPEEDING_UP**  | Getting faster        | Pace improving, delta < -1          |
| **STRONG**       | Running fast & strong | Pace 10%+ faster than typical       |
| **SLOWING_DOWN** | Pace drifting down    | Pace > average, delta > 0.5         |
| **UPHILL**       | Elevation gain        | `elevationDelta > 15m/30s`          |
| **DOWNHILL**     | Elevation loss        | `elevationDelta < -15m/30s`         |
| **FATIGUE**      | Tiring over time      | Pace 15%+ slower, sustained         |
| **STRUGGLING**   | Major difficulty      | Pace 25%+ slower or speed < 2.5 m/s |
| **FINISHING**    | Final stretch         | Needs run goal to detect            |

**Priority Order**: Special states (FATIGUE, UPHILL) override general states (STEADY)

### 4. CoachingIntent

What the coach should try to accomplish:

```typescript
type CoachingIntent = {
  goal:
    | "maintain" // Keep doing what you're doing
    | "reduce_effort" // You're pushing too hard
    | "increase_effort" // You can do better
    | "stay_calm" // Don't panic, you're okay
    | "prepare_finish"; // Time to finish strong

  tone:
    | "calm" // Reassuring, measured
    | "motivational" // Energetic, encouraging
    | "supportive" // Empathetic, understanding
    | "cautionary"; // Warning, be careful

  urgency:
    | "low" // Can wait
    | "medium" // Soon
    | "high"; // Now!
};
```

### 5. CoachingOutput

**Structured decision** ready for AI/voice layers (NOT text):

```typescript
type CoachingOutput = {
  state: RunState; // What detected?
  intent: CoachingIntent; // What to do?
  confidence: number; // 0–1 confidence
  reason: string; // Internal explanation
  timestamp: number; // When decided
};
```

**Example Output:**

```json
{
  "state": "FATIGUE",
  "intent": {
    "goal": "stay_calm",
    "tone": "supportive",
    "urgency": "high"
  },
  "confidence": 0.87,
  "reason": "Sustained pace degradation over time",
  "timestamp": 1707473129456
}
```

## State→Intent Mapping

This is the **core decision logic**:

| State        | Intent Goal    | Tone         | Urgency  |
| ------------ | -------------- | ------------ | -------- |
| START        | maintain       | motivational | low      |
| STEADY       | maintain       | calm         | low      |
| SPEEDING_UP  | maintain       | motivational | low      |
| STRONG       | maintain       | motivational | medium   |
| SLOWING_DOWN | maintain       | supportive   | low      |
| UPHILL       | reduce_effort  | supportive   | medium   |
| DOWNHILL     | maintain       | calm         | low      |
| FATIGUE      | stay_calm      | supportive   | **high** |
| STRUGGLING   | stay_calm      | supportive   | **high** |
| FINISHING    | prepare_finish | motivational | **high** |

## Cooldown System

Prevents over-talking by enforcing minimum delays between feedbacks:

```typescript
const COOLDOWN_BY_URGENCY = {
  high: 30, // Critical: repeat quickly if needed
  medium: 45, // Important: brief pause
  low: 60, // Nice-to-have: longer pause
};
```

**Rules:**

1. Respect cooldown timer (e.g., 60s before next feedback)
2. Don't repeat the same intent twice in a row
3. Higher urgency = shorter cooldown

**Example:**

```
t=0s:   Feedback: "Stay calm, you've got this" [urgency: high]
t=20s:  No feedback (cooldown: 30s)
t=35s:  Check again... if same intent, suppress
        else if new intent, allow
t=65s:  Always allow (cooldown expired)
```

## Integration Guide

### 1. Create Engine (once at run start)

```typescript
import { createCoachingEngine } from "../coaching";

const coachingEngine = createCoachingEngine();
```

### 2. Update Each Cycle (every 2-5 seconds)

```typescript
// In your hook or component update cycle:
const coachingOutput = coachingEngine.update(currentMetrics, runnerProfile);

if (coachingOutput) {
  // New feedback ready!
  console.log(`Coaching: ${coachingOutput.state}`);
  console.log(`Intent: ${coachingOutput.intent.goal}`);
  console.log(`Confidence: ${coachingOutput.confidence}`);

  // Pass to AI/voice layer (next phase)
  // await speakCoaching(coachingOutput);
  // await generateMessage(coachingOutput);
} else {
  // In cooldown or suppressed, no feedback right now
}
```

### 3. Reset on New Run

```typescript
function startNewRun() {
  coachingEngine.reset();
  // ... other run setup
}
```

## Example Scenarios

### Scenario 1: Runner starts strong but tires

```
t=5s:   State: START
        Intent: maintain + motivational
        → "Let's go!"

t=45s:  State: STEADY
        Intent: maintain + calm
        → (no feedback, in cooldown)

t=120s: State: SLOWING_DOWN
        Intent: maintain + supportive
        → "Great effort, keep it steady"

t=200s: State: FATIGUE
        Intent: stay_calm + supportive
        Confidence: 0.87
        → "You're doing great, just keep moving"
```

### Scenario 2: Hilly terrain

```
t=30s:  State: UPHILL
        Intent: reduce_effort + supportive
        → "Lean into the hill, smart pace"

t=60s:  (Still UPHILL, but in cooldown... no feedback)

t=90s:  State: STEADY (crested hill)
        Intent: maintain + calm
        → (in cooldown from UPHILL, suppress)

t=150s: State: DOWNHILL
        Intent: maintain + calm
        → "Controlled descent, nice form"
```

### Scenario 3: Runner struggling

```
t=300s: State: STRUGGLING
        Intent: stay_calm + supportive
        Confidence: 0.92
        Urgency: HIGH
        → Priority! Deliver within 2-3s

t=305s: Still STRUGGLING
        → Check duplicate suppression
        → If feedback necessary, deliver again soon
```

## Confidence Scoring

Confidence (0–1) indicates how sure the brain is:

- **0.95–1.0**: Clear signal (elevation change, clear pace trend)
- **0.8–0.95**: Strong evidence (sustained degradation)
- **0.6–0.8**: Moderate confidence (pace variation)
- **< 0.6**: Ambiguous (noisy data, unclear state)

Higher confidence can inform:

- Whether to deliver feedback immediately
- How much emphasis AI layer puts on the message
- Logging/debugging what the brain decided

## Testing & Debugging

### Check State Detection

```typescript
import { detectRunState } from "../coaching";

const state = detectRunState(metrics, profile);
console.log("Detected state:", state);
```

### Check Intent Mapping

```typescript
import { mapStateToIntent, getIntentReason } from "../coaching";

const intent = mapStateToIntent("FATIGUE");
const reason = getIntentReason("FATIGUE");

console.log("Intent:", intent);
console.log("Reason:", reason);
```

### Simulate a Run

```typescript
const engine = createCoachingEngine();
const profile: RunnerProfile = {
  level: "intermediate",
  typicalPaceSecPerKm: 300, // 5 min/km
  goal: "easy",
};

// Simulate 5-min run with metrics every 30s
for (let sec = 0; sec < 300; sec += 30) {
  const metrics: RunMetrics = {
    // ... populate with test data
  };

  const output = engine.update(metrics, profile);
  if (output) {
    console.log(`[${sec}s] ${output.state} → ${output.intent.goal}`);
  }
}
```

## Future Phases

### Phase 2: AI/Voice Integration

```typescript
// Coming soon...
const message = await generateCoachingMessage(coachingOutput);
await speak(message);
```

### Phase 3: Learning & Personalization

- Track which feedbacks were effective
- Adjust cooldowns based on runner response
- Personalize tone/goals by experience level

### Phase 4: Run Goals Integration

- Detect "FINISHING" state based on actual run target
- Adjust effort recommendations for interval training
- Support different goal types (easy, tempo, long, interval)

## Architecture Decisions

### Why pure functions for state detection?

✅ Deterministic & testable
✅ Explainable (rules are visible)
✅ No dependencies (pure logic)
✅ Easy to debug

### Why separate Intent from State?

✅ Same state might need different intents in different contexts
✅ Easier to adjust coaching strategy without changing detection
✅ Prepares for future AI customization

### Why cooldown instead of constant feedback?

✅ Prevents distraction (runner needs focus)
✅ Avoids message fatigue
✅ Mimics human coach behavior
✅ Let messages sink in

### Why confidence scoring?

✅ Indicates signal strength
✅ Helps AI layer calibrate emphasis
✅ Logs decision quality
✅ Enables future A/B testing

## Next Steps

1. **Integrate with metrics hook** - Wire CoachingEngine into useRunTracker
2. **Add to session state** - Store coachingOutput in RunSession
3. **Create AI connector** - Pass coachingOutput to language model
4. **Add voice layer** - Connect to TTS system
5. **Build coaching UI** (optional) - Visual feedback for debugging

---

**Built for clarity, testability, and future enhancement.**
