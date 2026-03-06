import { describe, it, expect } from "vitest";
import { runSequenceGetIntents } from "./helpers";
import type { RunState } from "../coaching/coachTypes";

describe("uphill fatigue scenario", () => {
  it("produces KEEP_GOING then SLOW_DOWN if pace degrades with elevation", () => {
    const start = 3_000_000;
    const samples: RunState[] = [];
    let elev = 0;
    let pace = 300;
    for (let i = 0; i < 20; i++) {
      elev += 2;
      if (i < 8)
        pace -= 1; // slight improvement at start
      else pace += 1.2; // then gradual degradation
      samples.push({
        timestamp: start + i * 2500,
        pace: Math.round(pace),
        speed: Math.max(2.5, 4 - i * 0.05),
        distance: 0,
        elevationGain: elev,
        isMoving: true,
        trend: { pace: i < 8 ? "improving" : "declining", speed: "down" },
      });
    }

    const { intents } = runSequenceGetIntents(samples);
    const names = intents.map((i) => i.intent);
    // Expect at least one KEEP_GOING and at least one SLOW_DOWN later
    expect(names).toContain("KEEP_GOING");
    expect(names).toContain("SLOW_DOWN");
  });
});
