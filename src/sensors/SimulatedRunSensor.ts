/**
 * Simulated GPS sensor for testing and development
 * Generates realistic running data without requiring real GPS or movement
 */

import type { RunSample, RunSensor, SimulationScenario } from "../types/sensor";

/**
 * Convert meters to degrees of latitude (approximately 111.3 km per degree)
 */
function metersToLatDegrees(meters: number): number {
  return meters / 111300;
}

/**
 * Convert meters to degrees of longitude at a given latitude
 * Longitude changes depend on latitude
 */
function metersToLonDegrees(meters: number, latitude: number): number {
  const metersPerDegreeLon = 111300 * Math.cos((latitude * Math.PI) / 180);
  return meters / metersPerDegreeLon;
}

/**
 * Simulated GPS sensor for development and testing
 * Generates realistic running data based on pace profile
 */
export class SimulatedRunSensor implements RunSensor {
  private callbacks: Array<(sample: RunSample) => void> = [];
  private running: boolean = false;
  private scenario: SimulationScenario;
  private startTime: number = 0;
  private rafId: number | null = null;
  private lastSampleTime: number = 0;
  private currentLat: number;
  private currentLon: number;

  /**
   * Initialize with scenario
   */
  constructor(scenario: SimulationScenario) {
    this.scenario = scenario;
    this.currentLat = scenario.startLat;
    this.currentLon = scenario.startLon;
  }

  /**
   * Start simulation
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = Date.now();
    this.lastSampleTime = 0;
    this.currentLat = this.scenario.startLat;
    this.currentLon = this.scenario.startLon;
    this.scheduleNextSample();
  }

  /**
   * Stop simulation
   */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Register callback
   */
  onSample(callback: (sample: RunSample) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Unregister callback
   */
  offSample(callback: (sample: RunSample) => void): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Schedule next sample using RAF for background safety
   */
  private scheduleNextSample(): void {
    if (!this.running) return;

    this.rafId = requestAnimationFrame(() => {
      const now = Date.now();
      const elapsed = (now - this.startTime) / 1000; // seconds

      // Check if duration exceeded
      if (elapsed > this.scenario.durationSeconds) {
        this.running = false;
        return;
      }

      const sampleInterval = this.scenario.sampleInterval ?? 2.5; // 2.5s default

      // Emit if enough time has passed
      if (elapsed - this.lastSampleTime >= sampleInterval) {
        this.emitSample(elapsed);
        this.lastSampleTime = elapsed;
      }

      this.scheduleNextSample();
    });
  }

  /**
   * Generate and emit a sample at given elapsed time
   */
  private emitSample(elapsedSeconds: number): void {
    // Calculate distance traveled based on pace profile
    const paceMinPerKm = this.scenario.paceProfile(elapsedSeconds);
    const speedKmPerHour = paceMinPerKm > 0 ? 60 / paceMinPerKm : 0;
    const speedMps = (speedKmPerHour * 1000) / 3600;

    // Distance traveled since last sample
    const sampleInterval = this.scenario.sampleInterval ?? 2.5;
    const distanceMeters = speedMps * sampleInterval;

    // Update position moving in a direction (north for simplicity, can be randomized)
    if (distanceMeters > 0) {
      const latDelta = metersToLatDegrees(distanceMeters);
      const lonDelta = metersToLonDegrees(distanceMeters, this.currentLat);

      // Add slight variation (randomize direction slightly)
      const directionVariation = Math.sin(elapsedSeconds * 0.5) * 0.1;
      this.currentLat += latDelta * (1 + directionVariation);
      this.currentLon += lonDelta;
    }

    // Add GPS noise
    const gpsNoise = this.scenario.gpsNoise ?? 3; // meters
    const noiseLatDelta =
      (Math.random() - 0.5) * metersToLatDegrees(gpsNoise * 2);
    const noiseLonDelta =
      (Math.random() - 0.5) * metersToLonDegrees(gpsNoise * 2, this.currentLat);

    const noisyLat = this.currentLat + noiseLatDelta;
    const noisyLon = this.currentLon + noiseLonDelta;

    // Calculate elevation
    const elevation = this.scenario.elevationProfile
      ? this.scenario.elevationProfile(elapsedSeconds)
      : undefined;

    const sample: RunSample = {
      timestamp: Date.now(),
      latitude: noisyLat,
      longitude: noisyLon,
      elevation,
      accuracy: gpsNoise, // Report noise level as accuracy
    };

    this.emit(sample);
  }

  /**
   * Emit sample to all callbacks
   */
  private emit(sample: RunSample): void {
    this.callbacks.forEach((cb) => cb(sample));
  }

  /**
   * For testing: get current position
   */
  getCurrentPosition(): { lat: number; lon: number } {
    return {
      lat: this.currentLat,
      lon: this.currentLon,
    };
  }
}
