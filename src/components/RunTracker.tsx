/**
 * RunTracker - Container: hooks + run lifecycle (start / pause / resume / finish)
 * Business logic only; UI delegated to RunningScreen + CoachDevPanel (DEV).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardBody } from "@nextui-org/react";
import useCoachEngine from "../hooks/useCoachEngine";
import type { ThoughtEntry } from "../hooks/useCoachEngine";
import { CoachDevPanel } from "./CoachDevPanel";
import type { SimState, Scenario } from "./CoachDevPanel";
import { useRunTracker } from "../hooks/useRunTracker";
import { useTimer } from "../hooks/useTimer";
import { RunningScreen } from "./RunningScreen";
import { useActiveWorkout } from "../hooks/useActiveWorkout";
import { useWorkoutCoach } from "../hooks/useWorkoutCoach";
import { WorkoutHUD } from "./WorkoutHUD";
import type { Workout } from "../types/workout";
import type { RunSummaryData } from "../App";

// ─── Scenario definitions ─────────────────────────────────────────────────────

function buildSimState(scenario: Scenario, basePace: number, easyPace: number | null, incline: number): SimState {
  switch (scenario) {
    case "sprint":
      return { scenario, paceOverride: basePace * 0.65, hrSimulated: 175, cadenceSimulated: 185, incline: 0 };
    case "fade": {
      // Incline penalty: +0.05 min/km per 1% grade
      const fadePace = basePace * 1.40 + incline * 0.05;
      return { scenario, paceOverride: fadePace, hrSimulated: 148, cadenceSimulated: 158, incline };
    }
    case "steady":
      return { scenario, paceOverride: easyPace ?? basePace, hrSimulated: 142, cadenceSimulated: 168, incline: 0 };
    default:
      return { scenario: null, paceOverride: null, hrSimulated: 145, cadenceSimulated: 170, incline };
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RunTrackerProps {
  onBack: () => void;
  onFinish: (data: RunSummaryData) => void;
  autoStart?: boolean;
  sessionIntent?: string;
  activeWorkout?: Workout | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RunTracker({ onBack, onFinish, autoStart, sessionIntent, activeWorkout }: RunTrackerProps) {
  const sessionIntentRef = useRef(sessionIntent ?? "");
  const { session, start, pause, stop, resume, setElapsedTime } = useRunTracker();
  const [isPaused, setIsPaused] = useState(false);

  const { elapsedTime, reset: resetTimer } = useTimer(session.isRunning && !isPaused);
  useEffect(() => { setElapsedTime(elapsedTime); }, [elapsedTime, setElapsedTime]);

  // Wake lock
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const requestWakeLock = async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock?.request) wakeLockRef.current = await nav.wakeLock.request("screen");
    } catch { /* ignore */ }
  };
  const releaseWakeLock = async () => {
    try { if (wakeLockRef.current) { await wakeLockRef.current.release(); wakeLockRef.current = null; } } catch { /* ignore */ }
  };

  const handleStart  = async () => { resetTimer(); setIsPaused(false); await requestWakeLock(); start(); };
  const handlePause  = () => { setIsPaused(true);  pause(); };
  const handleResume = () => { setIsPaused(false); resume(); };
  // getRunReport is assigned after useCoachEngine is called; this ref lets handleFinish capture it stably
  const getRunReportRef = useRef<(() => RunSummaryData["runReport"]) | null>(null);
  // Capture mutable values in refs so handleFinish always reads the latest,
  // regardless of when React re-renders the closure.
  const composedDistanceRef = useRef(0);
  const composedPaceRef     = useRef(0);
  const elapsedTimeRef      = useRef(0);
  const locationsRef        = useRef<typeof session.locations>([]);

  const handleFinish = () => {
    const report = getRunReportRef.current?.() ?? null;
    // Snapshot data first, then tear down — stop() only changes isRunning,
    // but capturing before avoids any React batching surprises.
    const finishData = {
      distance:    composedDistanceRef.current,
      elapsedTime: elapsedTimeRef.current,
      pace:        composedPaceRef.current,
      intent:      sessionIntentRef.current,
      runReport:   report,
      locations:   locationsRef.current,
    };
    stop();
    setIsPaused(false);
    void releaseWakeLock(); // fire-and-forget — never blocks navigation
    onFinish(finishData);
  };

  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (!autoStart || hasAutoStarted.current) return;
    hasAutoStarted.current = true;
    const id = window.setTimeout(() => { void handleStart(); }, 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Easy pace from onboarding (used for "steady" scenario) ──────────────────
  const easyPaceRef = useRef<number | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding");
      if (raw) {
        const parsed = JSON.parse(raw) as { easyPace?: string };
        if (parsed.easyPace) {
          const [m, s] = parsed.easyPace.split(":").map(Number);
          easyPaceRef.current = m + s / 60;
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ── Simulation state ──────────────────────────────────────────────────────────
  const [simState, setSimState] = useState<SimState>({
    scenario: null, paceOverride: null,
    hrSimulated: 145, cadenceSimulated: 170, incline: 0,
  });
  const scenarioClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScenario = useCallback((s: Scenario) => {
    if (scenarioClearRef.current) clearTimeout(scenarioClearRef.current);
    const basePace = session.pace > 0 ? session.pace : 5.5;
    const newState = buildSimState(s, basePace, easyPaceRef.current, simState.incline);
    setSimState(newState);
    if (s !== null) {
      scenarioClearRef.current = setTimeout(() => {
        setSimState(prev => ({ ...prev, scenario: null, paceOverride: null }));
      }, 30_000);
    }
  }, [session.pace, simState.incline]);

  const handleInclineChange = useCallback((v: number) => {
    setSimState(prev => {
      if (prev.scenario === "fade") {
        const basePace = session.pace > 0 ? session.pace : 5.5;
        return { ...prev, incline: v, paceOverride: basePace * 1.40 + v * 0.05 };
      }
      return { ...prev, incline: v };
    });
  }, [session.pace]);

  // ── Composed run metrics: scenario sim overrides real GPS ─────────────────────
  // Pace = 60 / speed_kmh; speed_ms = speed_kmh / 3.6. We derive speed FROM pace for consistency.
  const composedDistance = session.distance;
  const composedPace     = simState.paceOverride ?? session.pace;
  // Speed must equal 60/pace (km/h) → /3.6 → m/s to keep Pace=60/Speed consistent
  const composedCurrentSpeed = composedPace > 0 ? (60 / composedPace) / 3.6 : session.currentSpeed;

  // Keep finish-data refs in sync every render so handleFinish always snapshots latest values.
  composedDistanceRef.current = composedDistance;
  composedPaceRef.current     = composedPace;
  elapsedTimeRef.current      = elapsedTime;
  locationsRef.current        = session.locations;

  // ── Cumulative altitude gain tracking ─────────────────────────────────────────
  const prevElevationRef   = useRef<number | null>(null);
  const altitudeGainMRef   = useRef(0);
  useEffect(() => {
    const elev = session.elevation;
    if (elev !== null && elev !== undefined) {
      if (prevElevationRef.current !== null && elev > prevElevationRef.current) {
        altitudeGainMRef.current += elev - prevElevationRef.current;
      }
      prevElevationRef.current = elev;
    }
  }, [session.elevation]);

  // ── Thought log ───────────────────────────────────────────────────────────────
  const [thoughtLog, setThoughtLog] = useState<ThoughtEntry[]>([]);
  const addThought = useCallback((entry: ThoughtEntry) => {
    setThoughtLog(prev => [...prev.slice(-299), entry]);
  }, []);
  const clearThoughtLog = useCallback(() => setThoughtLog([]), []);

  // ── Coach engine ──────────────────────────────────────────────────────────────
  const composedRunState = {
    distance: composedDistance,
    pace: composedPace,
    elapsedTime,
    isRunning: session.isRunning,
    isPaused,
    isFinished: session.isFinished,
    sessionIntent: sessionIntentRef.current,
    altitudeM: session.elevation ?? null,
    // In DEV, feed simulated HR so the HR fatigue rule can be tested; null in production
    heartRate: import.meta.env.DEV ? simState.hrSimulated : null,
  };

  const { currentMessage, isSpeaking, messageType, isCoachSatisfied, debug, getRunReport } =
    useCoachEngine(composedRunState, import.meta.env.DEV ? addThought : undefined);

  // Wire the stable getRunReport function into the ref so handleFinish can call it
  getRunReportRef.current = getRunReport;

  // ── Structured workout step tracking ─────────────────────────────────────────
  const { currentStep, nextStep, stepIdx, totalSteps, remaining, progress } =
    useActiveWorkout(activeWorkout ?? null, elapsedTime, composedDistance, session.isRunning);
  const { workoutMessage } = useWorkoutCoach(currentStep, composedPace, composedRunState.heartRate);

  const workoutHud = activeWorkout ? (
    <WorkoutHUD
      workoutName={activeWorkout.name}
      currentStep={currentStep}
      nextStep={nextStep}
      stepIdx={stepIdx}
      totalSteps={totalSteps}
      remaining={remaining}
      progress={progress}
      workoutMessage={workoutMessage}
    />
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen w-full"
      style={import.meta.env.DEV ? { paddingBottom: 420 } : undefined}
    >
      {/* Coach message bubble — floats above the map, pointer-events-none */}
      {currentMessage && (
        <div className="absolute top-16 left-4 right-4 z-30 pointer-events-none">
          <CoachBubble currentMessage={currentMessage} isSpeaking={isSpeaking} />
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
        isCoachSatisfied={isCoachSatisfied}
        workoutHud={workoutHud}
      />

      {/* Command Center — DEV only, fixed bottom */}
      {import.meta.env.DEV && (
        <CoachDevPanel
          debug={debug}
          isCoachSatisfied={isCoachSatisfied}
          isSpeaking={isSpeaking}
          simState={simState}
          thoughtLog={thoughtLog}
          altitudeM={session.elevation}
          onScenario={handleScenario}
          onInclineChange={handleInclineChange}
          onClearLog={clearThoughtLog}
        />
      )}
    </motion.div>
  );
}

// ─── Coach message bubble ─────────────────────────────────────────────────────

function CoachBubble({
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
        isSpeaking ? "shadow-[0_0_40px_rgba(212,255,0,0.3)] border-[#d4ff00]/30" : ""
      }`}
    >
      <CardBody className="p-4 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Coach</p>
        <p className="mt-1 text-base font-black text-white">{currentMessage}</p>
      </CardBody>
    </Card>
  );
}
