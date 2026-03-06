/**
 * useTimer hook - handles elapsed time updates
 * Uses RobustTimer for accurate timing even when browser tab is backgrounded
 */

import { useEffect, useRef, useState } from "react";
import { RobustTimer } from "../utils/robustTimer";

export function useTimer(isRunning: boolean) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<RobustTimer | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialize timer on first mount
    if (!timerRef.current) {
      timerRef.current = new RobustTimer();
    }

    const timer = timerRef.current;

    if (isRunning) {
      timer.start();

      // Subscribe to timer updates
      // Update every ~100ms for smooth display, but actual metric calculation
      // happens on 2.5s cycle in useRunTracker
      unsubscribeRef.current = timer.on((elapsed) => {
        setElapsedTime(Math.floor(elapsed));
      });
    } else {
      timer.pause();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isRunning]);

  const reset = () => {
    if (timerRef.current) {
      timerRef.current.reset();
      setElapsedTime(0);
    }
  };

  return { elapsedTime, reset };
}
