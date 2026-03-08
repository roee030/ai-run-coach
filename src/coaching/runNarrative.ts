/**
 * RunNarrative — Long-term memory layer for the coach engine.
 *
 * Tracks run "chapters" (Start → Grind → Finish), stores the last 5
 * significant pace events, and exposes a need-to-speak score so the
 * coach stays silent unless an intervention genuinely earns its airtime.
 *
 * Entirely pure TypeScript — no React, no side effects.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export type RunChapter = "start" | "grind" | "finish";

export type NarrativeEventType =
  | "struggled"    // sustained pace degradation
  | "surged"       // sustained pace improvement
  | "recovered"    // returned to target after off-pace period
  | "hill_effort"  // high-effort burst (inferred from sudden pace drop)
  | "milestone";   // km or goal-percentage marker

export interface NarrativeEvent {
  type: NarrativeEventType;
  timestamp: number;       // ms epoch
  distanceMeters: number;
  paceMinPerKm: number;
  description: string;     // used in connected-coaching messages
}

export interface NarrativeScoreParams {
  paceDeviation: number;            // (current − target) / target; negative = faster
  trend3Min: "fading" | "surging" | "stable";
  messageType: string;              // e.g. "slow", "speed", "predictive_fade"
  isMilestoneOverride?: boolean;    // km marker, finish, intro → always fire
}

// ─── Timing constants ─────────────────────────────────────────────────────────

/** Hard floor between any two coach interventions (4 minutes). */
const MIN_SPEECH_GAP_MS = 240_000;

/**
 * If the runner has been perfectly on-target for this long, the coach
 * stays silent even if the time gap has elapsed ("flow protection").
 */
const FLOW_SILENCE_MS = 360_000; // 6 minutes

/** Repeat cooldown per message type. */
const SAME_TYPE_DELAY_MS = 240_000; // 4 minutes

/** Max event history to retain. */
const MAX_EVENTS = 5;

// ─── RunNarrative class ───────────────────────────────────────────────────────

export class RunNarrative {
  private chapter: RunChapter = "start";
  private chapterChanged = false;

  private events: NarrativeEvent[] = [];

  private lastSpeechAt = 0;
  private lastSpeechByType: Record<string, number> = {};

  private flowStartedAt: number | null = null;
  private goalDistanceMeters: number | null;

  constructor(goalDistanceMeters: number | null = null) {
    this.goalDistanceMeters = goalDistanceMeters;
  }

  // ── Configuration ───────────────────────────────────────────────────────────

  setGoalDistance(meters: number) {
    this.goalDistanceMeters = meters;
  }

  // ── Chapter tracking ────────────────────────────────────────────────────────

  /**
   * Call on every analyze() tick. Returns the current chapter and sets
   * the internal flag if the chapter just changed.
   */
  updateChapter(distanceMeters: number, elapsedSeconds: number): RunChapter {
    const prev = this.chapter;
    let next: RunChapter;

    if (this.goalDistanceMeters) {
      const pct = distanceMeters / this.goalDistanceMeters;
      if (pct < 0.10)      next = "start";
      else if (pct > 0.90) next = "finish";
      else                 next = "grind";
    } else {
      // Time-based fallback when no goal distance is known.
      // start = first 8 min, grind = 8–45 min, finish = thereafter.
      if (elapsedSeconds < 480)       next = "start";
      else if (elapsedSeconds < 2700) next = "grind";
      else                            next = "finish";
    }

    if (next !== prev) {
      this.chapter = next;
      this.chapterChanged = true;
    }
    return this.chapter;
  }

  getChapter(): RunChapter { return this.chapter; }

  /** True if the chapter changed since the last recordSpeech() call. */
  didChapterChange(): boolean { return this.chapterChanged; }

  // ── Event memory ─────────────────────────────────────────────────────────────

