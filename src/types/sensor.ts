/**
 * Sensor abstraction layer
 * Allows app to work with real GPS or simulated data interchangeably
 */

/**
 * A single GPS sample from the sensor
 */
export interface RunSample {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Latitude in degrees */
  latitude: number;
  /** Longitude in degrees */
  longitude: number;
  /** Elevation in meters (optional) */
  elevation?: number;
  /** GPS accuracy in meters (optional) */
  accuracy?: number;
}

/**
 * Generic sensor interface
 * App depends only on this interface, not on real/simulated implementations
 */
export interface RunSensor {
  /** Start collecting data */
  start(): void;

  /** Stop collecting data */
  stop(): void;

  /** Register callback for new samples */
  onSample(callback: (sample: RunSample) => void): void;

  /** Unregister callback */
  offSample(callback: (sample: RunSample) => void): void;

  /** Check if sensor is active */
  isRunning(): boolean;
}

/**
 * Simulation scenario preset
 */
export interface SimulationScenario {
  /** Name of scenario */
  name: string;
  /** Start position */
  startLat: number;
  startLon: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Pace profile (pace in min/km over time) */
  paceProfile: (elapsedSeconds: number) => number;
  /** Optional elevation profile */
  elevationProfile?: (elapsedSeconds: number) => number;
  /** GPS noise level (meters) */
  gpsNoise?: number;
  /** Sample interval (seconds) */
  sampleInterval?: number;
}

/**
 * Simulation event for testing
 */
export interface SimulationEvent {
  type: "start" | "stop" | "sample" | "complete";
  timestamp: number;
  data?: RunSample;
}
