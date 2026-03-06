/**
 * Sensor factory - creates appropriate sensor based on environment
 * Supports RUN_MODE env variable: "real" | "simulation"
 */

import type { RunSensor, SimulationScenario } from "../types/sensor";
import { RealRunSensor } from "./RealRunSensor";
import { SimulatedRunSensor } from "./SimulatedRunSensor";
import { getScenario, steadyRunScenario } from "./simulations";

/**
 * Get run mode from environment or localStorage
 * Priority: URL param > localStorage > env > default
 */
function getRunMode(): "real" | "simulation" {
  // Check URL parameter
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get("RUN_MODE");
    if (urlMode === "real" || urlMode === "simulation") {
      return urlMode;
    }

    // Check localStorage
    const stored = localStorage.getItem("RUN_MODE");
    if (stored === "real" || stored === "simulation") {
      return stored;
    }
  }

  // Check environment variable (build-time)
  const envMode = import.meta.env.VITE_RUN_MODE;
  if (envMode === "real" || envMode === "simulation") {
    return envMode;
  }

  // Default
  return "real";
}

/**
 * Get scenario name from environment or localStorage
 */
function getScenarioName(): string {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlScenario = params.get("SCENARIO");
    if (urlScenario) {
      return urlScenario;
    }

    const stored = localStorage.getItem("SCENARIO");
    if (stored) {
      return stored;
    }
  }

  const envScenario = import.meta.env.VITE_SCENARIO;
  if (envScenario) {
    return envScenario;
  }

  return "steadyRun";
}

/**
 * Create run sensor based on mode
 * @param forceMode - Force a specific mode (useful for testing)
 * @param forceScenario - Force a specific scenario
 */
export function createRunSensor(
  forceMode?: "real" | "simulation",
  forceScenario?: SimulationScenario,
): RunSensor {
  const mode = forceMode ?? getRunMode();

  if (mode === "simulation") {
    const scenarioName = getScenarioName();
    const scenario =
      forceScenario ?? getScenario(scenarioName) ?? steadyRunScenario;

    // Log in dev
    if (import.meta.env.DEV) {
      console.log(`[RunTracker] Using SimulatedRunSensor: ${scenario.name}`, {
        duration: scenario.durationSeconds,
        pace: scenario.paceProfile(0),
      });
    }

    return new SimulatedRunSensor(scenario);
  }

  // Real mode
  if (import.meta.env.DEV) {
    console.log("[RunTracker] Using RealRunSensor");
  }

  return new RealRunSensor();
}

/**
 * Set run mode for development
 * Stores in localStorage for persistence across reloads
 */
export function setRunMode(mode: "real" | "simulation"): void {
  localStorage.setItem("RUN_MODE", mode);
  console.log(
    `[RunTracker] Set RUN_MODE to "${mode}". Reload page to take effect.`,
  );
}

/**
 * Set scenario for development
 * Stores in localStorage for persistence
 */
export function setScenario(scenarioName: string): void {
  localStorage.setItem("SCENARIO", scenarioName);
  console.log(
    `[RunTracker] Set SCENARIO to "${scenarioName}". Reload page to take effect.`,
  );
}

/**
 * Clear overrides and use system defaults
 */
export function clearSensorOverrides(): void {
  localStorage.removeItem("RUN_MODE");
  localStorage.removeItem("SCENARIO");
  console.log(
    "[RunTracker] Cleared sensor overrides. Reload page to take effect.",
  );
}

/**
 * Get current configuration (for debugging)
 */
export function getSensorConfig() {
  return {
    mode: getRunMode(),
    scenario: getScenarioName(),
  };
}
