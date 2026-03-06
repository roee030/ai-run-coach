/**
 * Real GPS sensor using navigator.geolocation.watchPosition
 * No UI coupling - pure data provider
 */

import type { RunSample, RunSensor } from "../types/sensor";

export class RealRunSensor implements RunSensor {
  private watchId: number | null = null;
  private callbacks: Array<(sample: RunSample) => void> = [];
  private running: boolean = false;

  /**
   * Start collecting GPS data
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const sample: RunSample = {
          timestamp: position.timestamp,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          elevation: position.coords.altitude ?? undefined,
          accuracy: position.coords.accuracy ?? undefined,
        };

        this.emit(sample);
      },
      (error) => {
        console.error("[RealRunSensor] Geolocation error:", error.message);
        // Could emit error event or log
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  /**
   * Stop collecting GPS data
   */
  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.running = false;
  }

  /**
   * Register callback for new samples
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
   * Check if sensor is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Emit sample to all callbacks
   */
  private emit(sample: RunSample): void {
    this.callbacks.forEach((cb) => cb(sample));
  }
}
