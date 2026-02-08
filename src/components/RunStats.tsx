/**
 * RunStats component - displays running metrics
 */

import { MetricCard } from "./MetricCard";
import {
  formatDistance,
  formatPace,
  speedMpsToKmh,
} from "../utils/geolocation";
import { formatTime } from "../utils/formatting";

interface RunStatsProps {
  elapsedTime: number;
  distance: number;
  currentSpeed: number;
  pace: number;
  isRunning: boolean;
  gpsAcquired: boolean;
}

export function RunStats({
  elapsedTime,
  distance,
  currentSpeed,
  pace,
  isRunning,
  gpsAcquired,
}: RunStatsProps) {
  const speedKmh = speedMpsToKmh(currentSpeed);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-4xl mx-auto w-full">
      {/* Timer - Main Hero Section */}
      <div className="mb-16 text-center">
        <div className="text-display-lg font-bold text-brand-primary font-mono tabular-nums mb-4">
          {formatTime(elapsedTime)}
        </div>
        <div className="text-subtitle text-text-secondary uppercase tracking-widest font-600">
          {isRunning
            ? gpsAcquired
              ? "Active Run"
              : "Acquiring GPS…"
            : "Ready to run"}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="w-full grid grid-cols-2 gap-6 max-w-2xl">
        {/* Distance Card */}
        <MetricCard
          label="Distance"
          value={formatDistance(distance)}
          unit="km"
        />

        {/* Pace Card */}
        <MetricCard label="Pace" value={formatPace(pace)} unit="min/km" />

        {/* Speed Card */}
        <MetricCard label="Speed" value={speedKmh.toFixed(1)} unit="km/h" />

        {/* Elevation Card */}
        <MetricCard label="Elevation" value="--" unit="m" />
      </div>
    </div>
  );
}
