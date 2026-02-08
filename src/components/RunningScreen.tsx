/**
 * RunningScreen - Timer, distance, metrics, bottom bar with separate button + label
 * Uses CSS design tokens so colors and typography always apply.
 */

import { MetricCard } from "./MetricCard";
import { MapTracker } from "./MapTracker";
import { formatTime } from "../utils/formatting";
import {
  formatDistance,
  formatPace,
  speedMpsToKmh,
} from "../utils/geolocation";

interface RunningScreenProps {
  onBack: () => void;
  elapsedTime: number;
  distance: number;
  pace: number;
  currentSpeed: number;
  isRunning: boolean;
  isFinished: boolean;
  gpsAcquired: boolean;
  error: string | null;
  lastLocation: any;
  locations: any[];
  onStart: () => void;
  onStop: () => void;
  onResume: () => void;
  onFinish: () => void;
}

export function RunningScreen({
  onBack,
  elapsedTime,
  distance,
  pace,
  currentSpeed,
  isRunning,
  isFinished,
  gpsAcquired,
  lastLocation,
  locations,
  error,
  onStart,
  onStop,
  onResume,
  onFinish,
}: RunningScreenProps) {
  const speedKmh = speedMpsToKmh(currentSpeed);

  return (
    <div className="flex flex-col min-h-screen md:min-h-full w-full app-bg app-text overflow-hidden">
      {/* Header */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 safe-top max-w-[640px] mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="w-12 h-12 rounded-full app-surface border border-white/10 flex items-center justify-center app-text-secondary hover:bg-white/10 hover:app-text transition-colors app-shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
          aria-label="Back to home"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
          </svg>
        </button>
        {isRunning && (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full app-brand-pill app-shadow-card">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--app-brand)] animate-pulse"
              aria-hidden
            />
            <span className="app-label app-brand-text">Live</span>
          </div>
        )}
        {!isRunning && <div className="w-12" />}
      </header>

      {/* Timer */}
      <div className="relative z-10 flex-shrink-0 flex flex-col items-center justify-center pt-4 pb-6 sm:pt-6 sm:pb-8 px-4">
        <div className="app-timer app-text">{formatTime(elapsedTime)}</div>
        <p className="app-label app-text-secondary mt-3">Time</p>
        {isRunning && (
          <p className="app-label mt-1 app-text-muted">
            {gpsAcquired ? "GPS locked" : "Acquiring GPS…"}
          </p>
        )}
      </div>

      {/* Distance */}
      <div className="relative z-10 flex-shrink-0 flex flex-col items-center pb-2">
        <div className="app-distance app-text">{formatDistance(distance)}</div>
        <p className="app-label app-text-secondary mt-1">km</p>
      </div>

      {/* Metric cards */}
      <div className="relative z-10 flex-1 px-4 sm:px-6 py-6 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 max-w-[640px] mx-auto mb-6">
          <MetricCard label="Pace" value={formatPace(pace)} unit="min/km" />
          <MetricCard label="Speed" value={speedKmh.toFixed(1)} unit="km/h" />
        </div>

        {/* Map Tracker */}
        {!isFinished && (
          <div className="max-w-[640px] mx-auto pointer-events-auto">
            <MapTracker lastLocation={lastLocation} isRunning={isRunning} />
          </div>
        )}

        {/* Summary Map */}
        {isFinished && (
          <div className="max-w-[640px] mx-auto pointer-events-auto h-96">
            <MapTracker
              lastLocation={lastLocation}
              isRunning={false}
              locations={locations}
              isSummary={true}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="relative z-10 px-4 pb-4 max-w-[640px] mx-auto w-full">
          <div className="rounded-2xl app-danger-bg px-4 py-3 app-shadow-card">
            <p className="text-sm font-bold app-danger-text">{error}</p>
          </div>
        </div>
      )}

      {/* Bottom bar – always visible, explicit background; button and label separate */}
      <div className="relative z-20 flex-shrink-0 safe-bottom app-elevated border-t border-white/10 app-shadow-bar">
        <div className="px-4 sm:px-6 py-5 sm:py-6">
          <div className="max-w-[640px] mx-auto flex flex-col items-center gap-4">
            {isFinished ? (
              <>
                <div className="text-center mb-4">
                  <h2 className="text-2xl font-bold app-text mb-2">
                    Run Complete!
                  </h2>
                  <p className="app-label app-text-secondary">
                    Here's your summary
                  </p>
                </div>
                <div className="w-full grid grid-cols-2 gap-4 mb-6">
                  <div className="app-surface rounded-2xl px-4 py-4 text-center app-shadow-card">
                    <p className="app-label app-text-secondary mb-1">
                      Distance
                    </p>
                    <p className="text-2xl font-bold app-text">
                      {formatDistance(distance)}
                    </p>
                    <p className="app-label app-text-secondary">km</p>
                  </div>
                  <div className="app-surface rounded-2xl px-4 py-4 text-center app-shadow-card">
                    <p className="app-label app-text-secondary mb-1">Time</p>
                    <p className="text-2xl font-bold app-text">
                      {formatTime(elapsedTime)}
                    </p>
                  </div>
                  <div className="app-surface rounded-2xl px-4 py-4 text-center app-shadow-card">
                    <p className="app-label app-text-secondary mb-1">Pace</p>
                    <p className="text-2xl font-bold app-text">
                      {formatPace(pace)}
                    </p>
                    <p className="app-label app-text-secondary">min/km</p>
                  </div>
                  <div className="app-surface rounded-2xl px-4 py-4 text-center app-shadow-card">
                    <p className="app-label app-text-secondary mb-1">
                      Average Speed
                    </p>
                    <p className="text-2xl font-bold app-text">
                      {speedKmh.toFixed(1)}
                    </p>
                    <p className="app-label app-text-secondary">km/h</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onBack}
                  className="w-16 h-16 rounded-full app-brand app-shadow-button flex items-center justify-center hover:opacity-95 active:scale-95 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--app-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-elevated)]"
                  aria-label="Done"
                >
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <span className="app-label app-text font-semibold">Done</span>
              </>
            ) : isRunning ? (
              <>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full bg-white/30"
                    aria-hidden
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-white/30"
                    aria-hidden
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-white/60"
                    aria-hidden
                  />
                </div>
                <button
                  type="button"
                  onClick={onStop}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full app-danger app-shadow-stop flex items-center justify-center hover:opacity-95 active:scale-95 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--app-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-elevated)] pointer-events-auto cursor-pointer"
                  aria-label="Pause run"
                >
                  <svg
                    className="w-8 h-8 sm:w-10 sm:h-10 text-white pointer-events-none"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5zm8 0a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                  </svg>
                </button>
                <span className="app-label app-text font-semibold">Pause</span>
              </>
            ) : elapsedTime > 0 ? (
              // Paused state - show Resume and Stop text buttons
              <>
                <div className="flex items-center justify-center gap-8">
                  <button
                    type="button"
                    onClick={onResume}
                    className="px-6 py-3 rounded-lg app-brand hover:opacity-90 active:opacity-75 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-elevated)] pointer-events-auto cursor-pointer"
                    aria-label="Resume run"
                  >
                    <span className="app-text font-semibold pointer-events-none">
                      Resume
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onFinish}
                    className="px-6 py-3 rounded-lg app-surface border border-white/30 hover:bg-white/10 active:bg-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-elevated)] pointer-events-auto cursor-pointer"
                    aria-label="Stop run"
                  >
                    <span className="app-text font-semibold pointer-events-none">
                      Stop
                    </span>
                  </button>
                </div>
              </>
            ) : (
              // Initial state - show Start button
              <>
                <button
                  type="button"
                  onClick={onStart}
                  className="w-16 h-16 rounded-full app-brand app-shadow-button flex items-center justify-center hover:opacity-95 active:scale-95 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--app-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-elevated)] pointer-events-auto cursor-pointer"
                  aria-label="Start run"
                >
                  <svg
                    className="w-8 h-8 text-white pointer-events-none"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>
                <span className="app-label app-text font-semibold">Start</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
