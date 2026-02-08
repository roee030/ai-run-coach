/**
 * RunTracker - Container: hooks + screen switching to RunningScreen
 * Business logic only; UI delegated to RunningScreen.
 */

import { useEffect } from "react";
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

  const handleStart = () => {
    resetTimer();
    start();
  };

  const handleStop = () => {
    stop();
  };

  const handleResume = () => {
    resume();
  };

  const handleFinish = () => {
    finish();
  };

  return (
    <RunningScreen
      onBack={onBack}
      elapsedTime={elapsedTime}
      distance={session.distance}
      pace={session.pace}
      currentSpeed={session.currentSpeed}
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
    />
  );
}
