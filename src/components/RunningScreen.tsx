/**
 * RunningScreen - Timer, distance, metrics with NextUI premium styling
 */

import { motion } from "framer-motion";
import { Button, Alert } from "@nextui-org/react";
import { RunStats } from "./RunStats";
import { RunControls } from "./RunControls";
import { MapTracker } from "./MapTracker";
import { speedMpsToKmh } from "../utils/geolocation";

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
  coachMessage?: string | null;
  coachIsSpeaking?: boolean;
  coachMessageType?: string | null;
  coachDeviation?: number;
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
  error,
  lastLocation,
  locations,
  onStart,
  onStop,
  onResume,
  onFinish,
  coachMessage,
  coachIsSpeaking,
  coachMessageType,
  coachDeviation,
}: RunningScreenProps) {
  // keep a derived value available if needed by future UI elements
  const speedKmh = speedMpsToKmh(currentSpeed);

  return (
    <div className="app-screen w-full min-h-screen text-white overflow-hidden flex flex-col">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            isIconOnly
            onClick={onBack}
            className="border-neutral-700 w-12 h-12 brand-btn-outline flex items-center justify-center"
          >
            ←
          </Button>

          {isRunning ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--app-brand)/0.12] border border-[color:var(--app-brand)/0.2]">
              <span className="inline-flex h-2 w-2 rounded-full bg-[color:var(--app-brand)] animate-pulse" />
              <span className="text-xs font-bold text-[color:var(--app-brand)] uppercase">
                Live
              </span>
            </div>
          ) : (
            <div className="w-12" />
          )}
        </div>
      </motion.header>

      <div className="relative z-10 px-4 py-6 w-full flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-2">
          <RunStats
            elapsedTime={elapsedTime}
            distance={distance}
            currentSpeed={currentSpeed}
            pace={pace}
            isRunning={isRunning}
            gpsAcquired={gpsAcquired}
            coachMessageType={coachMessageType}
            coachIsSpeaking={coachIsSpeaking}
            coachDeviation={coachDeviation}
          />

          <div className="mt-6 w-full pointer-events-auto h-96">
            <MapTracker
              lastLocation={lastLocation}
              isRunning={isRunning}
              locations={locations}
              isSummary={!isRunning && isFinished}
            />
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 px-4 pb-4 max-w-md mx-auto w-full"
        >
          <Alert color="danger" title="Error" description={error} />
        </motion.div>
      )}

      <div className="relative z-20 px-4 pb-6">
        <RunControls
          isRunning={isRunning}
          error={error}
          onStart={onStart}
          onStop={onStop}
          onReset={() => {}}
        />
      </div>
    </div>
  );
}
