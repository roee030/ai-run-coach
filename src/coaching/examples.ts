/**
 * Coaching Brain - Example Usage & Test Scenarios
 *
 * This file demonstrates how to use the coaching engine
 * and provides realistic test scenarios you can run
 */

import type { RunMetrics, RunnerProfile } from "./types";
import { createCoachingEngine } from "./coachingEngine";

/**
 * Example 1: Simple real-time usage
 * Call this in your metrics update loop (every 2-5 seconds)
 */
export function exampleRealTimeUsage() {
  // Create engine once at run start
  const engine = createCoachingEngine();

  // Runner profile (set at start)
  const profile: RunnerProfile = {
    level: "intermediate",
    typicalPaceSecPerKm: 300, // 5 min/km easy pace
    goal: "easy",
  };

  // Simulated metrics from tracker (every few seconds)
  const currentMetrics: RunMetrics = {
    timestamp: Date.now(),
    elapsedTimeSec: 120, // 2 minutes in
    distanceMeters: 400, // ~400m covered
    currentPaceSecPerKm: 298, // About 5:00/km
    avgPaceSecPerKm: 315, // Average is slightly slower
    speedMps: 3.36, // ~12 km/h
    elevationMeters: 125, // Going uphill
    elevationDeltaLast30s: 18, // Gained 18m in last 30s
    paceDeltaLast30s: -2, // Pace improving
  };

  // Update engine
  const output = engine.update(currentMetrics, profile);

  if (output) {
    console.log("=== COACHING FEEDBACK ===");
    console.log("State:", output.state);
    console.log("Goal:", output.intent.goal);
    console.log("Tone:", output.intent.tone);
    console.log("Urgency:", output.intent.urgency);
    console.log("Confidence:", (output.confidence * 100).toFixed(0) + "%");
    console.log("Reason:", output.reason);

    // Next step: pass to AI/voice layer
    // const message = await generateCoachingMessage(output);
    // await playAudio(message);
  } else {
    console.log("(In cooldown, no feedback right now)");
  }
}

/**
 * Example 2: Fast-paced uphill run
 * Demonstrates UPHILL state and reduce_effort intent
 */
export function scenarioUphillFatigueRun() {
  const engine = createCoachingEngine();
  const profile: RunnerProfile = {
    level: "beginner",
    typicalPaceSecPerKm: 360, // 6 min/km
    goal: "easy",
  };

  // Simulate a 15-minute uphill run
  const metrics: RunMetrics[] = [
    // First minute: Starting
    {
      timestamp: 0,
      elapsedTimeSec: 10,
      distanceMeters: 60,
      currentPaceSecPerKm: 350,
      avgPaceSecPerKm: 350,
      speedMps: 2.86,
      elevationMeters: 100,
      elevationDeltaLast30s: 2,
      paceDeltaLast30s: 0,
    },
    // 3 minutes: Steady
    {
      timestamp: 180000,
      elapsedTimeSec: 180,
      distanceMeters: 540,
      currentPaceSecPerKm: 355,
      avgPaceSecPerKm: 356,
      speedMps: 2.82,
      elevationMeters: 118,
      elevationDeltaLast30s: 6,
      paceDeltaLast30s: 1,
    },
    // 6 minutes: Hitting the hill
    {
      timestamp: 360000,
      elapsedTimeSec: 360,
      distanceMeters: 1020,
      currentPaceSecPerKm: 370,
      avgPaceSecPerKm: 360,
      speedMps: 2.7,
      elevationMeters: 160,
      elevationDeltaLast30s: 21, // Steep!
      paceDeltaLast30s: 5,
    },
    // 9 minutes: Still climbing, getting tired
    {
      timestamp: 540000,
      elapsedTimeSec: 540,
      distanceMeters: 1500,
      currentPaceSecPerKm: 390,
      avgPaceSecPerKm: 370,
      speedMps: 2.56,
      elevationMeters: 220,
      elevationDeltaLast30s: 20,
      paceDeltaLast30s: 8,
    },
    // 12 minutes: Fatigue setting in
    {
      timestamp: 720000,
      elapsedTimeSec: 720,
      distanceMeters: 1950,
      currentPaceSecPerKm: 410,
      avgPaceSecPerKm: 375,
      speedMps: 2.44,
      elevationMeters: 280,
      elevationDeltaLast30s: 18,
      paceDeltaLast30s: 12, // Pace dropping significantly
    },
  ];

  console.log("\n=== UPHILL RUN SCENARIO ===\n");

  metrics.forEach((m) => {
    const output = engine.update(m, profile);
    const timeMin = Math.round(m.elapsedTimeSec / 60);

    console.log(
      `\n[${timeMin}:${String(m.elapsedTimeSec % 60).padStart(2, "0")}]`,
    );
    console.log(
      `  Pace: ${Math.round(m.currentPaceSecPerKm)}s/km | Elevation: +${m.elevationDeltaLast30s.toFixed(0)}m`,
    );

    if (output) {
      console.log(`  → ${output.state}`);
      console.log(
        `  → Goal: ${output.intent.goal} | Tone: ${output.intent.tone}`,
      );
    } else {
      console.log("  → (cooldown)");
    }
  });
}

/**
 * Example 3: Runner hits the wall
 * Demonstrates STRUGGLING state and high urgency
 */
