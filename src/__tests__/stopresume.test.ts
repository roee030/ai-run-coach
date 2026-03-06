import { describe, it, expect } from "vitest";
import { runSequenceGetIntents } from "./helpers";
import type { RunState } from "../coaching/coachTypes";

describe("stop & resume scenario", () => {
  it("triggers STOPPED and RESUMED and yields RECOVER/KEEP_GOING without spam", () => {
    const start = 4_000_000;
    const samples: RunState[] = [];
    // running for a few ticks
    for (let i = 0; i < 4; i++) {
      samples.push({
        timestamp: start + i * 2500,
        pace: 320,
        speed: 3.5,
        distance: 0,
        elevationGain: 0,
        isMoving: true,
        trend: { pace: "stable", speed: "stable" },
      });
    }
    // stop long enough (12s)
    samples.push({
      timestamp: start + 4 * 2500 + 12000,
      pace: null,
      speed: 0,
      distance: 0,
      elevationGain: 0,
      isMoving: false,
      trend: { pace: "stable", speed: "stable" },
    });
    // resume
    samples.push({
      timestamp: start + 4 * 2500 + 12000 + 5000,
      pace: 320,
      speed: 3.2,
      distance: 0,
      elevationGain: 0,
      isMoving: true,
      trend: { pace: "stable", speed: "stable" },
    });

    const { intents, events } = runSequenceGetIntents(samples);
    const names = intents.map((i) => i.intent);
    // Expect STOPPED/RESUMED events were emitted
    const eventTypes = events.map((e) => e.type);
    expect(eventTypes).toContain("STOPPED");
    expect(eventTypes).toContain("RESUMED");
    // Intent after resume should be KEEP_GOING or RECOVER (not repeated spam)
    expect(names.length).toBeLessThanOrEqual(3);
    expect(names.some((n) => ["KEEP_GOING", "RECOVER"].includes(n))).toBe(true);
  });
});