  recordEvent(event: NarrativeEvent) {
    this.events.push(event);
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  getEvents(): NarrativeEvent[] { return [...this.events]; }

  /**
   * Most recent "struggled" or "hill_effort" event within the last
   * `windowMs` milliseconds (default: 5 minutes).
   */
  getRecentStruggle(windowMs = 300_000): NarrativeEvent | null {
    const cutoff = Date.now() - windowMs;
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      if ((e.type === "struggled" || e.type === "hill_effort") && e.timestamp > cutoff) {
        return e;
      }
    }
    return null;
  }

  /**
   * True if the runner struggled recently AND is now back within 8% of
   * target — the prime moment for a connected coaching message.
   */
  isRecovering(currentAbsDeviation: number): boolean {
    return this.getRecentStruggle() !== null && currentAbsDeviation < 0.08;
  }

  // ── Flow state ───────────────────────────────────────────────────────────────

  /** Call each tick with whether the runner is currently on target. */
  updateFlowState(isOnTarget: boolean) {
    if (isOnTarget) {
      if (!this.flowStartedAt) this.flowStartedAt = Date.now();
    } else {
      this.flowStartedAt = null;
    }
  }

  getFlowDurationMs(): number {
    return this.flowStartedAt ? Date.now() - this.flowStartedAt : 0;
  }

  // ── Speech accounting ────────────────────────────────────────────────────────

  /**
   * Must be called (ideally inside SpeechSynthesisUtterance.onstart)
   * whenever the coach actually speaks. Resets all cooldown timers and
   * clears the chapter-changed flag.
   */
  recordSpeech(type: string) {
    const now = Date.now();
    this.lastSpeechAt = now;
    this.lastSpeechByType[type] = now;
    this.chapterChanged = false;
  }

  getLastSpeechAt(): number { return this.lastSpeechAt; }

  // ── Need-to-Speak score ──────────────────────────────────────────────────────

  /**
   * Returns a score from 0 to 100. The coach should speak only when
   * the score exceeds 80. Silence is the default — the score must
   * earn the right to interrupt the runner's focus.
   *
   * Scoring model:
   *   • Hard block: < 4 minutes since last speech → 0
   *   • Flow protection: on-target for > 6 minutes with small deviation → 0
   *   • Pace deviation: large drift adds 15–45 points; being on target subtracts 25
   *   • 3-min trend: fading +35, surging +18
   *   • Chapter change: +50 (rare, high-value signal)
   *   • Recovery context: runner struggled then returned → +45
   *   • Time pressure: +15 per milestone (6 min, 10 min, 15 min of silence)
   *   • Same-type repeat < 4 min: −55
   */
  calculateScore(params: NarrativeScoreParams): number {
    if (params.isMilestoneOverride) return 100;

    const now = Date.now();
    const gapMs = now - this.lastSpeechAt;

    if (gapMs < MIN_SPEECH_GAP_MS) return 0;

    const absDeviation = Math.abs(params.paceDeviation);

    // Flow protection: perfectly on-target for > 6 minutes — stay quiet.
    if (
      this.flowStartedAt &&
      now - this.flowStartedAt > FLOW_SILENCE_MS &&
      absDeviation < 0.05
    ) return 0;

    let score = 0;

    // Time pressure (rises after 6 min of silence — coach checks in).
    const minsSilent = gapMs / 60_000;
    if (minsSilent >= 6)  score += 15;
    if (minsSilent >= 10) score += 15;
    if (minsSilent >= 15) score += 10;

    // Pace deviation.
    if (absDeviation >= 0.25)      score += 45;
    else if (absDeviation >= 0.15) score += 30;
    else if (absDeviation >= 0.10) score += 15;
    else                           score -= 25; // on target → suppress

    // 3-minute trend.
    if (params.trend3Min === "fading")   score += 35;
    else if (params.trend3Min === "surging") score += 18;

    // Chapter change — high-priority signal.
    if (this.chapterChanged) score += 50;

    // Connected coaching: runner recently struggled and has now recovered.
    if (this.isRecovering(absDeviation)) score += 45;

    // Same-type cooldown penalty.
    const lastOfType = this.lastSpeechByType[params.messageType] ?? 0;
    if (now - lastOfType < SAME_TYPE_DELAY_MS) score -= 55;

    return Math.max(0, Math.min(100, score));
  }
}
