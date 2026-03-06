/**
 * Simple Run Event Detector
 *
 * Observes a stream of `RunState` snapshots (pushed repeatedly) and
 * emits high-level RunEvent objects when sustained patterns are detected.
 *
 * This detector is intentionally small and deterministic. It debounces
 * events and avoids single-sample reactions.
 */

import type { RunState, RunEvent } from "./coachTypes";

export class EventDetector {
  private samples: RunState[] = [];
  private emittedTimestamps: { [k: string]: number } = {};

  // Config: how many samples constitute a sustained pattern.
  // If updates arrive every ~2.5s, 4 samples ≈ 10s.
  private sustainedSamples = 4;

  // Debounce window for same event type (ms)
  private debounceMs = 10_000;

  push(sample: RunState): RunEvent[] {
    this.samples.push(sample);
    // keep only recent window
    if (this.samples.length > this.sustainedSamples * 4) {
      this.samples.shift();
    }

    const events: RunEvent[] = [];

    // Detect STOPPED / RESUMED: look at isMoving for last N samples
    const lastN = this.samples.slice(-this.sustainedSamples);
    const movingCount = lastN.filter((s) => s.isMoving).length;

    const now = sample.timestamp;

    if (movingCount === 0) {
      // Sustained stop
      if (this.shouldEmitOnce("STOPPED", now)) {
        events.push({ type: "STOPPED", timestamp: now });
      }
      return events; // when stopped, skip other detections
    }

    // Detect RESUMED: previous sample window included stopped state
    const prevWindow = this.samples.slice(-this.sustainedSamples - 1, -1);
    if (prevWindow.length === this.sustainedSamples) {
      const prevMoving = prevWindow.filter((s) => s.isMoving).length;
      if (prevMoving === 0 && this.shouldEmitOnce("RESUMED", now)) {
        events.push({ type: "RESUMED", timestamp: now });
      }
    }

    // Detect PACE_DROP: pace exists and has been declining across window
    const paces = lastN
      .map((s) => s.pace)
      .filter((p): p is number => p !== null);
    if (paces.length >= Math.max(2, this.sustainedSamples - 1)) {
      const first = paces[0];
      const last = paces[paces.length - 1];
      const delta = last - first; // positive -> slower (pace increased seconds/km)
      if (delta > 2) {
        // amount expressed in seconds/km
        if (this.shouldEmitOnce("PACE_DROP", now)) {
          events.push({
            type: "PACE_DROP",
            amount: Math.round(delta * 10) / 10,
            timestamp: now,
          });
        }
      }

      // Detect SUSTAINED_FAST_PACE: steady improvement
      if (first - last > 1.5) {
        if (this.shouldEmitOnce("SUSTAINED_FAST_PACE", now)) {
          // duration is approximate: samples * interval (assume ~2.5s)
          const duration = Math.round(paces.length * 2.5 * 10) / 10;
          events.push({
            type: "SUSTAINED_FAST_PACE",
            duration,
            timestamp: now,
          });
        }
      }
    }

    // Detect UPHILL: using elevationGain increase across window
    const elevationDeltas = lastN.map((s) => s.elevationGain);
    if (elevationDeltas.length >= this.sustainedSamples) {
      const elevDelta =
        elevationDeltas[elevationDeltas.length - 1] - elevationDeltas[0];
      if (elevDelta > 6) {
        // rudimentary grade estimate: meters gained over duration
        const grade =
          Math.round(
            (elevDelta / Math.max(1, this.sustainedSamples * 2.5)) * 10,
          ) / 10;
        if (this.shouldEmitOnce("UPHILL", now)) {
          events.push({ type: "UPHILL", grade, timestamp: now });
        }
      }
    }

    return events;
  }

  // Basic debounce/deduplication
  private shouldEmitOnce(key: string, now: number): boolean {
    const last = this.emittedTimestamps[key];
    if (!last || now - last > this.debounceMs) {
      this.emittedTimestamps[key] = now;
      return true;
    }
    return false;
  }

  // For tests / reset
  reset() {
    this.samples = [];
    this.emittedTimestamps = {};
  }
}

export default EventDetector;
