/**
 * useActiveWorkout — tracks the current step during a structured workout run.
 * Advances automatically when a time/distance step is complete.
 * Returns rich metadata for the WorkoutHUD display.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Workout, ActiveStep } from "../types/workout";
import { flattenWorkout } from "../types/workout";

export interface ActiveWorkoutState {
  currentStep:  ActiveStep | null;
  nextStep:     ActiveStep | null;
  stepIdx:      number;
  totalSteps:   number;
  remaining:    number | null;   // seconds or metres remaining in current step
  progress:     number;          // 0–1 fraction of current step elapsed
  advanceLap:   () => void;      // call when user taps lap / "open" step
}

export function useActiveWorkout(
  workout:   Workout | null,
  elapsedTime: number,           // total run seconds
  distance:    number,           // total run metres
  isRunning:   boolean,
): ActiveWorkoutState {
  const flatSteps = useMemo(() => (workout ? flattenWorkout(workout) : []), [workout]);

  const [stepIdx, setStepIdx] = useState(0);
  const stepStartRef = useRef({ time: 0, distance: 0 });
  const prevIsRunning = useRef(false);

  // Reset to step 0 when run starts
  useEffect(() => {
    if (isRunning && !prevIsRunning.current) {
      setStepIdx(0);
      stepStartRef.current = { time: elapsedTime, distance };
    }
    prevIsRunning.current = isRunning;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const currentStep = flatSteps[stepIdx] ?? null;

  const advanceStep = useCallback(() => {
    setStepIdx(prev => {
      if (prev < flatSteps.length - 1) {
        stepStartRef.current = { time: elapsedTime, distance };
        return prev + 1;
      }
      return prev;
    });
  }, [elapsedTime, distance, flatSteps.length]);

  // Auto-advance on time/distance completion
  useEffect(() => {
    if (!currentStep || !isRunning) return;
    const { type, value } = currentStep.duration;
    if (type === "open" || !value) return;
    const elapsed  = elapsedTime - stepStartRef.current.time;
    const distMoved = distance  - stepStartRef.current.distance;
    const isDone = (type === "time"     && elapsed   >= value)
                || (type === "distance" && distMoved >= value);
    if (isDone) advanceStep();
  }, [elapsedTime, distance, isRunning, currentStep, advanceStep]);

  // Lap button advance (for "open" steps)
  const advanceLap = useCallback(() => {
    if (!currentStep || currentStep.duration.type !== "open") return;
    advanceStep();
  }, [currentStep, advanceStep]);

  // Remaining time or distance in current step
  const stepElapsed  = elapsedTime - stepStartRef.current.time;
  const stepDistMoved = distance   - stepStartRef.current.distance;

  let remaining: number | null = null;
  let progress  = 0;
  if (currentStep?.duration.type === "time" && currentStep.duration.value) {
    remaining = Math.max(0, currentStep.duration.value - stepElapsed);
    progress  = Math.min(1, stepElapsed / currentStep.duration.value);
  } else if (currentStep?.duration.type === "distance" && currentStep.duration.value) {
    remaining = Math.max(0, currentStep.duration.value - stepDistMoved);
    progress  = Math.min(1, stepDistMoved / currentStep.duration.value);
  }

  return {
    currentStep,
    nextStep:   flatSteps[stepIdx + 1] ?? null,
    stepIdx,
    totalSteps: flatSteps.length,
    remaining,
    progress,
    advanceLap,
  };
}
