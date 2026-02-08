/**
 * useRunTracker hook - manages geolocation tracking and session state
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationPoint, RunSession } from "../types";
import {
  calculateDistance,
  calculatePace,
  calculateSpeed,
  getGeolocationErrorMessage,
} from "../utils/geolocation";

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
  const watchIdRef = useRef<number | null>(null);
  const lastLocationRef = useRef<LocationPoint | null>(null);
  const distanceRef = useRef(0);
  const speedBufferRef = useRef<number[]>([]);

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

    lastLocationRef.current = null;
    distanceRef.current = 0;
    speedBufferRef.current = [];

    // Request geolocation tracking with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, altitude, accuracy } = position.coords;
        const timestamp = position.timestamp;

        const currentLocation: LocationPoint = {
          latitude,
          longitude,
          altitude,
          accuracy,
          timestamp,
        };

        // Calculate distance on first location or between locations
        let distanceDelta = 0;
        if (lastLocationRef.current) {
          distanceDelta = calculateDistance(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            latitude,
            longitude,
          );

          // Only add distance if delta is reasonable (filter noise)
          if (distanceDelta < 1000) {
            // ignore jumps > 1km
            distanceRef.current += distanceDelta;
          }
        }

        // Calculate current speed
        let currentSpeed = 0;
        if (lastLocationRef.current && distanceDelta > 0) {
          const timeDelta =
            (timestamp - lastLocationRef.current.timestamp) / 1000; // convert to seconds
          if (timeDelta > 0) {
            currentSpeed = calculateSpeed(distanceDelta, timeDelta);
            // Keep last 10 speeds for smoothing
            speedBufferRef.current.push(currentSpeed);
            if (speedBufferRef.current.length > 10) {
              speedBufferRef.current.shift();
            }
          }
        }

        // Average speed for smoother display
        const avgSpeed =
          speedBufferRef.current.length > 0
            ? speedBufferRef.current.reduce((a, b) => a + b, 0) /
              speedBufferRef.current.length
            : 0;

        lastLocationRef.current = currentLocation;

        setSession((prev) => {
          const pace = calculatePace(distanceRef.current, prev.elapsedTime);
          return {
            ...prev,
            distance: distanceRef.current,
            currentSpeed: avgSpeed,
            pace,
            lastLocation: currentLocation,
            locations: [...prev.locations, currentLocation],
            elevation: altitude,
            gpsAcquired: accuracy < 50, // GPS considered acquired if accuracy < 50m
            error: null,
          };
        });
      },
      (error) => {
        const errorMessage = getGeolocationErrorMessage(error.code);
        setSession((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, []);

  /**
   * Stop running session
   */
  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

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

    speedBufferRef.current = [];

    // Request geolocation tracking with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, altitude, accuracy } = position.coords;
        const timestamp = position.timestamp;

        const currentLocation: LocationPoint = {
          latitude,
          longitude,
          altitude,
          accuracy,
          timestamp,
        };

        // Calculate distance on first location or between locations
        let distanceDelta = 0;
        if (lastLocationRef.current) {
          distanceDelta = calculateDistance(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            latitude,
            longitude,
          );

          // Only add distance if delta is reasonable (filter noise)
          if (distanceDelta < 1000) {
            // ignore jumps > 1km
            distanceRef.current += distanceDelta;
          }
        }

        // Calculate current speed
        let currentSpeed = 0;
        if (lastLocationRef.current && distanceDelta > 0) {
          const timeDelta =
            (timestamp - lastLocationRef.current.timestamp) / 1000; // convert to seconds
          if (timeDelta > 0) {
            currentSpeed = calculateSpeed(distanceDelta, timeDelta);
            // Keep last 10 speeds for smoothing
            speedBufferRef.current.push(currentSpeed);
            if (speedBufferRef.current.length > 10) {
              speedBufferRef.current.shift();
            }
          }
        }

        // Average speed for smoother display
        const avgSpeed =
          speedBufferRef.current.length > 0
            ? speedBufferRef.current.reduce((a, b) => a + b, 0) /
              speedBufferRef.current.length
            : 0;

        lastLocationRef.current = currentLocation;

        setSession((prev) => {
          const pace = calculatePace(distanceRef.current, prev.elapsedTime);
          return {
            ...prev,
            distance: distanceRef.current,
            currentSpeed: avgSpeed,
            pace,
            lastLocation: currentLocation,
            locations: [...prev.locations, currentLocation],
            elevation: altitude,
            gpsAcquired: accuracy < 50, // GPS considered acquired if accuracy < 50m
            error: null,
          };
        });
      },
      (error) => {
        const errorMessage = getGeolocationErrorMessage(error.code);
        setSession((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, []);

  /**
   * End session and show results
   */
  const finish = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setSession((prev) => ({
      ...prev,
      isRunning: false,
      isFinished: true,
    }));
  }, []);

  /**
   * Update elapsed time (called from parent with useTimer)
   */
  const setElapsedTime = useCallback((time: number) => {
    setSession((prev) => {
      const pace = calculatePace(distanceRef.current, time);
      return {
        ...prev,
        elapsedTime: time,
        pace,
      };
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
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
