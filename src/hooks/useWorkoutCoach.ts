/**
 * useWorkoutCoach — fires coaching cues when the runner is outside
 * the active step's target (pace / HR zone / cadence).
 * Returns the current alert message for the WorkoutHUD to display.
 */

import { useState, useEffect, useRef } from "react";
import type { ActiveStep } from "../types/workout";
import { fmtPace } from "../utils/runFormatting";

const ALERT_COOLDOWN_S = 30;   // don't repeat same type of alert within 30s

export interface WorkoutCoachState {
  workoutMessage: string | null;
}

export function useWorkoutCoach(
  currentStep: ActiveStep | null,
  pace:        number,
  heartRate:   number | null,
): WorkoutCoachState {
  const [message, setMessage]   = useState<string | null>(null);
  const lastAlertRef = useRef<number>(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentStep || currentStep.target.type === "none") {
      setMessage(null);
      return;
    }

    const nowS = Date.now() / 1000;
    if (nowS - lastAlertRef.current < ALERT_COOLDOWN_S) return;

    let alert: string | null = null;

    if (currentStep.target.type === "pace" && pace > 0) {
      const { minPaceMinPerKm: minP, maxPaceMinPerKm: maxP } = currentStep.target;
      if (pace < minP * 0.94) {
        alert = `Ease back — target ${fmtPace(minP)}–${fmtPace(maxP)}/km`;
      } else if (pace > maxP * 1.06) {
        alert = `Pick it up — target ${fmtPace(minP)}–${fmtPace(maxP)}/km`;
      }
    }

    if (currentStep.target.type === "heartRateZone" && heartRate !== null) {
      // Rough zone boundaries (180-based HRmax model)
      const zoneCeils = [0, 114, 133, 152, 171, 999];
      const zone      = currentStep.target.zone;
      if (heartRate > zoneCeils[zone])
        alert = `HR too high — ease back to Zone ${zone}`;
      else if (heartRate < zoneCeils[zone - 1] + 1 && zone > 1)
        alert = `HR too low — push into Zone ${zone}`;
    }

    if (!alert) return;

    lastAlertRef.current = nowS;
    setMessage(alert);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setMessage(null), 6000);
  }, [pace, heartRate, currentStep]);

  // Clear on step change
  useEffect(() => {
    setMessage(null);
    lastAlertRef.current = 0;
  }, [currentStep?.id]);

  return { workoutMessage: message };
}
