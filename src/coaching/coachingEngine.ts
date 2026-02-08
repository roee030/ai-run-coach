/**
 * Coaching Brain - Main Engine
 *
 * Orchestrates state detection, decision-making, and feedback cooldown
 * Public API for the rest of the app to call every few seconds
 */

import type {
  RunMetrics,
  RunnerProfile,
  CoachingOutput,
  FeedbackHistory,
  CoachingIntent,
} from "./types";
import { detectRunState, getPaceDeviation } from "./stateDetector";
import {
  mapStateToIntent,
  getIntentReason,
  COOLDOWN_BY_URGENCY,
  shouldSuppressDuplicateFeedback,
} from "./intentMapper";

/**
 * CoachingEngine
 *
 * Stateful coaching brain that remembers feedback history
 * Call update() every 2-5 seconds with fresh metrics
 */
export class CoachingEngine {
  private feedbackHistory: FeedbackHistory = {
    lastFeedbackTimestamp: Date.now(),
    lastIntent: null,
    feedbacksSinceStart: 0,
  };

  /**
   * Main update function
   * Call this every 2-5 seconds with current metrics
   * Returns coaching output if feedback should be given, or null if in cooldown
   */
  public update(
    metrics: RunMetrics,
    profile: RunnerProfile,
  ): CoachingOutput | null {
    // Step 1: Detect current state
    const state = detectRunState(metrics, profile);

    // Step 2: Map to coaching intent
    const intent = mapStateToIntent(state);

    // Step 3: Calculate confidence based on trend strength
    const confidence = this.calculateConfidence(metrics, profile, state);

    // Step 4: Get explanation
    const reason = getIntentReason(state);

    // Step 5: Check if we should give feedback
    const shouldGiveFeedback = this.shouldGiveFeedback(intent);

    // If not ready, return null (cooldown active)
    if (!shouldGiveFeedback) {
      return null;
    }

    // Create output
    const output: CoachingOutput = {
      state,
      intent,
      confidence,
      reason,
      timestamp: Date.now(),
    };

    // Update history for next time
    this.feedbackHistory.lastFeedbackTimestamp = Date.now();
    this.feedbackHistory.lastIntent = intent;
    this.feedbackHistory.feedbacksSinceStart += 1;

    return output;
  }

  /**
   * Determine if enough time has passed and conditions warrant feedback
   * Implements cooldown logic and duplicate suppression
   */
  private shouldGiveFeedback(intent: CoachingIntent): boolean {
    const now = Date.now();
    const timeSinceLastFeedback =
      (now - this.feedbackHistory.lastFeedbackTimestamp) / 1000;

    // Cooldown based on urgency of last intent
    const cooldownRequired = this.feedbackHistory.lastIntent
      ? COOLDOWN_BY_URGENCY[this.feedbackHistory.lastIntent.urgency]
      : 0;

    // Check if cooldown has elapsed
    if (timeSinceLastFeedback < cooldownRequired) {
      return false;
    }

    // Check for duplicate feedback suppression
    if (this.feedbackHistory.lastIntent) {
      if (
        shouldSuppressDuplicateFeedback(this.feedbackHistory.lastIntent, intent)
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate confidence (0–1) in this state/intent
   * Stronger trends → higher confidence
   * Noisy data → lower confidence
   */
  private calculateConfidence(
    metrics: RunMetrics,
    profile: RunnerProfile,
    state: string,
  ): number {
    // Base confidence depends on the state and clarity of the signal

    // START: always high confidence (clear definition)
    if (state === "START") {
      return 1.0;
    }

    // Elevation-based states: high confidence if elevationDelta is clear
    if (state === "UPHILL" || state === "DOWNHILL") {
      const elevationAbsChange = Math.abs(metrics.elevationDeltaLast30s);
      if (elevationAbsChange > 25) return 0.95;
      if (elevationAbsChange > 15) return 0.85;
      return 0.7;
    }

    // Pace-based states: confidence based on trend clarity and deviation
    const paceDeviation = getPaceDeviation(
      metrics.currentPaceSecPerKm,
      profile.typicalPaceSecPerKm,
    );
    const absDeviation = Math.abs(paceDeviation);

    if (state === "STRUGGLING") {
      // STRUGGLING is high confidence if pace is way off
      return Math.min(0.95, absDeviation / 20);
    }

    if (state === "FATIGUE") {
      // FATIGUE confidence depends on sustained degradation
      return Math.min(0.9, 0.5 + metrics.paceDeltaLast30s / 10);
    }

    if (state === "STRONG") {
      // STRONG confidence on speed gap
      return Math.min(0.95, absDeviation / 15);
    }

    if (state === "STEADY") {
      // STEADY: low variation = high confidence
      const paceVariation = Math.abs(metrics.paceDeltaLast30s);
      if (paceVariation < 0.5) return 0.9;
      if (paceVariation < 1) return 0.75;
      return 0.6;
    }

    // Default: moderate confidence
    return 0.65;
  }

  /**
   * Reset the engine (e.g., for a new run)
   */
  public reset(): void {
    this.feedbackHistory = {
      lastFeedbackTimestamp: Date.now(),
      lastIntent: null,
      feedbacksSinceStart: 0,
    };
  }

  /**
   * Get current feedback history state (for debugging/UI)
   */
  public getHistory(): FeedbackHistory {
    return { ...this.feedbackHistory };
  }

  /**
   * Manually set cooldown (for testing or special cases)
   */
  public setLastFeedbackTime(timestamp: number): void {
    this.feedbackHistory.lastFeedbackTimestamp = timestamp;
  }
}

/**
 * Factory function to create a new coaching engine
 */
export function createCoachingEngine(): CoachingEngine {
  return new CoachingEngine();
}