export function scenarioHitTheWall() {
  const engine = createCoachingEngine();
  const profile: RunnerProfile = {
    level: "intermediate",
    typicalPaceSecPerKm: 300, // 5 min/km
    goal: "long", // Long run
  };

  console.log("\n=== HIT THE WALL SCENARIO ===\n");

  // Simulate progression: Steady → Slowing → FATIGUE → STRUGGLING
  const metrics: RunMetrics[] = [
    {
      timestamp: 0,
      elapsedTimeSec: 600, // 10 minutes in
      distanceMeters: 3000,
      currentPaceSecPerKm: 300,
      avgPaceSecPerKm: 300,
      speedMps: 3.33,
      elevationMeters: 50,
      elevationDeltaLast30s: 0,
      paceDeltaLast30s: 0,
    },
    {
      timestamp: 300000,
      elapsedTimeSec: 900, // 15 minutes
      distanceMeters: 4500,
      currentPaceSecPerKm: 320,
      avgPaceSecPerKm: 305,
      speedMps: 3.13,
      elevationMeters: 55,
      elevationDeltaLast30s: 0,
      paceDeltaLast30s: 5, // Getting slower
    },
    {
      timestamp: 600000,
      elapsedTimeSec: 1200, // 20 minutes
      distanceMeters: 5700,
      currentPaceSecPerKm: 350,
      avgPaceSecPerKm: 310,
      speedMps: 2.86,
      elevationMeters: 60,
      elevationDeltaLast30s: 0,
      paceDeltaLast30s: 12, // FATIGUE threshold
    },
    {
      timestamp: 900000,
      elapsedTimeSec: 1500, // 25 minutes
      distanceMeters: 6300,
      currentPaceSecPerKm: 400,
      avgPaceSecPerKm: 315,
      speedMps: 2.5,
      elevationMeters: 65,
      elevationDeltaLast30s: 0,
      paceDeltaLast30s: 15, // STRUGGLING
    },
  ];

  metrics.forEach((m) => {
    const output = engine.update(m, profile);
    const timeMin = Math.round(m.elapsedTimeSec / 60);

    console.log(
      `\n[${timeMin}min] Pace: ${Math.round(m.currentPaceSecPerKm)}s/km`,
    );

    if (output) {
      console.log(`  ⚡ STATE: ${output.state}`);
      console.log(`  💪 GOAL: ${output.intent.goal}`);
      console.log(`  🎙️  TONE: ${output.intent.tone}`);
      console.log(`  ⏱️  URGENCY: ${output.intent.urgency}`);
      console.log(`  🎯 Confidence: ${(output.confidence * 100).toFixed(0)}%`);
    } else {
      console.log("  (in cooldown)");
    }
  });
}

/**
 * Example 4: Testing cooldown suppression
 * Demonstrates that identical intents don't repeat immediately
 */
export function scenarioCooldownTest() {
  const engine = createCoachingEngine();
  const profile: RunnerProfile = {
    level: "intermediate",
    typicalPaceSecPerKm: 300,
    goal: "easy",
  };

  // Same STEADY state across multiple updates
  const steadyMetrics: RunMetrics = {
    timestamp: Date.now(),
    elapsedTimeSec: 300,
    distanceMeters: 1500,
    currentPaceSecPerKm: 300,
    avgPaceSecPerKm: 300,
    speedMps: 3.33,
    elevationMeters: 50,
    elevationDeltaLast30s: 0,
    paceDeltaLast30s: 0,
  };

  console.log("\n=== COOLDOWN TEST ===\n");

  for (let i = 0; i < 5; i++) {
    const output = engine.update(steadyMetrics, profile);
    console.log(`Update ${i + 1}: ${output ? "✓ Feedback" : "⏳ Cooldown"}"`);

    if (output) {
      console.log(`  → ${output.state} (${output.intent.goal})`);
    }
  }
}

/**
 * Example 5: Fast start (STRONG state)
 */
export function scenarioFastStart() {
  const engine = createCoachingEngine();
  const profile: RunnerProfile = {
    level: "intermediate",
    typicalPaceSecPerKm: 300,
    goal: "easy",
  };

  console.log("\n=== FAST START SCENARIO ===\n");

  const metrics: RunMetrics[] = [
    {
      timestamp: 0,
      elapsedTimeSec: 20,
      distanceMeters: 150,
      currentPaceSecPerKm: 260, // 26% faster than usual!
      avgPaceSecPerKm: 260,
      speedMps: 3.85,
      elevationMeters: 50,
      elevationDeltaLast30s: 0,
      paceDeltaLast30s: -20,
    },
    {
      timestamp: 30000,
      elapsedTimeSec: 50,
      distanceMeters: 350,
      currentPaceSecPerKm: 270,
      avgPaceSecPerKm: 265,
      speedMps: 3.7,
      elevationMeters: 55,
      elevationDeltaLast30s: 1,
      paceDeltaLast30s: 5,
    },
  ];

  metrics.forEach((m) => {
    const output = engine.update(m, profile);
    const secondsRemaining = m.elapsedTimeSec % 60;

    console.log(`\n[0:${String(secondsRemaining).padStart(2, "0")}]`);
    console.log(`  Pace: ${m.currentPaceSecPerKm}s/km`);

    if (output) {
      console.log(`  → ${output.state}`);
      console.log(
        `  → "${output.intent.goal}" with ${output.intent.tone} tone`,
      );
    }
  });
}

/**
 * Run all examples
 */
export function runAllExamples() {
  exampleRealTimeUsage();
  scenarioUphillFatigueRun();
  scenarioHitTheWall();
  scenarioCooldownTest();
  scenarioFastStart();
}

// If running as standalone script:
// runAllExamples();
