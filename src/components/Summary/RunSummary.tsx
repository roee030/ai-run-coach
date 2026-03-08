/**
 * RunSummary — orchestrator for the post-run dashboard.
 * Composes analytics hook + five section components; no business logic here.
 */

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { RunReport } from "../../hooks/useCoachEngine";
import type { LocationPoint } from "../../types";
import { useRunAnalytics } from "../../hooks/useRunAnalytics";
import { fmtPace, downloadFile, buildCsvContent, buildShareSVG } from "../../utils/runFormatting";
import { SummaryHero }      from "./SummaryHero";
import { PerformanceMap }   from "./PerformanceMap";
import { SplitsAnalysis }   from "./SplitsAnalysis";
import { CoachingInsights } from "./CoachingInsights";
import { ExportPanel }      from "./ExportPanel";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RunSummaryProps {
  distance:    number;
  elapsedTime: number;
  pace:        number;
  intent?:     string;
  runReport?:  RunReport | null;
  locations?:  LocationPoint[];
  onHome:      () => void;
}

// ─── Layout helper ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "18px 16px", marginBottom: 12,
    }}>
      <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RunSummary({ distance, elapsedTime, pace, intent, runReport, locations, onHome }: RunSummaryProps) {
  const { targetPace, splits, phases, hasMap, hasSplits, hasHr, deltaSec, deltaColor, deltaStr, coachEvents } =
    useRunAnalytics(locations, pace, intent, runReport);

  const handleExportJson = () => downloadFile(
    JSON.stringify({
      distance, elapsedTime, pace, targetPace, runReport,
      splits: splits.map(s => ({ km: s.km, pace: fmtPace(s.paceMinPerKm), durationSec: Math.round(s.durationSec) })),
      phases: { breakPointKm: phases.breakPointKm, decayPctWorse: phases.decayPctWorse, paceStdDevPct: phases.paceStdDevPct },
    }, null, 2),
    "run-summary.json", "application/json",
  );
  const handleExportCsv  = () => downloadFile(buildCsvContent(splits, targetPace), "run-splits.csv", "text/csv");
  const handleShareCard  = () => downloadFile(buildShareSVG(distance, elapsedTime, pace, targetPace, splits), "run-share-card.svg", "image/svg+xml");

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      style={{ minHeight: "100%", padding: "0 0 24px", fontFamily: "Inter, system-ui, sans-serif", color: "#e2e8f0" }}
    >
      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: "#d4ff00", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Run Complete</div>
          <div style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 900, marginTop: 2, fontFamily: "'Oswald', Inter, system-ui, sans-serif" }}>Post-Run Summary</div>
        </div>
        {runReport?.chapter && (
          <div style={{ background: "rgba(212,255,0,0.08)", border: "1px solid rgba(212,255,0,0.2)", borderRadius: 8, padding: "4px 10px", fontSize: 10, color: "#d4ff00", fontWeight: 700 }}>
            {runReport.chapter.toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px 0" }}>

        {/* 1. Hero */}
        <SummaryHero
          distance={distance} elapsedTime={elapsedTime} pace={pace}
          targetPace={targetPace} deltaSec={deltaSec} deltaColor={deltaColor}
          deltaStr={deltaStr} hasHr={hasHr} runReport={runReport}
        />

        {/* 2. Route map */}
        {hasMap && (
          <Section title="Route — Pace Colour Map">
            <PerformanceMap locations={locations!} targetPace={targetPace} />
          </Section>
        )}

        {/* 3. Split analysis */}
        {hasSplits && (
          <Section title="Split Analysis">
            <SplitsAnalysis splits={splits} phases={phases} targetPace={targetPace} />
          </Section>
        )}

        {/* 4. Coaching insights */}
        <Section title="Coaching Insights">
          <CoachingInsights
            phases={phases} hasSplits={hasSplits} targetPace={targetPace}
            deltaSec={deltaSec} deltaColor={deltaColor} pace={pace}
            coachEvents={coachEvents}
          />
        </Section>

        {/* 5. Export */}
        <Section title="Export & Share">
          <ExportPanel
            hasSplits={hasSplits}
            onShareCard={handleShareCard}
            onExportJson={handleExportJson}
            onExportCsv={handleExportCsv}
          />
        </Section>

      </div>

      {/* Home button */}
      <div style={{ padding: "4px 16px 0" }}>
        <button type="button" onClick={onHome} style={{
          width: "100%", padding: "1rem", borderRadius: 9999,
          background: "#d4ff00", color: "#000", fontWeight: 900, fontSize: "1rem",
          letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer",
          fontFamily: "'Oswald', Inter, system-ui, sans-serif",
        }}>
          Back to Home
        </button>
      </div>
    </motion.div>
  );
}
