/**
 * useRunAnalytics — pure data analysis for the post-run summary.
 *
 * Extracts: per-km splits, two-phase analysis (stability/decay),
 * target pace parsing, and derived display flags.
 */

import { useMemo } from "react";
import type { LocationPoint } from "../types";
import type { RunReport } from "./useCoachEngine";
import type { NarrativeEvent } from "../coaching/runNarrative";
import { calculateDistance } from "../utils/geolocation";

// ─── Exported types ───────────────────────────────────────────────────────────

export interface KmSplit {
  km:           number;
  paceMinPerKm: number;
  durationSec:  number;
}

export interface PhaseAnalysis {
  stabilityAvgPace: number;
  stabilityKmCount: number;
  breakPointKm:     number | null;
  decayAvgPace:     number | null;
  decayKmCount:     number;
  decayPctWorse:    number | null;
  paceStdDevPct:    number;
}

export interface RunAnalytics {
  targetPace:  number | null;
  splits:      KmSplit[];
  phases:      PhaseAnalysis;
  hasMap:      boolean;
  hasSplits:   boolean;
  hasHr:       boolean;
  deltaSec:    number | null;
  deltaColor:  string;
  deltaStr:    string | null;
  coachEvents: NarrativeEvent[];
}

// ─── Pure helpers (no React) ──────────────────────────────────────────────────

function parsePaceFromIntent(intent: string): number | null {
  const m = intent.toLowerCase().match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function computeKmSplits(locs: LocationPoint[]): KmSplit[] {
  if (locs.length < 2) return [];
  const splits: KmSplit[] = [];
  let cumDist    = 0;
  let kmStartIdx = 0;
  let nextKm     = 1;
  for (let i = 1; i < locs.length; i++) {
    cumDist += calculateDistance(
      locs[i - 1].latitude, locs[i - 1].longitude,
      locs[i].latitude,     locs[i].longitude,
    );
    if (cumDist >= nextKm * 1000) {
      const durationSec = (locs[i].timestamp - locs[kmStartIdx].timestamp) / 1000;
      splits.push({ km: nextKm, paceMinPerKm: durationSec / 60, durationSec });
      kmStartIdx = i;
      nextKm++;
      if (splits.length >= 100) break;
    }
  }
  return splits;
}

function analyzePhases(splits: KmSplit[], overallAvgPace: number): PhaseAnalysis {
  if (splits.length < 2) {
    return {
      stabilityAvgPace: overallAvgPace, stabilityKmCount: splits.length,
      breakPointKm: null, decayAvgPace: null, decayKmCount: 0,
      decayPctWorse: null, paceStdDevPct: 0,
    };
  }
  const refCount = Math.max(2, Math.floor(splits.length * 0.4));
  const refAvg   = splits.slice(0, refCount).reduce((a, s) => a + s.paceMinPerKm, 0) / refCount;
  let breakPointKm: number | null = null;
  for (let i = Math.floor(splits.length * 0.2); i < splits.length - 1; i++) {
    if (splits[i].paceMinPerKm > refAvg * 1.10 && splits[i + 1].paceMinPerKm > refAvg * 1.05) {
      breakPointKm = splits[i].km;
      break;
    }
  }
  const breakIdx     = breakPointKm ? splits.findIndex(s => s.km === breakPointKm) : -1;
  const stableSplits = breakIdx > 0 ? splits.slice(0, breakIdx) : splits;
  const decaySplits  = breakIdx > 0 ? splits.slice(breakIdx)    : [];
  const stabilityAvgPace = stableSplits.reduce((a, s) => a + s.paceMinPerKm, 0) / stableSplits.length;
  const decayAvgPace     = decaySplits.length > 0
    ? decaySplits.reduce((a, s) => a + s.paceMinPerKm, 0) / decaySplits.length : null;
  const decayPctWorse    = decayAvgPace != null
    ? ((decayAvgPace - stabilityAvgPace) / stabilityAvgPace) * 100 : null;
  const mean          = splits.reduce((a, s) => a + s.paceMinPerKm, 0) / splits.length;
  const variance      = splits.reduce((a, s) => a + (s.paceMinPerKm - mean) ** 2, 0) / splits.length;
  const paceStdDevPct = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;
  return {
    stabilityAvgPace, stabilityKmCount: stableSplits.length,
    breakPointKm, decayAvgPace, decayKmCount: decaySplits.length,
    decayPctWorse, paceStdDevPct,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRunAnalytics(
  locations: LocationPoint[] | undefined,
  pace:      number,
  intent:    string | undefined,
  runReport: RunReport | null | undefined,
): RunAnalytics {
  const targetPace = useMemo(
    () => parsePaceFromIntent(intent ?? runReport?.intent ?? ""),
    [intent, runReport],
  );
  const splits = useMemo(() => computeKmSplits(locations ?? []), [locations]);
  const phases = useMemo(() => analyzePhases(splits, pace), [splits, pace]);

  const deltaSec   = targetPace ? Math.round((pace - targetPace) * 60) : null;
  const deltaStr   = deltaSec != null ? `${deltaSec >= 0 ? "+" : ""}${deltaSec}s/km vs target` : null;
  const deltaColor = deltaSec != null
    ? (deltaSec <= 5 ? "#4ade80" : deltaSec <= 15 ? "#facc15" : "#f87171")
    : "#64748b";

  return {
    targetPace, splits, phases,
    hasMap:      (locations?.length ?? 0) >= 2,
    hasSplits:   splits.length >= 2,
    hasHr:       (runReport?.maxHeartRate ?? 0) > 0,
    deltaSec, deltaColor, deltaStr,
    coachEvents: runReport?.events?.filter(e => e.type !== "milestone") ?? [],
  };
}
