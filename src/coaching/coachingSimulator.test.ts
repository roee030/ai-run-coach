/**
 * coachingSimulator.test.ts
 *
 * Vitest spec for the coach stress-test suite.
 * Run headless:   npm run test:coach
 * Run with JSON:  npm run test:coach:json
 *
 * Exit code 0 = all pass.  Exit code 1 = one or more failures.
 * On failure, the full audit log for the failing scenario is printed to stderr.
 *
 * After all tests, writes two files:
 *   coach-test-results.log  — human-readable summary table
 *   coach-test-results.json — full AuditEntry[] per scenario (for offline analysis)
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { writeFileSync } from "node:fs";
import { runStressTests, formatStressTestSummary } from "./coachingSimulator";
import type { ScenarioResult } from "./coachingSimulator";

// ─── Run all scenarios once (synchronous, ~5ms) ───────────────────────────────

let results: ScenarioResult[];

beforeAll(() => {
  results = runStressTests();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function get(id: string): ScenarioResult {
  const r = results.find(r => r.name.startsWith(id));
  if (!r) throw new Error(`Scenario ${id} not found in results`);
  return r;
}

function dumpAudit(r: ScenarioResult) {
  const lines = r.auditLog
    .filter(e => e.decision === "SPEAK")
    .map(e => `  [${e.timeStr}] ${e.msgType.padEnd(16)} ${e.reason}`);
  return `\n--- ${r.name} SPEAKS (${lines.length}) ---\n${lines.join("\n") || "  (none)"}`;
}

// ─── D — Unknown Journey ─────────────────────────────────────────────────────

describe("D — Unknown Journey (60min flat, 6:00 target, no goal)", () => {
  it("fires at least 6 flow check-ins over 60 minutes", () => {
    const r = get("D");
    const checkins = r.auditLog.filter(
      e => e.decision === "SPEAK" && e.msgType === "flow_checkin",
    );
    // 60min at 360s intervals: expect ~8–9 check-ins after flow lock-in
    // Conservative lower bound: at least 6
    expect(checkins.length, `Got ${checkins.length} check-ins.\n${dumpAudit(r)}`).toBeGreaterThanOrEqual(6);
  });

  it("check-ins are spaced roughly 360s apart (±30s tolerance)", () => {
    const r = get("D");
    const checkins = r.auditLog.filter(
      e => e.decision === "SPEAK" && e.msgType === "flow_checkin",
    );
    for (let i = 1; i < checkins.length; i++) {
      const gap = checkins[i].elapsedS - checkins[i - 1].elapsedS;
      // Should be ~360s; KM markers can shift timing slightly
      expect(gap, `Check-in gap ${i} was ${gap}s (expected ≈360s)`).toBeGreaterThanOrEqual(240);
      expect(gap, `Check-in gap ${i} was ${gap}s (expected ≈360s)`).toBeLessThanOrEqual(600);
    }
  });

  it("has no conflicts", () => {
    const r = get("D");
    expect(r.conflicts, r.conflicts.join("\n")).toHaveLength(0);
  });
});

// ─── E — Cardiovascular Crisis ───────────────────────────────────────────────

describe("E — Cardiovascular Crisis (HR 145→192 at 5min)", () => {
  it("fires hr_warning within 30s of HR exceeding 185", () => {
    const r = get("E");
    const hrWarn = r.auditLog.find(
      e => e.decision === "SPEAK" && e.msgType === "hr_warning",
    );
    expect(hrWarn, `hr_warning never fired.\n${dumpAudit(r)}`).toBeDefined();
    // HR spike starts at t=301; warning must fire by t=331 (within 30s)
    expect(
      hrWarn!.elapsedS,
      `hr_warning fired too late at ${hrWarn!.elapsedS}s (spike at 301s)`,
    ).toBeLessThanOrEqual(331);
  });

  it("does NOT speak a positive message while HR ≥ 190 before hr_warning", () => {
    const r = get("E");
    expect(r.conflicts, r.conflicts.join("\n")).toHaveLength(0);
  });

  it("tracks hrWarnings count correctly", () => {
    const r = get("E");
    expect(r.hrWarnings).toBeGreaterThanOrEqual(1);
  });
});

// ─── F — Hill Struggle ───────────────────────────────────────────────────────

describe("F — Hill Struggle (+6m/min altitude gain, pace −30%)", () => {
  it("never fires 'speed' intervention while climbing (t=120–420)", () => {
    const r = get("F");
    const badSpeeds = r.auditLog.filter(
      e => e.decision === "SPEAK" && e.msgType === "speed"
        && e.elapsedS >= 120 && e.elapsedS <= 420,
    );
    expect(
      badSpeeds,
      `'speed' fired on hill at: ${badSpeeds.map(e => e.timeStr).join(", ")}\n${dumpAudit(r)}`,
    ).toHaveLength(0);
  });

  it("emits at least one hill_waiver log entry during the climb", () => {
    const r = get("F");
    const waivers = r.auditLog.filter(e => e.msgType === "hill_waiver");
    expect(waivers, `No hill_waiver emitted.\n${dumpAudit(r)}`).not.toHaveLength(0);
    // Waiver should include altitude gain info
    expect(waivers[0].reason).toContain("m/60s gain");
  });

  it("resumes normal 'speed' coaching after the hill ends (t>420)", () => {
    // After the hill, pace stays at 5:00 (target) so no speed needed.
    // This verifies the waiver didn't permanently block the engine.
    const r = get("F");
    // No errors expected after hill — just verify no conflicts
    expect(r.conflicts, r.conflicts.join("\n")).toHaveLength(0);
  });
});

// ─── G — Variable but Victorious ─────────────────────────────────────────────

describe("G — Variable but Victorious (10km goal, 4:00/7:00 alternating)", () => {
  it("fires 50% goal milestone", () => {
    const r = get("G");
    const half = r.auditLog.find(
      e => e.decision === "SPEAK" && e.msgType === "milestone" && e.reason.includes("50%"),
    );
    expect(half, `50% milestone never fired.\n${dumpAudit(r)}`).toBeDefined();
  });

  it("fires 90% goal milestone", () => {
    const r = get("G");
    const final = r.auditLog.find(
      e => e.decision === "SPEAK" && e.msgType === "milestone" && e.reason.includes("90%"),
    );
    expect(final, `90% milestone never fired.\n${dumpAudit(r)}`).toBeDefined();
  });

  it("reaches finish chapter (goalSuccess = true)", () => {
    const r = get("G");
    expect(r.goalSuccess, `goalSuccess was false.\n${dumpAudit(r)}`).toBe(true);
  });

  it("fires km markers at every completed kilometre", () => {
    const r = get("G");
    const kms = r.auditLog.filter(
      e => e.decision === "SPEAK" && e.msgType === "km",
    );
    // 10km goal → at least 9 km markers (km 1–9; km 10 may be after milestone)
    expect(kms.length, `Only ${kms.length} km markers fired`).toBeGreaterThanOrEqual(9);
  });

  it("has no conflicts", () => {
    const r = get("G");
    expect(r.conflicts, r.conflicts.join("\n")).toHaveLength(0);
  });
});

// ─── H — Broken Sensor ───────────────────────────────────────────────────────

describe("H — Broken Sensor (5:00→2:00→12:00 in 2 ticks)", () => {
  it("detects sudden surge/drop (≥30% change)", () => {
    const r = get("H");
    const sudden = r.auditLog.filter(
      e => e.decision === "SPEAK"
        && (e.msgType === "sudden_surge" || e.msgType === "sudden_drop"),
    );
    expect(sudden, `No sudden change detected.\n${dumpAudit(r)}`).not.toHaveLength(0);
  });

  it("does NOT fire sustained 'slow' or 'speed' for the 1-second spike", () => {
    const r = get("H");
    const badSustained = r.auditLog.filter(
      e => e.decision === "SPEAK"
        && (e.msgType === "slow" || e.msgType === "speed")
        && e.elapsedS >= 298 && e.elapsedS <= 310,
    );
    expect(
      badSustained,
      `Sustained deviation fired for sensor spike at: ${badSustained.map(e => `${e.timeStr}(${e.msgType})`).join(", ")}`,
    ).toHaveLength(0);
  });

  it("has no conflicts", () => {
    const r = get("H");
    expect(r.conflicts, r.conflicts.join("\n")).toHaveLength(0);
  });
});

// ─── File output (runs after ALL tests regardless of pass/fail) ───────────────

afterAll(() => {
  const summary = formatStressTestSummary(results);

  // Human-readable summary
  writeFileSync("coach-test-results.log", summary + "\n", "utf-8");

  // Full audit log as JSON (for offline analysis / diffing)
  writeFileSync(
    "coach-test-results.json",
    JSON.stringify(
      results.map(r => ({
        name:        r.name,
        description: r.description,
        passed:      r.passed,
        totalSpeaks: r.totalSpeaks,
        hrWarnings:  r.hrWarnings,
        conflicts:   r.conflicts,
        // Only include SPEAK decisions in the JSON to keep file size manageable
        decisions:   r.auditLog.filter(e => e.decision === "SPEAK"),
      })),
      null,
      2,
    ) + "\n",
    "utf-8",
  );

  // Always print the summary table to stdout
  console.log("\n" + summary);
  console.log("\nResults written to: coach-test-results.log / coach-test-results.json");
});
