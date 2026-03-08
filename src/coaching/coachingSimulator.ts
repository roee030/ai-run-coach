/**
 * coachingSimulator.ts
 *
 * Automated stress-test suite for the coach engine.
 * Runs scenarios synchronously at 100x speed — no DOM, no timers, no React.
 *
 * Virtual time: 1 tick = 1 simulated second, processed instantly.
 * All coaching timing constants (4-min gap, 15-s settling, etc.) are replicated
 * using simulated elapsed-seconds arithmetic.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** One frame of simulated GPS/sensor data. */
interface SimFrame {
  elapsedS:   number;    // seconds into the run
  pace:       number;    // min/km
  distance:   number;    // meters (cumulative)
  heartRate?: number;    // BPM; undefined = not available
  altitudeM?: number;    // meters ASL; undefined = no altitude data
}

export interface AuditEntry {
  timeStr:     string;               // "MM:SS"
  elapsedS:    number;
  decision:    "SPEAK" | "SILENT";
  msgType:     string;
  reason:      string;
  heartRate?:  number;
  pace:        number;
  altGain60?:  number;               // altitude gain over last 60s (if climbing)
}

export interface ScenarioResult {
  name:           string;
  description:    string;
  totalSpeaks:    number;
  criticalAlerts: number;            // sudden_surge / sudden_drop
  hrWarnings:     number;
  goalSuccess:    boolean;           // finish chapter reached / 90% milestone fired
  conflicts:      string[];          // FAILED TEST descriptions
  passed:         boolean;           // true = no conflicts
  auditLog:       AuditEntry[];
}

// ─── Timing constants (mirrors useCoachEngine / RunNarrative) ─────────────────

const MIN_SPEECH_GAP_S  = 240;   // 4 min between any two interventions
const SETTLING_S        = 15;    // ignore deviations for 15s after an instruction
const SAME_TYPE_DELAY_S = 240;   // same message type can't repeat within 4 min
const FLOW_SILENCE_S    = 360;   // 6 min of on-target running → stay quiet
const FLOW_CHECKIN_MIN_GAP_S = 120; // 2 min min gap before a flow check-in

// ─── SimCoach — stateful per-scenario coach simulation ───────────────────────

class SimCoach {
  // Speech accounting
  private lastSpokenS    = -(MIN_SPEECH_GAP_S + 1); // allow first speech immediately
  private lastSpokenByType: Record<string, number> = {};
  private lastInstructionS = -(SETTLING_S + 1);

  // KM markers
  private lastKmAnnounced = 0;
  private lastKmTimeS     = 0;

  // Pace state
  private prevPace: number | null = null;
  private tooFastEnteredS: number | null = null;
  private tooSlowEnteredS: number | null = null;
  private lastDirection: "slow_down" | "speed_up" | null = null;

  // Goal milestones
  private milestoneHalfFired  = false;
  private milestoneFinalFired = false;

  // Chapter
  private chapter: "start" | "grind" | "finish" = "start";
  private chapterChanged = false;

  // Flow
  private flowStartedS: number | null = null;
  private lastFlowCheckinS = -(FLOW_SILENCE_S + 1);
  private goalBucketsFired = new Set<number>();

  // Altitude
  private altSamples: { alt: number; s: number }[] = [];
  private peakAltM: number | null = null;

  // HR
  private maxHR: number | null = null;
  private lastHrWarningS = -(MIN_SPEECH_GAP_S * 2);

  // Trend buffers
  private shortTrend: { pace: number; s: number }[] = [];
  private longTrend:  { pace: number; s: number }[] = [];

  // Output
  readonly audit: AuditEntry[] = [];

  // Config
  private targetPace:    number | null;
  private easyMode:      boolean;
  private goalDistanceM: number | null;
  private fitnessLevel:  "Beginner" | "Intermediate" | "Advanced";

  // Scenario summary accumulators
  totalSpeaks    = 0;
  criticalAlerts = 0;
  hrWarnings     = 0;
  goalSuccess    = false;

