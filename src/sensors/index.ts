/**
 * Sensor module - Data abstraction layer for run tracking
 * Allows swapping between real GPS and simulated data seamlessly
 */

export { RealRunSensor } from "./RealRunSensor";
export { SimulatedRunSensor } from "./SimulatedRunSensor";
export {
  createRunSensor,
  setRunMode,
  setScenario,
  clearSensorOverrides,
  getSensorConfig,
} from "./sensorFactory";
export {
  steadyRunScenario,
  accelerateScenario,
  slowDownScenario,
  stopAndGoScenario,
  gpsGlitchScenario,
  hillRunScenario,
  enduranceRunScenario,
  sprintIntervalsScenario,
  ALL_SCENARIOS,
  getScenario,
  getRandomScenario,
} from "./simulations";

// Re-export types
export type {
  RunSample,
  RunSensor,
  SimulationScenario,
  SimulationEvent,
} from "../types/sensor";
