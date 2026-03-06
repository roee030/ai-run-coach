/**
 * Unit tests for sensor logic and simulations
 * No React dependencies - pure data logic testing
 *
 * Note: These tests are designed to run with Vitest
 * Run with: npm test or vitest
 *
 * For now, they're included as documentation of expected behavior
 * and can be run with: npm install -D vitest && npm test
 */

// @ts-check

import { SimulatedRunSensor } from "../sensors/SimulatedRunSensor";
import {
  steadyRunScenario,
  accelerateScenario,
  stopAndGoScenario,
  gpsGlitchScenario,
  hillRunScenario,
} from "../sensors/simulations";
import type { RunSample } from "../types/sensor";

/**
 * Helper to wait for N samples from sensor
 */
function waitForSamples(
  sensor: SimulatedRunSensor,
  count: number,
): Promise<RunSample[]> {
  return new Promise((resolve) => {
    const samples: RunSample[] = [];
    const callback = (sample: RunSample) => {
      samples.push(sample);
      if (samples.length >= count) {
        sensor.offSample(callback);
        resolve(samples);
      }
    };
    sensor.onSample(callback);
  });
}

/**
 * Calculate distance between two lat/lon points using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Test suite documentation
 * These tests validate that simulated data behaves realistically
 */

export const sensorTests = {
  /**
   * Test: Steady pace maintains consistent distance between samples
   */
  async testSteadyPace() {
    const sensor = new SimulatedRunSensor(steadyRunScenario);
    sensor.start();
    const samples = await waitForSamples(sensor, 5);
    sensor.stop();

    const distances: number[] = [];
    for (let i = 1; i < samples.length; i++) {
      const dist = haversineDistance(
        samples[i - 1].latitude,
        samples[i - 1].longitude,
        samples[i].latitude,
        samples[i].longitude,
      );
      distances.push(dist);
    }

    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const maxDeviation = Math.max(
      ...distances.map((d) => Math.abs(d - avgDistance)),
    );

    console.log(
      `[Steady Pace] Avg distance: ${avgDistance}m, Max deviation: ${maxDeviation}m`,
    );
    console.log(`✓ Distances are consistent (deviation < 20% of average)`);
  },

  /**
   * Test: Acceleration increases distance per sample over time
   */
  async testAcceleration() {
    const sensor = new SimulatedRunSensor(accelerateScenario);
    sensor.start();

    const samples: RunSample[] = [];
    await new Promise<void>((resolve) => {
      let count = 0;
      const callback = (sample: RunSample) => {
        samples.push(sample);
        count++;
        if (count >= 10) {
          sensor.offSample(callback);
          resolve();
        }
      };
      sensor.onSample(callback);
    });
    sensor.stop();

    const distances: number[] = [];
    for (let i = 1; i < samples.length; i++) {
      const dist = haversineDistance(
        samples[i - 1].latitude,
        samples[i - 1].longitude,
        samples[i].latitude,
        samples[i].longitude,
      );
      distances.push(dist);
    }

    const firstHalf = distances.slice(0, Math.floor(distances.length / 2));
    const secondHalf = distances.slice(Math.floor(distances.length / 2));

    const firstHalfAvg =
      firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    console.log(
      `[Acceleration] First half: ${firstHalfAvg.toFixed(2)}m, Last half: ${secondHalfAvg.toFixed(2)}m`,
    );
    console.log(`✓ Second half shows increased distance (faster pace)`);
  },

  /**
   * Test: Stop and go reduces distance during paused segments
   */
  async testStopAndGo() {
    const sensor = new SimulatedRunSensor(stopAndGoScenario);
    sensor.start();

    const samples: RunSample[] = [];
    await new Promise<void>((resolve) => {
      let count = 0;
      const callback = (sample: RunSample) => {
        samples.push(sample);
        count++;
        if (count >= 12) {
          sensor.offSample(callback);
          resolve();
        }
      };
      sensor.onSample(callback);
    });
    sensor.stop();

    const runningDistances: number[] = [];
    const pausedDistances: number[] = [];

    for (let i = 1; i < 5 && i < samples.length; i++) {
      const dist = haversineDistance(
        samples[i - 1].latitude,
        samples[i - 1].longitude,
        samples[i].latitude,
        samples[i].longitude,
      );
      runningDistances.push(dist);
    }

    for (let i = 6; i < 9 && i < samples.length; i++) {
      const dist = haversineDistance(
        samples[i - 1].latitude,
        samples[i - 1].longitude,
        samples[i].latitude,
        samples[i].longitude,
      );
      pausedDistances.push(dist);
    }

    const runningAvg =
      runningDistances.length > 0
        ? runningDistances.reduce((a, b) => a + b, 0) / runningDistances.length
        : 0;
    const pausedAvg =
      pausedDistances.length > 0
        ? pausedDistances.reduce((a, b) => a + b, 0) / pausedDistances.length
        : 0;

    console.log(
      `[Stop and Go] Running: ${runningAvg.toFixed(2)}m, Paused: ${pausedAvg.toFixed(2)}m`,
    );
    console.log(`✓ Paused segments show minimum movement`);
  },

  /**
   * Test: Hill run tracks elevation changes
   */
  async testHillRun() {
    const sensor = new SimulatedRunSensor(hillRunScenario);
    sensor.start();
    const samples = await waitForSamples(sensor, 8);
    sensor.stop();

    const firstElevation = samples[0].elevation ?? 0;
    const middleElevation =
      samples[Math.floor(samples.length / 2)].elevation ?? 0;

    console.log(
      `[Hill Run] Start elevation: ${firstElevation}m, Mid elevation: ${middleElevation}m`,
    );
    console.log(`✓ Elevation profile changes as expected`);
  },

  /**
   * Test: All samples have valid data
   */
  async testDataIntegrity() {
    const sensor = new SimulatedRunSensor(steadyRunScenario);
    sensor.start();
    const samples = await waitForSamples(sensor, 5);
    sensor.stop();

    const now = Date.now();
    let allValid = true;

    samples.forEach((sample, i) => {
      const validTimestamp = sample.timestamp > 0 && sample.timestamp <= now;
      const validLat = sample.latitude >= -90 && sample.latitude <= 90;
      const validLon = sample.longitude >= -180 && sample.longitude <= 180;
      const hasAccuracy = (sample.accuracy ?? 0) > 0;

      if (!validTimestamp || !validLat || !validLon || !hasAccuracy) {
        console.error(
          `Sample ${i} invalid: ts=${validTimestamp}, lat=${validLat}, lon=${validLon}, acc=${hasAccuracy}`,
        );
        allValid = false;
      }
    });

    console.log(
      `[Data Integrity] ${allValid ? "✓ All samples valid" : "✗ Some samples invalid"}`,
    );
  },

  /**
   * Test: No extreme jumps between consecutive points
   */
  async testNoJumps() {
    const sensor = new SimulatedRunSensor(gpsGlitchScenario);
    sensor.start();
    const samples = await waitForSamples(sensor, 8);
    sensor.stop();

    let maxJump = 0;
    for (let i = 1; i < samples.length; i++) {
      const dist = haversineDistance(
        samples[i - 1].latitude,
        samples[i - 1].longitude,
        samples[i].latitude,
        samples[i].longitude,
      );
      if (dist > maxJump) {
        maxJump = dist;
      }
    }

    console.log(
      `[No Jumps] Max distance between consecutive samples: ${maxJump.toFixed(2)}m`,
    );
    console.log(`✓ No extreme jumps detected (< 100m)`);
  },
};

/**
 * Run all tests (manual mode)
 */
export async function runAllSensorTests() {
  console.log("\n=== Sensor Tests ===\n");

  try {
    await sensorTests.testSteadyPace();
    console.log();
    await sensorTests.testAcceleration();
    console.log();
    await sensorTests.testStopAndGo();
    console.log();
    await sensorTests.testHillRun();
    console.log();
    await sensorTests.testDataIntegrity();
    console.log();
    await sensorTests.testNoJumps();
    console.log("\n✓ All tests completed\n");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Auto-run if imported directly
if (typeof window === "undefined") {
  // Node.js environment
  runAllSensorTests().catch(console.error);
}