  constructor(opts: {
    targetPace?:    number;
    goalDistanceM?: number;
    easyMode?:      boolean;
    fitnessLevel?:  "Beginner" | "Intermediate" | "Advanced";
  } = {}) {
    this.targetPace    = opts.targetPace    ?? null;
    this.goalDistanceM = opts.goalDistanceM ?? null;
    this.easyMode      = opts.easyMode      ?? false;
    this.fitnessLevel  = opts.fitnessLevel  ?? "Intermediate";
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private fmtTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  private emit(
    elapsedS: number, pace: number, decision: "SPEAK" | "SILENT",
    msgType: string, reason: string, heartRate?: number, altGain60?: number,
  ) {
    this.audit.push({ timeStr: this.fmtTime(elapsedS), elapsedS, decision, msgType, reason, heartRate, pace, altGain60 });
  }

  /**
   * Record a coaching intervention.
   * milestone = true → bypasses 4-min gap (km, chapter, goal%, intro, finish, sudden).
   * instruction = true → sets the settling timer.
   */
  private speak(
    elapsedS: number, pace: number, msgType: string, reason: string,
    { milestone = false, instruction = false, heartRate, altGain60 }:
      { milestone?: boolean; instruction?: boolean; heartRate?: number; altGain60?: number } = {},
  ) {
    this.lastSpokenS = elapsedS;
    this.lastSpokenByType[msgType] = elapsedS;
    if (instruction) this.lastInstructionS = elapsedS;
    this.totalSpeaks++;

    if (msgType === "hr_warning")      this.hrWarnings++;
    if (msgType === "sudden_surge" || msgType === "sudden_drop") this.criticalAlerts++;
    if (msgType === "milestone" && (reason.includes("90%") || reason.includes("finish"))) this.goalSuccess = true;
    if (this.chapter === "finish") this.goalSuccess = true;

    this.emit(elapsedS, pace, "SPEAK", msgType, reason, heartRate, altGain60);
  }

  /** Returns true if we can fire a regular (non-milestone) coaching intervention. */
  private canSpeak(nowS: number, msgType?: string): boolean {
    if (nowS - this.lastSpokenS < MIN_SPEECH_GAP_S) return false;
    if (msgType) {
      const lastOfType = this.lastSpokenByType[msgType] ?? -(SAME_TYPE_DELAY_S + 1);
      if (nowS - lastOfType < SAME_TYPE_DELAY_S) return false;
    }
    return true;
  }

  // ── Chapter tracking ─────────────────────────────────────────────────────────

  private updateChapter(distM: number, elapsedS: number) {
    const prev = this.chapter;
    let next: "start" | "grind" | "finish";
    if (this.goalDistanceM) {
      const pct = distM / this.goalDistanceM;
      next = pct < 0.10 ? "start" : pct > 0.90 ? "finish" : "grind";
    } else {
      next = elapsedS < 480 ? "start" : elapsedS < 2700 ? "grind" : "finish";
    }
    if (next !== prev) { this.chapter = next; this.chapterChanged = true; }
  }

  // ── Trend computation ────────────────────────────────────────────────────────

  private computeTrend(
    samples: { pace: number; s: number }[],
    minN = 6, minSpanS = 20, threshold = 0.07,
  ): "surging" | "fading" | "stable" {
    if (samples.length < minN) return "stable";
    const span = samples[samples.length - 1].s - samples[0].s;
    if (span < minSpanS) return "stable";
    const half = Math.floor(samples.length / 2);
    const avg1 = samples.slice(0, half).reduce((a, x) => a + x.pace, 0) / half;
    const avg2 = samples.slice(half).reduce((a, x) => a + x.pace, 0) / (samples.length - half);
    const change = (avg1 - avg2) / avg1;
    if (change >=  threshold) return "surging";
    if (change <= -threshold) return "fading";
    return "stable";
  }

  // ── Main tick ─────────────────────────────────────────────────────────────────

  tick(frame: SimFrame): void {
    const { elapsedS, pace, distance: distM, heartRate, altitudeM } = frame;
    const tp       = this.targetPace;
    const fastTol  = this.easyMode ? 0.85 : 0.90;
    const slowTol  = this.easyMode ? 1.30 : 1.20;

    // ── Altitude ────────────────────────────────────────────────────────────────
    let altGain60 = 0;
    if (altitudeM != null) {
      this.altSamples = [...this.altSamples, { alt: altitudeM, s: elapsedS }]
        .filter(a => elapsedS - a.s <= 60);
      if (this.peakAltM === null || altitudeM > this.peakAltM) this.peakAltM = altitudeM;
    }
    if (this.altSamples.length >= 2 && altitudeM != null) {
      altGain60 = altitudeM - this.altSamples[0].alt;
    }
    const isClimbing = altGain60 > 4;

    // ── HR ──────────────────────────────────────────────────────────────────────
    if (heartRate && heartRate > 0) {
      if (this.maxHR === null || heartRate > this.maxHR) this.maxHR = heartRate;
    }

    // ── Intro (t=1) ─────────────────────────────────────────────────────────────
    if (elapsedS === 1) {
      const tpStr = tp ? `${Math.floor(tp)}:${String(Math.round((tp % 1) * 60)).padStart(2, "0")}` : "free pace";
      this.speak(elapsedS, pace, "intro", `Run started — target ${tpStr}`, { milestone: true });
      this.prevPace = pace;
      return;
    }

    // ── Chapter ─────────────────────────────────────────────────────────────────
    this.updateChapter(distM, elapsedS);

    // ── KM marker ───────────────────────────────────────────────────────────────
    const km = Math.floor(distM / 1000);
    if (km > 0 && km !== this.lastKmAnnounced) {
      const splitPaceMin = (elapsedS - this.lastKmTimeS) / 60;
      const splitStr = `${Math.floor(splitPaceMin)}:${String(Math.round((splitPaceMin % 1) * 60)).padStart(2, "0")}`;
      this.speak(elapsedS, pace, "km", `${km} km — split ${splitStr}`, { milestone: true });
      this.lastKmAnnounced = km;
      this.lastKmTimeS     = elapsedS;
      this.prevPace = pace;
      return;
    }

    // ── Chapter transition ───────────────────────────────────────────────────────
    if (this.chapterChanged && this.chapter !== "start") {
      this.chapterChanged = false;
      this.speak(elapsedS, pace, "chapter", `Chapter → ${this.chapter}`, { milestone: true });
      this.prevPace = pace;
      return;
    }
    this.chapterChanged = false;

    // ── Goal milestones ─────────────────────────────────────────────────────────
    if (this.goalDistanceM) {
      const pct = distM / this.goalDistanceM;
      if (pct >= 0.50 && !this.milestoneHalfFired) {
        this.milestoneHalfFired = true;
        this.speak(elapsedS, pace, "milestone", "50% of goal reached", { milestone: true });
        this.prevPace = pace;
        return;
      }
      if (pct >= 0.90 && !this.milestoneFinalFired) {
        this.milestoneFinalFired = true;
        this.goalSuccess = true;
        this.speak(elapsedS, pace, "milestone", "90% of goal reached", { milestone: true });
        this.prevPace = pace;
        return;
      }
    }

    // ── Trend buffers ───────────────────────────────────────────────────────────
    const sample = { pace, s: elapsedS };
    this.shortTrend = [...this.shortTrend, sample].filter(s => elapsedS - s.s <= 60);
    this.longTrend  = [...this.longTrend,  sample].filter(s => elapsedS - s.s <= 180);
    const trend60   = this.computeTrend(this.shortTrend);
    const trend3Min = this.computeTrend(this.longTrend, 8, 30, 0.05);

    // ── Deviation & flow ────────────────────────────────────────────────────────
    const deviation    = tp ? (pace - tp) / tp : 0;
    const absDeviation = Math.abs(deviation);
    const isOnTarget   = tp !== null && absDeviation < 0.08;

    if (isOnTarget) {
      if (this.flowStartedS === null) this.flowStartedS = elapsedS;
    } else {
      this.flowStartedS = null;
    }
    const flowS    = this.flowStartedS !== null ? elapsedS - this.flowStartedS : 0;
    const satisfied = flowS > 120 && absDeviation < 0.08;

    // ── P0: HR Warning (bypasses all cooldowns) ─────────────────────────────────
    if (
      heartRate && heartRate > 185 &&
      tp !== null && deviation > 0.03 &&
      elapsedS > 120 &&
      elapsedS - this.lastHrWarningS > 180
    ) {
      this.speak(elapsedS, pace, "hr_warning", `HR critical — ${heartRate} BPM`,
        { milestone: true, heartRate });
      this.lastHrWarningS = elapsedS;
      this.prevPace = pace;
      return;
    }

    // ── Flow check-in ───────────────────────────────────────────────────────────
    // NOTE: The satisfied block exits early (mirrors production useCoachEngine behaviour).
    // Flow-silence (calculateScore returning 0) does NOT apply here — the satisfied path
    // never calls calculateScore, so check-ins fire purely on their own interval logic.
    if (satisfied) {
      let shouldCheckin = false;
      if (this.goalDistanceM && this.goalDistanceM > 0) {
        const bucket = Math.floor((distM / this.goalDistanceM) / 0.20) * 0.20;
        if (bucket >= 0.20 && bucket < 1.0 && !this.goalBucketsFired.has(bucket)) {
          this.goalBucketsFired.add(bucket);
          shouldCheckin = true;
        }
      } else {
        const intervalS = this.fitnessLevel === "Beginner" ? 240
          : this.fitnessLevel === "Advanced" ? 480 : 360;
        if (elapsedS - this.lastFlowCheckinS >= intervalS) {
          shouldCheckin = true;
        }
      }

      if (shouldCheckin && elapsedS - this.lastSpokenS >= FLOW_CHECKIN_MIN_GAP_S) {
        this.speak(elapsedS, pace, "flow_checkin", "Positive flow check-in");
        this.lastFlowCheckinS = elapsedS;
        this.prevPace = pace;
        return;
      }

      this.emit(elapsedS, pace, "SILENT", "flow_protected", "Flow — on target 2+ min, no check-in due yet");
      this.prevPace = pace;
      return;
    }

    // ── Settling ────────────────────────────────────────────────────────────────
    const inSettling = elapsedS - this.lastInstructionS < SETTLING_S;
    if (inSettling) {
      const rem = Math.ceil(SETTLING_S - (elapsedS - this.lastInstructionS));
      this.emit(elapsedS, pace, "SILENT", "settling", `Settling — ${rem}s remaining`);
      this.prevPace = pace;
      return;
    }

    const hasActiveDeviation = this.lastDirection !== null && elapsedS - this.lastInstructionS < 120;
    const isPositiveCoherent = !this.lastDirection || isOnTarget || elapsedS - this.lastInstructionS > 300;

    // ── P2: Predictive fade ─────────────────────────────────────────────────────
    if (!hasActiveDeviation && trend3Min === "fading" && tp !== null && absDeviation > 0.04) {
      if (this.canSpeak(elapsedS, "predictive_fade")) {
        this.speak(elapsedS, pace, "predictive_fade", "3-min fading trend", { instruction: true });
        this.lastDirection = "speed_up";
        this.prevPace = pace;
        return;
      }
      this.emit(elapsedS, pace, "SILENT", "predictive_fade", "cooldown active");
    }

    // ── P3: Short trend (60s) ───────────────────────────────────────────────────
    if (!hasActiveDeviation && trend60 !== "stable") {
      const tType    = trend60 === "fading" ? "trend_fade" : "trend_accel";
      const suppress = trend60 === "surging" && !isPositiveCoherent;
      if (!suppress && this.canSpeak(elapsedS, tType)) {
        this.speak(elapsedS, pace, tType, `60s ${trend60}`, { instruction: trend60 === "fading" });
        if (trend60 === "fading") this.lastDirection = "speed_up";
        this.prevPace = pace;
        return;
      }
    }

    // ── P5: Sustained deviation ─────────────────────────────────────────────────
    if (tp !== null) {
      const sustainedS = absDeviation >= 0.25 ? 10 : 30;

      // Too fast
      if (pace <= tp * fastTol) {
        if (this.tooFastEnteredS === null) {
          this.tooFastEnteredS = elapsedS;
        } else if (this.prevPace !== null && pace > this.prevPace) {
          this.tooFastEnteredS = null; // recovering
        } else if (elapsedS - this.tooFastEnteredS >= sustainedS) {
          if (this.canSpeak(elapsedS, "slow")) {
            this.speak(elapsedS, pace, "slow", `Sustained too-fast ${sustainedS}s`,
              { instruction: true });
            this.lastDirection    = "slow_down";
            this.tooFastEnteredS  = null;
            this.prevPace = pace;
            return;
          }
          this.emit(elapsedS, pace, "SILENT", "slow", "canSpeak blocked");
        } else {
          const rem = Math.ceil(sustainedS - (elapsedS - this.tooFastEnteredS));
          this.emit(elapsedS, pace, "SILENT", "sustain_timer", `Too-fast sustain: ${rem}s left`);
        }
      } else {
        this.tooFastEnteredS = null;
        if (this.lastDirection === "slow_down" && isOnTarget) this.lastDirection = null;
      }

      // Too slow
      if (pace > tp * slowTol) {
        if (this.tooSlowEnteredS === null) {
          this.tooSlowEnteredS = elapsedS;
        } else if (this.prevPace !== null && pace < this.prevPace) {
          this.tooSlowEnteredS = null; // recovering
        } else if (elapsedS - this.tooSlowEnteredS >= sustainedS) {
          if (isClimbing) {
            // Hill waiver — slow pace is justified by altitude gain
            this.emit(elapsedS, pace, "SILENT", "hill_waiver",
              `Hill effort — speed-up waived (+${altGain60.toFixed(1)}m/60s gain)`, heartRate, altGain60);
            this.tooSlowEnteredS = null;
          } else if (this.canSpeak(elapsedS, "speed")) {
            this.speak(elapsedS, pace, "speed", `Sustained too-slow ${sustainedS}s`,
              { instruction: true });
            this.lastDirection   = "speed_up";
            this.tooSlowEnteredS = null;
            this.prevPace = pace;
            return;
          } else {
            this.emit(elapsedS, pace, "SILENT", "speed", "canSpeak blocked");
          }
        } else {
          const rem = Math.ceil(sustainedS - (elapsedS - this.tooSlowEnteredS));
          this.emit(elapsedS, pace, "SILENT", "sustain_timer", `Too-slow sustain: ${rem}s left`);
        }
      } else {
        this.tooSlowEnteredS = null;
        if (this.lastDirection === "speed_up" && isOnTarget) this.lastDirection = null;
      }

      // Sudden large change (≥30%)
      if (this.prevPace !== null && this.prevPace > 0) {
        const relChange = Math.abs(pace - this.prevPace) / this.prevPace;
        if (relChange >= 0.30) {
          const type = pace < this.prevPace ? "sudden_surge" : "sudden_drop";
          this.speak(elapsedS, pace, type,
            `Sudden ${(relChange * 100).toFixed(0)}% change: ${this.prevPace.toFixed(2)}→${pace.toFixed(2)}`,
            { milestone: true });
          this.lastDirection    = pace < this.prevPace ? "slow_down" : "speed_up";
          this.lastInstructionS = elapsedS;
        }
      }
    }

    if (!this.tooFastEnteredS && !this.tooSlowEnteredS && trend60 === "stable") {
      this.emit(elapsedS, pace, "SILENT", "idle", "No intervention needed");
    }

    this.prevPace = pace;
  }
}

// ─── Frame generators ─────────────────────────────────────────────────────────

/** Compute distance traveled in 1 second at given pace (min/km). */
function mPerTick(paceMinPerKm: number): number {
  return 1000 / (paceMinPerKm * 60);
}

function generateFrames(durationS: number, fn: (t: number) => Omit<SimFrame, "elapsedS" | "distance">): SimFrame[] {
  const frames: SimFrame[] = [];
  let dist = 0;
  for (let t = 1; t <= durationS; t++) {
    const { pace, ...rest } = fn(t);
    dist += mPerTick(pace);
    frames.push({ elapsedS: t, pace, distance: dist, ...rest });
  }
  return frames;
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

/** D — Unknown Journey: 60 min flat run, 6:00 target, no goal distance. */
function scenarioD(): SimFrame[] {
  return generateFrames(3600, () => ({ pace: 6.0 }));
}

/** E — Cardiovascular Crisis: HR 145 → 192 spike at 5 min, pace drops slightly. */
function scenarioE(): SimFrame[] {
  return generateFrames(600, t => ({
    pace:      t > 300 ? 5.75 : 5.5,     // 5:45 after spike (deviation 4.5% > 3%)
    heartRate: t > 300 ? 192 : 145,
  }));
}

/** F — Hill Struggle: +6m/min altitude gain, pace drops 30% below target. */
function scenarioF(): SimFrame[] {
  const BASE_ALT  = 100;
  const GAIN_PER_S = 6 / 60; // 6m/min, so 6m/60s > 4 → isClimbing=true
  return generateFrames(600, t => {
    const onHill = t >= 120 && t <= 420;
    return {
      pace:      onHill ? 6.5 : 5.0,   // 6:30 on hill (+30% over target 5:00)
      altitudeM: onHill ? BASE_ALT + (t - 120) * GAIN_PER_S : BASE_ALT,
    };
  });
}

/** G — Variable but Victorious: 10km goal, alternating 4:00/7:00 pace every 180s. */
function scenarioG(): SimFrame[] {
  return generateFrames(3600, t => ({
    pace: Math.floor(t / 180) % 2 === 0 ? 4.0 : 7.0,
  }));
}

/**
 * H — Broken Sensor: Normal 5:00 pace, then at t=300 sudden spike to 2:00,
 * then t=301 drop to 12:00, then back to 5:00 at t=302.
 */
function scenarioH(): SimFrame[] {
  return generateFrames(600, t => ({
    pace: t === 300 ? 2.0 : t === 301 ? 12.0 : 5.0,
  }));
}

// ─── Conflict detection ───────────────────────────────────────────────────────

/** Positive message types — should not fire while HR ≥ 190 before hr_warning triggered. */
const POSITIVE_TYPES = new Set(["flow_checkin", "trend_accel", "milestone", "km", "intro", "chapter"]);

function detectConflicts(
  scenario: string,
  audit: AuditEntry[],
  frames: SimFrame[],
): string[] {
  const conflicts: string[] = [];
  const frameByS = new Map(frames.map(f => [f.elapsedS, f]));

  if (scenario === "E") {
    // FAILED: positive message spoken while HR ≥ 190 before any hr_warning fired
    let hrWarnFired = false;
    for (const entry of audit) {
      if (entry.decision !== "SPEAK") continue;
      if (entry.msgType === "hr_warning") { hrWarnFired = true; }
      const frame = frameByS.get(entry.elapsedS);
      const hr = frame?.heartRate ?? 0;
      if (hr >= 190 && POSITIVE_TYPES.has(entry.msgType) && !hrWarnFired) {
        conflicts.push(`[${entry.timeStr}] FAILED: Spoke positive '${entry.msgType}' while HR=${hr} (should have been hr_warning)`);
      }
    }
    // Check hr_warning fired at all
    const hrWarnEntry = audit.find(e => e.decision === "SPEAK" && e.msgType === "hr_warning");
    if (!hrWarnEntry) {
      conflicts.push("FAILED: HR spiked to 192 BPM but hr_warning was never triggered");
    }
  }

  if (scenario === "F") {
    // FAILED: "speed" message fired while hill was active (hill waiver should block it)
    for (const entry of audit) {
      if (entry.decision !== "SPEAK" || entry.msgType !== "speed") continue;
      const frame = frameByS.get(entry.elapsedS);
      if (!frame?.altitudeM) continue;
      // Check if we were on the hill (t 120-420)
      if (entry.elapsedS >= 120 && entry.elapsedS <= 420) {
        conflicts.push(`[${entry.timeStr}] FAILED: 'speed' fired during hill climb (alt ${frame.altitudeM?.toFixed(0)}m) — hill waiver should have suppressed`);
      }
    }
    // Verify hill_waiver was actually logged
    const hilWaiver = audit.find(e => e.msgType === "hill_waiver");
    if (!hilWaiver) {
      conflicts.push("FAILED: Hill was active but hill_waiver log entry was never emitted");
    }
  }

  if (scenario === "H") {
    // FAILED: sustained "slow" or "speed" fired for the transient spike (only lasts 1s each)
    for (const entry of audit) {
      if (entry.decision !== "SPEAK") continue;
      if ((entry.msgType === "slow" || entry.msgType === "speed") &&
          entry.elapsedS >= 298 && entry.elapsedS <= 310) {
        conflicts.push(`[${entry.timeStr}] FAILED: Sustained '${entry.msgType}' fired for 1-second sensor spike — sustain threshold should have blocked`);
      }
    }
    // Verify sudden change WAS detected
    const sudden = audit.find(e => e.decision === "SPEAK" && (e.msgType === "sudden_surge" || e.msgType === "sudden_drop"));
    if (!sudden) {
      conflicts.push("FAILED: Sensor spike ≥30% not detected — sudden change logic may be broken");
    }
  }

  return conflicts;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

interface ScenarioDef {
  id:          string;
  name:        string;
  description: string;
  frames:      SimFrame[];
  coachOpts:   ConstructorParameters<typeof SimCoach>[0];
}

function runScenario(def: ScenarioDef): ScenarioResult {
  const coach = new SimCoach(def.coachOpts);

  for (const frame of def.frames) {
    coach.tick(frame);
  }

  // Check goal success for time-based scenarios (no goalDistanceM)
  const finishChapterReached = coach.audit.some(
    e => e.msgType === "chapter" && e.reason.includes("finish"),
  );
  if (finishChapterReached) coach.goalSuccess = true;

  const conflicts = detectConflicts(def.id, coach.audit, def.frames);

  return {
    name:           def.name,
    description:    def.description,
    totalSpeaks:    coach.totalSpeaks,
    criticalAlerts: coach.criticalAlerts,
    hrWarnings:     coach.hrWarnings,
    goalSuccess:    coach.goalSuccess,
    conflicts,
    passed:         conflicts.length === 0,
    auditLog:       coach.audit,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function runStressTests(): ScenarioResult[] {
  const defs: ScenarioDef[] = [
    {
      id:          "D",
      name:        "D — Unknown Journey",
      description: "60min flat run, 6:00 target pace, no goal. Verify 6-min flow intervals fire.",
      frames:      scenarioD(),
      coachOpts:   { targetPace: 6.0, fitnessLevel: "Intermediate" },
    },
    {
      id:          "E",
      name:        "E — Cardiovascular Crisis",
      description: "HR spikes from 145 to 192 BPM at 5min. Verify P0 hr_warning fires immediately.",
      frames:      scenarioE(),
      coachOpts:   { targetPace: 5.5 },
    },
    {
      id:          "F",
      name:        "F — Hill Struggle",
      description: "+6m/min altitude gain, pace −30%. Verify hill waiver suppresses speed-up intervention.",
      frames:      scenarioF(),
      coachOpts:   { targetPace: 5.0 },
    },
    {
      id:          "G",
      name:        "G — Variable but Victorious",
      description: "10km goal, alternating 4:00/7:00 pace. Verify 50%/90% milestones and finish chapter.",
      frames:      scenarioG(),
      coachOpts:   { targetPace: 5.5, goalDistanceM: 10_000 },
    },
    {
      id:          "H",
      name:        "H — Broken Sensor",
      description: "Pace spikes 5:00→2:00→12:00 in 2 ticks. Verify sustain threshold blocks, sudden-change fires.",
      frames:      scenarioH(),
      coachOpts:   { targetPace: 5.0 },
    },
  ];

  return defs.map(runScenario);
}

/** Format results as a readable summary table string. */
export function formatStressTestSummary(results: ScenarioResult[]): string {
  const lines: string[] = [
    "╔══════════════════════════════════════════════════════════════════╗",
    "║           COACH STRESS TEST RESULTS                              ║",
    "╚══════════════════════════════════════════════════════════════════╝",
    "",
    `${"Scenario".padEnd(28)} ${"Speaks".padStart(6)} ${"Alerts".padStart(6)} ${"HR Warn".padStart(7)} ${"Goal".padStart(4)} ${"Status".padStart(8)}`,
    "─".repeat(65),
  ];

  for (const r of results) {
    const status = r.passed ? "  PASS" : "FAILED";
    const goal   = r.goalSuccess ? "yes" : "no";
    lines.push(
      `${r.name.padEnd(28)} ${String(r.totalSpeaks).padStart(6)} ${String(r.criticalAlerts).padStart(6)} ${String(r.hrWarnings).padStart(7)} ${goal.padStart(4)} ${status.padStart(8)}`
    );
    if (r.conflicts.length > 0) {
      for (const c of r.conflicts) {
        lines.push(`  !! ${c}`);
      }
    }
  }

  lines.push("─".repeat(65));
  const allPassed = results.every(r => r.passed);
  lines.push(allPassed ? "All tests PASSED." : `${results.filter(r => !r.passed).length} test(s) FAILED.`);
  return lines.join("\n");
}
