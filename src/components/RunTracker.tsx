/**
 * RunTracker - Container: hooks + screen switching to RunningScreen
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

interface RunTrackerProps {
  onBack: () => void;
}

export function RunTracker({ onBack }: RunTrackerProps) {
  const { session, start, stop, resume, finish, setElapsedTime } =
    useRunTracker();
  const { elapsedTime, reset: resetTimer } = useTimer(session.isRunning);

  useEffect(() => {
    setElapsedTime(elapsedTime);
  }, [elapsedTime, setElapsedTime]);

  // Wake lock ref to keep screen on during runs
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      // @ts-ignore
      if ((navigator as any).wakeLock?.request) {
        // @ts-ignore
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          "screen",
        );
      }
    } catch (e) {
      // ignore
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (e) {
      // ignore
    }
  };

  const handleStart = async () => {
    resetTimer();
    await requestWakeLock();
    start();
  };

  const handleStop = async () => {
    stop();
    await releaseWakeLock();
  };

  const handleResume = () => {
    resume();
  };

  const handleFinish = async () => {
    finish();
    await releaseWakeLock();
  };

  const runState = {
    distance: session.distance,
    pace: session.pace,
    elapsedTime,
    isRunning: session.isRunning,
    isFinished: session.isFinished,
  };

  // Debug overrides (DEV): allow adjusting speed/pace/distance and keep them linked
  const [overrideSpeedKmh, setOverrideSpeedKmh] = useState<number | null>(null);
  const [overridePaceMinPerKm, setOverridePaceMinPerKm] = useState<
    number | null
  >(null);
  const [overrideDistanceMeters, setOverrideDistanceMeters] = useState<
    number | null
  >(null);

  const setSpeedKmh = useCallback((v: number | null) => {
    if (v === null) {
      setOverrideSpeedKmh(null);
      setOverridePaceMinPerKm(null);
      return;
    }
    const pace = v > 0 ? 60 / v : 0;
    setOverrideSpeedKmh(v);
    setOverridePaceMinPerKm(pace);
  }, []);

  const setPaceMinPerKm = useCallback((v: number | null) => {
    if (v === null) {
      setOverridePaceMinPerKm(null);
      setOverrideSpeedKmh(null);
      return;
    }
    const speed = v > 0 ? 60 / v : 0; // km/h
    setOverridePaceMinPerKm(v);
    setOverrideSpeedKmh(Number(speed.toFixed(2)));
  }, []);

  const setDistanceMeters = useCallback((v: number | null) => {
    setOverrideDistanceMeters(v);
  }, []);

  // Compose runState overrides for coach and UI
  const composedDistance = overrideDistanceMeters ?? session.distance;
  const composedPace = overridePaceMinPerKm ?? session.pace;
  // convert overrideSpeedKmh (km/h) to m/s for currentSpeed; if no override, use session.currentSpeed
  const composedCurrentSpeed =
    overrideSpeedKmh != null ? overrideSpeedKmh / 3.6 : session.currentSpeed;

  const composedRunState = {
    distance: composedDistance,
    pace: composedPace,
    elapsedTime,
    isRunning: session.isRunning,
    isFinished: session.isFinished,
  };

  // Lift coach hook here so we can pass message state to stats UI
  const { currentMessage, isSpeaking, messageType, debug } =
    useCoachEngine(composedRunState);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen w-full bg-black flex items-start justify-center"
    >
      <div className="w-full max-w-md mx-auto">
        {/* Coach message card */}
        <div className="mb-4">
          <CoachMessage
            currentMessage={currentMessage}
            isSpeaking={isSpeaking}
            messageType={messageType}
          />
        </div>
        {import.meta.env.DEV && (
          <CoachDebugOverlay
            debug={debug}
            speedKmh={overrideSpeedKmh}
            paceMinPerKm={overridePaceMinPerKm}
            distanceMeters={overrideDistanceMeters}
            onSetSpeedKmh={setSpeedKmh}
            onSetPaceMinPerKm={setPaceMinPerKm}
            onSetDistanceMeters={setDistanceMeters}
          />
        )}
        <RunningScreen
          onBack={onBack}
          elapsedTime={elapsedTime}
          distance={composedDistance}
          pace={composedPace}
          currentSpeed={composedCurrentSpeed}
          isRunning={session.isRunning}
          isFinished={session.isFinished}
          gpsAcquired={session.gpsAcquired}
          error={session.error}
          lastLocation={session.lastLocation}
          locations={session.locations}
          onStart={handleStart}
          onStop={handleStop}
          onResume={handleResume}
          onFinish={handleFinish}
          coachMessage={currentMessage}
          coachIsSpeaking={isSpeaking}
          coachMessageType={messageType}
          coachDeviation={debug?.deviation ?? 0}
        />
      </div>
    </motion.div>
  );
}

function CoachMessage({
  currentMessage,
  isSpeaking,
  messageType,
}: {
  currentMessage: string | null;
  isSpeaking: boolean;
  messageType: any;
}) {
  if (!currentMessage) return null;

  return (
    <Card
      isHoverable
      className={`bg-neutral-900 border border-white/10 ${
        isSpeaking
          ? "shadow-[0_0_40px_rgba(30,215,96,0.45)] border-success-500/60"
          : ""
      }`}
    >
      <CardBody className="p-4 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wider">Coach</p>
        <p className="mt-2 text-base font-black text-white">{currentMessage}</p>
        <p className="text-xs text-gray-500 mt-2">
          {isSpeaking ? "Speaking…" : ""}
        </p>
      </CardBody>
    </Card>
  );
}
