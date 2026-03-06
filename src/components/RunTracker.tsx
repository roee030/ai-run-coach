/**
 * RunTracker - Container: hooks + run lifecycle (start / pause / resume / finish)
 * Business logic only; UI delegated to RunningScreen.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardBody } from "@nextui-org/react";
import useCoachEngine from "../hooks/useCoachEngine";
import { CoachDebugOverlay } from "./CoachDebugOverlay";
import { useRunTracker } from "../hooks/useRunTracker";
import { useTimer } from "../hooks/useTimer";
import { RunningScreen } from "./RunningScreen";
import type { RunSummaryData } from "../App";

interface RunTrackerProps {
  onBack: () => void;
  onFinish: (data: RunSummaryData) => void;
  autoStart?: boolean;
  sessionIntent?: string;
}

export function RunTracker({ onBack, onFinish, autoStart, sessionIntent }: RunTrackerProps) {
  // Stored for future coach context — not yet wired into prompts
  const sessionIntentRef = useRef(sessionIntent ?? "");
  const { session, start, stop, setElapsedTime } = useRunTracker();
  const [isPaused, setIsPaused] = useState(false);

  // Timer runs only when GPS is active AND not paused
  const { elapsedTime, reset: resetTimer } = useTimer(session.isRunning && !isPaused);

  useEffect(() => {
    setElapsedTime(elapsedTime);
  }, [elapsedTime, setElapsedTime]);

  // Wake lock ref to keep screen on during runs
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const requestWakeLock = async () => {
    try {
      const nav = navigator as unknown as {
        wakeLock?: { request: (type: string) => Promise<{ release: () => Promise<void> }> };
      };
      if (nav.wakeLock?.request) {
        wakeLockRef.current = await nav.wakeLock.request("screen");
      }
    } catch {
      // ignore — wake lock not supported
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  const handleStart = async () => {
    resetTimer();
    setIsPaused(false);
    await requestWakeLock();
    start();
  };

  const handlePause = () => setIsPaused(true);

  const handleResume = () => setIsPaused(false);

  // Called after "Finish Run?" is confirmed — collects snapshot data
  const handleFinish = async () => {
    stop();
    await releaseWakeLock();
    setIsPaused(false);
    onFinish({
      distance: composedDistance,
      elapsedTime,
      pace: composedPace,
      intent: sessionIntentRef.current,
    });
  };

  // Auto-start the run immediately when this screen mounts (from Home screen START button)
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    // Defer so setState inside handleStart runs outside the synchronous effect body
    const id = window.setTimeout(() => { void handleStart(); }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only; autoStart is immutable config, not reactive

  // Debug overrides (DEV only): allow adjusting speed/pace/distance
  const [overrideSpeedKmh, setOverrideSpeedKmh] = useState<number | null>(null);
  const [overridePaceMinPerKm, setOverridePaceMinPerKm] = useState<number | null>(null);
  const [overrideDistanceMeters, setOverrideDistanceMeters] = useState<number | null>(null);

  const setSpeedKmh = useCallback((v: number | null) => {
    if (v === null) {
      setOverrideSpeedKmh(null);
      setOverridePaceMinPerKm(null);
      return;
    }
    setOverrideSpeedKmh(v);
    setOverridePaceMinPerKm(v > 0 ? 60 / v : 0);
  }, []);

  const setPaceMinPerKm = useCallback((v: number | null) => {
    if (v === null) {
      setOverridePaceMinPerKm(null);
      setOverrideSpeedKmh(null);
      return;
    }
    setOverridePaceMinPerKm(v);
    setOverrideSpeedKmh(Number((v > 0 ? 60 / v : 0).toFixed(2)));
  }, []);

  const setDistanceMeters = useCallback((v: number | null) => {
    setOverrideDistanceMeters(v);
  }, []);

  // Composed values (debug overrides take priority in DEV)
  const composedDistance = overrideDistanceMeters ?? session.distance;
  const composedPace = overridePaceMinPerKm ?? session.pace;
  const composedCurrentSpeed =
    overrideSpeedKmh != null ? overrideSpeedKmh / 3.6 : session.currentSpeed;

  const composedRunState = {
    distance: composedDistance,
    pace: composedPace,
    elapsedTime,
    isRunning: session.isRunning,
    isFinished: session.isFinished,
    sessionIntent: sessionIntentRef.current,
  };

  const { currentMessage, isSpeaking, messageType, debug } =
    useCoachEngine(composedRunState);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen w-full"
    >
      {/* Coach message — floats above the map */}
      {currentMessage && (
        <div className="absolute top-16 left-4 right-4 z-30 pointer-events-none">
          <CoachMessage currentMessage={currentMessage} isSpeaking={isSpeaking} />
        </div>
      )}

      {/* DEV debug overlay */}
      {import.meta.env.DEV && (
        <div className="absolute bottom-0 left-0 right-0 z-40">
          <CoachDebugOverlay
            debug={debug}
            speedKmh={overrideSpeedKmh}
            paceMinPerKm={overridePaceMinPerKm}
            distanceMeters={overrideDistanceMeters}
            onSetSpeedKmh={setSpeedKmh}
            onSetPaceMinPerKm={setPaceMinPerKm}
            onSetDistanceMeters={setDistanceMeters}
          />
        </div>
      )}

      <RunningScreen
        onBack={onBack}
        elapsedTime={elapsedTime}
        distance={composedDistance}
        pace={composedPace}
        currentSpeed={composedCurrentSpeed}
        isRunning={session.isRunning}
        isPaused={isPaused}
        isFinished={session.isFinished}
        gpsAcquired={session.gpsAcquired}
        error={session.error}
        lastLocation={session.lastLocation}
        locations={session.locations}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleFinish}
        coachMessage={currentMessage}
        coachIsSpeaking={isSpeaking}
        coachMessageType={messageType}
        coachDeviation={debug?.deviation ?? 0}
      />
    </motion.div>
  );
}

function CoachMessage({
  currentMessage,
  isSpeaking,
}: {
  currentMessage: string | null;
  isSpeaking: boolean;
}) {
  if (!currentMessage) return null;

  return (
    <Card
      isHoverable
      className={`bg-neutral-900/80 border border-white/10 backdrop-blur-md ${
        isSpeaking
          ? "shadow-[0_0_40px_rgba(212,255,0,0.3)] border-[#d4ff00]/30"
          : ""
      }`}
    >
      <CardBody className="p-4 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Coach</p>
        <p className="mt-1 text-base font-black text-white">{currentMessage}</p>
      </CardBody>
    </Card>
  );
}
