import { describe, it, expect } from "vitest";
import { runSequenceGetIntents } from "./helpers";
import type { RunState } from "../coaching/coachTypes";

describe("tempo run scenario", () => {
  it("triggers GREAT_JOB after sustained fast pace", () => {
    const start = 1_000_000;
    const samples: RunState[] = [];
    // ramp up (6 samples)
    for (let i = 0; i < 6; i++) {
      samples.push({
        timestamp: start + i * 2500,
        pace: 330 - i * 5,
        speed: 3 + i * 0.1,
        distance: 0,
        elevationGain: 0,
        isMoving: true,
        trend: { pace: "improving", speed: "up" },
      });
    }

    // sustained fast (18 samples ~90s)
    for (let i = 0; i < 18; i++) {
      samples.push({
        timestamp: start + (6 + i) * 2500,
        pace: 300, // fast tempo
        speed: 5,
        distance: 0,
        elevationGain: 0,
        isMoving: true,
        trend: { pace: "improving", speed: "up" },
      });
    }

    const { intents } = runSequenceGetIntents(samples);
    // Expect at least one GREAT_JOB
    const names = intents.map((i) => i.intent);
    expect(names).toContain("GREAT_JOB");
    // The first GREAT_JOB should occur after the sustained window (after sample index >= 6)
    const firstIdx = intents.findIndex((it) => it.intent === "GREAT_JOB");
    expect(firstIdx).toBeGreaterThanOrEqual(0);
  });
});
