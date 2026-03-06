/**
 * Pre-built simulation scenarios for testing
 * Each scenario simulates a different running behavior
 */

import type { SimulationScenario } from "../types/sensor";

/**
 * Steady run at consistent pace (5:30 min/km)
 * Perfect for testing that metrics remain stable
 */
export const steadyRunScenario: SimulationScenario = {
  name: "Steady Run",
  startLat: 40.7128, // New York
  startLon: -74.006,
  durationSeconds: 600, // 10 minutes
  paceProfile: () => 5.5, // Constant 5:30 min/km
  gpsNoise: 3,
  sampleInterval: 2.5,
};

/**
 * Gradual acceleration from 6:00 to 5:00 min/km
 * Tests pace smoothing during speed changes
 */
export const accelerateScenario: SimulationScenario = {
  name: "Acceleration",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 600,
  paceProfile: (elapsed) => {
    // Start at 6:00, end at 5:00
    return 6 - (elapsed / 600) * 1; // Linear from 6 to 5
  },
  gpsNoise: 3,
  sampleInterval: 2.5,
};

/**
 * Gradual deceleration from 5:00 to 6:30 min/km
 * Tests pace smoothing when slowing down
 */
export const slowDownScenario: SimulationScenario = {
  name: "Slow Down",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 600,
  paceProfile: (elapsed) => {
    // Start at 5:00, end at 6:30
    return 5 + (elapsed / 600) * 1.5;
  },
  gpsNoise: 3,
  sampleInterval: 2.5,
};

/**
 * Stop and go: running, pause, running again
 * Tests data continuity, distance preservation
 */
export const stopAndGoScenario: SimulationScenario = {
  name: "Stop and Go",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 600,
  paceProfile: (elapsed) => {
    // Intervals: run 120s, stop 60s, run 120s, stop 60s, etc.
    const cycle = 180; // 3 minute cycle (2 min run + 1 min stop)
    const phase = elapsed % cycle;

    if (phase < 120) {
      // Running: 5:30 pace
      return 5.5;
    } else {
      // Stopped: very high pace (essentially stopped)
      return 999; // High value = essentially stopped
    }
  },
  gpsNoise: 2,
  sampleInterval: 2.5,
};

/**
 * GPS glitch: brief period of wild noise/jumps
 * Tests spike filtering and metric stability
 */
export const gpsGlitchScenario: SimulationScenario = {
  name: "GPS Glitch",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 600,
  paceProfile: () => {
    // Normal pace throughout
    return 5.5;
  },
  gpsNoise: 50, // High noise level for entire scenario to simulate glitch
  sampleInterval: 2.5,
};

/**
 * Hill run with elevation gain
 * Tests elevation tracking and pace on incline
 */
export const hillRunScenario: SimulationScenario = {
  name: "Hill Run",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 600,
  paceProfile: (elapsed) => {
    // Slower on uphill (first half), faster downhill (second half)
    const isUphill = elapsed < 300;
    return isUphill ? 6.5 : 4.5;
  },
  elevationProfile: (elapsed) => {
    // Climb 50m in first 300s, descend 50m in next 300s
    if (elapsed < 300) {
      return (elapsed / 300) * 50; // 0 to 50m
    } else {
      return 50 - ((elapsed - 300) / 300) * 50; // 50 to 0m
    }
  },
  gpsNoise: 3,
  sampleInterval: 2.5,
};

/**
 * Long endurance run (30 minutes, steady)
 * Tests distance calculation and data stability over time
 */
export const enduranceRunScenario: SimulationScenario = {
  name: "Endurance Run",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 1800, // 30 minutes
  paceProfile: (elapsed) => {
    // Slight fade in pace after 20 minutes
    if (elapsed > 1200) {
      return 5.5 + ((elapsed - 1200) / 600) * 0.5; // Fade to 5:45
    }
    return 5.5;
  },
  gpsNoise: 3,
  sampleInterval: 2.5,
};

/**
 * Sprint intervals: fast burst, jog recovery, repeat
 * Tests rapid pace changes
 */
export const sprintIntervalsScenario: SimulationScenario = {
  name: "Sprint Intervals",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 600,
  paceProfile: (elapsed) => {
    // 60s sprint (4:00), 60s recovery (6:00), repeat
    const cycle = 120;
    const phase = elapsed % cycle;

    if (phase < 60) {
      // Sprint: 4:00 pace
      return 4.0;
    } else {
      // Recovery: 6:00 pace
      return 6.0;
    }
  },
  gpsNoise: 3,
  sampleInterval: 2.5,
};

/**
 * Get all available scenarios
 */
export const ALL_SCENARIOS: Record<string, SimulationScenario> = {
  steadyRun: steadyRunScenario,
  accelerate: accelerateScenario,
  slowDown: slowDownScenario,
  stopAndGo: stopAndGoScenario,
  gpsGlitch: gpsGlitchScenario,
  hillRun: hillRunScenario,
  enduranceRun: enduranceRunScenario,
  sprintIntervals: sprintIntervalsScenario,
};

/**
 * Get scenario by name
 */
export function getScenario(name: string): SimulationScenario | null {
  return ALL_SCENARIOS[name] ?? null;
}

/**
 * Get random scenario
 */
export function getRandomScenario(): SimulationScenario {
  const names = Object.keys(ALL_SCENARIOS);
  const randomName = names[Math.floor(Math.random() * names.length)];
  return ALL_SCENARIOS[randomName];
}
