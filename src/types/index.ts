/**
 * Core types for the run tracking application
 */

export type { SavedRun } from "./run";
export type { UserProfile } from "./user";
export { DEFAULT_USER_PROFILE } from "./user";

export interface LocationPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  timestamp: number;
}

export interface RunSession {
  isRunning: boolean;
  isFinished: boolean;
  startTime: number | null;
  elapsedTime: number; // seconds
  distance: number; // meters
  currentSpeed: number; // m/s
  pace: number; // min/km (0 if no distance)
  elevation: number | null; // meters
  lastLocation: LocationPoint | null;
  locations: LocationPoint[]; // all location points during run
  gpsAcquired: boolean;
  error: string | null;
}

export interface GeolocationError {
  code: number;
  message: string;
}
