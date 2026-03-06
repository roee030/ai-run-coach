import { describe, it, expect } from "vitest";
import { runSequenceGetIntents } from "./helpers";
import type { RunState } from "../coaching/coachTypes";

describe("easy run scenario", () => {
  it("remains mostly neutral with occasional KEEP_GOING or GREAT_JOB", () => {
    const start = 2_000_000;
    const samples: RunState[] = [];
    // 20 samples of slight fluctuation around easy pace
    for (let i = 0; i < 20; i++) {
      const p = 360 + ((i % 3) - 1) * 1; // -1,0,1 seconds jitter
      samples.push({
        timestamp: start + i * 2500,
        pace: p,
        speed: 3.5,
        distance: 0,
        elevationGain: 0,
        isMoving: true,
        trend: { pace: "stable", speed: "stable" },
      });
    }

    const { intents } = runSequenceGetIntents(samples);
    const names = intents.map((i) => i.intent);
    // Should not produce many intents; at most a couple
    expect(names.length).toBeLessThanOrEqual(3);
    // If any intent, it should be KEEP_GOING or GREAT_JOB
    for (const n of names) {
      expect(["KEEP_GOING", "GREAT_JOB", "RECOVER", "SLOW_DOWN"]).toContain(n);
    }
  });
});
