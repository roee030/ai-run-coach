/**
 * useRunTracker hook - manages geolocation tracking and session state
 *
 * Improvements:
 * - GPS data collected continuously, metrics updated on 2.5s cycle (fixed interval)
 * - All metrics smoothed and quantized to prevent flickering
 * - Robust handling of GPS noise and spikes
 * - Works accurately even when browser tab is backgrounded
 * - Uses RunSensor abstraction (supports real GPS and simulation)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationPoint, RunSession } from "../types";
import type { RunSensor, RunSample } from "../types/sensor";
import { createRunSensor } from "../sensors/sensorFactory";
import {
  calculateDistance,
  calculatePace,
  calculateSpeed,
} from "../utils/geolocation";
import {
  SampleBuffer,
  smoothDistance,
  smoothPace,
  smoothSpeed,
} from "../utils/metricsSmoothing";
import { MetricsUpdateScheduler } from "../utils/robustTimer";

const INITIAL_STATE: RunSession = {
  isRunning: false,
  isFinished: false,
  startTime: null,
  elapsedTime: 0,
  distance: 0,
  currentSpeed: 0,
  pace: 0,
  elevation: null,
  lastLocation: null,
  locations: [],
  gpsAcquired: false,
  error: null,
};

export function useRunTracker() {
  const [session, setSession] = useState<RunSession>(INITIAL_STATE);

  // Sensor and tracking state
  const sensorRef = useRef<RunSensor | null>(null);
  const lastLocationRef = useRef<LocationPoint | null>(null);
  const distanceRef = useRef(0);

  // Metrics smoothing buffers (rolling windows of recent samples)
  const speedBufferRef = useRef(new SampleBuffer(15)); // last 15 speed samples
  const paceBufferRef = useRef(new SampleBuffer(15)); // last 15 pace samples
  const distanceBufferRef = useRef(new SampleBuffer(10)); // last 10 distance readings

  // Raw metric values collected from GPS (before smoothing)
  const rawSpeedRef = useRef(0);
  const rawPaceRef = useRef(0);
  const rawDistanceRef = useRef(0);

  // Displayed metric values (smoothed and quantized)
  const displayedSpeedRef = useRef(0);
  const displayedPaceRef = useRef(0);
  const displayedDistanceRef = useRef(0);

  // Metrics update scheduler - triggers recalculation every 2.5s
  const metricsSchedulerRef = useRef(new MetricsUpdateScheduler());

  /**
   * Calculate and smooth metrics from buffered GPS data
   * Called on 2.5s cycle, not on every GPS update
   *
   * IMPORTANT: This is wrapped in a ref to avoid stale closure issues.
   * The scheduler calls the ref, not the callback directly.
   */
  const updateSmoothedMetricsRef = useRef<() => void>(() => {});

  // Update the ref whenever session.elapsedTime changes
  useEffect(() => {
    updateSmoothedMetricsRef.current = () => {
      // Read current state directly from refs, not closure
      const currentDistance = distanceRef.current;
      const currentElapsedTime = session.elapsedTime;

      // Early exit if not running (check session state)
      if (!session.isRunning) {
        return;
      }

      // 1. Smooth distance (monotonic, only increases)
      const smoothedDistance = smoothDistance(
        currentDistance,
        displayedDistanceRef.current,
        distanceBufferRef.current,
        { maxDeltaPerUpdate: 50 }, // max 50m per update cycle
      );
      displayedDistanceRef.current = smoothedDistance;

      // 2. Calculate smoothed pace
      const calculatedPace = calculatePace(
        smoothedDistance,
        currentElapsedTime,
      );
      const smoothedPace = smoothPace(
        calculatedPace,
        displayedPaceRef.current,
        paceBufferRef.current,
      );
      displayedPaceRef.current = smoothedPace;

      // 3. Smooth speed
      const smoothedSpeed = smoothSpeed(
        rawSpeedRef.current,
        displayedSpeedRef.current,
        speedBufferRef.current,
      );
      displayedSpeedRef.current = smoothedSpeed;

      // Update state with calculated metrics
      setSession((prev) => {
        // Always update metrics on scheduler cycle, don't block with change detection
        // The scheduler only fires when running, so we know state should update
        return {
          ...prev,
          distance: smoothedDistance,
          pace: smoothedPace,
          currentSpeed: smoothedSpeed,
        };
      });
    };
  }, [session.elapsedTime, session.isRunning]);

  /**
   * Start running session
   */
  const start = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      isRunning: true,
      startTime: Date.now(),
      error: null,
      gpsAcquired: false,
    }));

    // Reset all state
    lastLocationRef.current = null;
    distanceRef.current = 0;
    rawSpeedRef.current = 0;
    rawPaceRef.current = 0;
    rawDistanceRef.current = 0;
    displayedSpeedRef.current = 0;
    displayedPaceRef.current = 0;
    displayedDistanceRef.current = 0;
    speedBufferRef.current.clear();
    paceBufferRef.current.clear();
    distanceBufferRef.current.clear();

    // Create and start sensor (real or simulated based on config)
    const sensor = createRunSensor();
    sensorRef.current = sensor;

    // Start metrics update cycle (every 2.5 seconds)
    // Use the ref to get the current version of the callback
    metricsSchedulerRef.current.start(() => updateSmoothedMetricsRef.current());

    // Subscribe to sensor samples
    // Data flows: sensor -> raw data refs -> updateSmoothedMetrics -> state
    const sampleCallback = (sample: RunSample) => {
      // Convert RunSample to LocationPoint
      const currentLocation: LocationPoint = {
        latitude: sample.latitude,
        longitude: sample.longitude,
        altitude: sample.elevation ?? null,
        accuracy: sample.accuracy ?? 0,
        timestamp: sample.timestamp,
      };

      // Calculate distance
      let distanceDelta = 0;
      if (lastLocationRef.current) {
        distanceDelta = calculateDistance(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          sample.latitude,
          sample.longitude,
        );

        // Filter GPS spikes: reject jumps > 1km
        if (distanceDelta < 1000) {
          distanceRef.current += distanceDelta;
          rawDistanceRef.current = distanceRef.current;
        }
      }

      // Calculate instant speed (for buffer)
      let instantSpeed = 0;
      if (lastLocationRef.current && distanceDelta > 0) {
        const timeDelta =
          (sample.timestamp - lastLocationRef.current.timestamp) / 1000;
        if (timeDelta > 0) {
          instantSpeed = calculateSpeed(distanceDelta, timeDelta);
          // Store raw speed for smoothing on next scheduled update
          rawSpeedRef.current = instantSpeed;
          speedBufferRef.current.add(instantSpeed);
        }
      }

      lastLocationRef.current = currentLocation;

      // Update location tracking (not metrics - those update on 2.5s cycle)
      setSession((prev) => ({
        ...prev,
        lastLocation: currentLocation,
        locations: [...prev.locations, currentLocation],
        elevation: sample.elevation ?? null,
        gpsAcquired: (sample.accuracy ?? 100) < 50, // GPS acquired if accuracy < 50m
        error: null,
      }));
    };

    sensor.onSample(sampleCallback);
    sensor.start();
  }, []);

  /**
   * Stop running session
   */
  const stop = useCallback(() => {
    if (sensorRef.current) {
      sensorRef.current.stop();
      sensorRef.current = null;
    }

    metricsSchedulerRef.current.stop();

    setSession((prev) => ({
      ...prev,
      isRunning: false,
    }));
  }, []);

  /**
   * Resume paused session
   */
  const resume = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      isRunning: true,
      error: null,
      gpsAcquired: false,
    }));

    // Clear speed buffer but keep accumulated distance
    speedBufferRef.current.clear();
    rawSpeedRef.current = 0;

    // Restart metrics scheduler
    metricsSchedulerRef.current.start(() => updateSmoothedMetricsRef.current());

    // Create and start sensor
    const sensor = createRunSensor();
    sensorRef.current = sensor;

    // Subscribe to sensor samples
    const sampleCallback = (sample: RunSample) => {
      const currentLocation: LocationPoint = {
        latitude: sample.latitude,
        longitude: sample.longitude,
        altitude: sample.elevation ?? null,
        accuracy: sample.accuracy ?? 0,
        timestamp: sample.timestamp,
      };

      let distanceDelta = 0;
      if (lastLocationRef.current) {
        distanceDelta = calculateDistance(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          sample.latitude,
          sample.longitude,
        );

        if (distanceDelta < 1000) {
          distanceRef.current += distanceDelta;
          rawDistanceRef.current = distanceRef.current;
        }
      }

      let instantSpeed = 0;
      if (lastLocationRef.current && distanceDelta > 0) {
        const timeDelta =
          (sample.timestamp - lastLocationRef.current.timestamp) / 1000;
        if (timeDelta > 0) {
          instantSpeed = calculateSpeed(distanceDelta, timeDelta);
          rawSpeedRef.current = instantSpeed;
          speedBufferRef.current.add(instantSpeed);
        }
      }

      lastLocationRef.current = currentLocation;

      setSession((prev) => ({
        ...prev,
        lastLocation: currentLocation,
        locations: [...prev.locations, currentLocation],
        elevation: sample.elevation ?? null,
        gpsAcquired: (sample.accuracy ?? 100) < 50,
        error: null,
      }));
    };

    sensor.onSample(sampleCallback);
    sensor.start();
  }, []);

  /**
   * End session and show results
   */
  const finish = useCallback(() => {
    if (sensorRef.current) {
      sensorRef.current.stop();
      sensorRef.current = null;
    }

    metricsSchedulerRef.current.stop();

    setSession((prev) => ({
      ...prev,
      isRunning: false,
      isFinished: true,
    }));
  }, []);

  /**
   * Update elapsed time (called from parent with useTimer)
   * Used to recalculate pace on timer tick
   */
  const setElapsedTime = useCallback((time: number) => {
    setSession((prev) => {
      if (time === prev.elapsedTime) return prev;
      // Pace will be recalculated on next metrics update cycle
      return {
        ...prev,
        elapsedTime: time,
      };
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const scheduler = metricsSchedulerRef.current;
    const sensor = sensorRef.current;
    return () => {
      if (sensor) {
        sensor.stop();
      }
      scheduler.stop();
    };
  }, []);

  return {
    session,
    start,
    stop,
    resume,
    finish,
    setElapsedTime,
  };
}
