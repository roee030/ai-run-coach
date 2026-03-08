/**
 * Run-specific formatting utilities shared across the Summary view.
 */

import type { KmSplit } from "../hooks/useRunAnalytics";

export function fmtPace(p: number): string {
  if (!p || p <= 0) return "--:--";
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtChipTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function paceColorFor(pace: number, targetPace: number | null): string {
  if (!targetPace || targetPace <= 0) {
    const t = Math.max(0, Math.min(1, (pace - 4.0) / 4.5));
    const r = Math.round(74  + (248 - 74)  * t);
    const g = Math.round(222 + (113 - 222) * t);
    const b = Math.round(128 + (113 - 128) * t);
    return `rgb(${r},${g},${b})`;
  }
  const ratio = pace / targetPace;
  if (ratio <= 0.92) return "#34d399";
  if (ratio <= 1.05) return "#4ade80";
  if (ratio <= 1.15) return "#facc15";
  if (ratio <= 1.28) return "#f97316";
  return "#f87171";
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function buildCsvContent(splits: KmSplit[], targetPace: number | null): string {
  const header = "KM,Pace (min/km),Duration (sec),Delta vs Target (sec/km)";
  const rows = splits.map(s => {
    const d = targetPace ? `${((s.paceMinPerKm - targetPace) * 60).toFixed(0)}` : "n/a";
    return `${s.km},${fmtPace(s.paceMinPerKm)},${s.durationSec.toFixed(0)},${d}`;
  });
  return [header, ...rows].join("\n");
}

export function buildShareSVG(
  distance: number, elapsedSec: number, pace: number,
  targetPace: number | null, splits: KmSplit[],
): string {
  const W = 640, H = 320;
  const distKm   = (distance / 1000).toFixed(2);
  const paceStr  = fmtPace(pace);
  const chipTime = fmtChipTime(elapsedSec);
  const deltaSec = targetPace ? Math.round((pace - targetPace) * 60) : null;
  const deltaStr = deltaSec != null ? `${deltaSec >= 0 ? "+" : ""}${deltaSec}s/km` : "";
  const dColor   = deltaSec != null ? (deltaSec <= 0 ? "#4ade80" : "#f87171") : "#94a3b8";
  let sparkline  = "";
  if (splits.length >= 2) {
    const paces = splits.map(s => s.paceMinPerKm);
    const minP  = Math.min(...paces);
    const maxP  = Math.max(...paces) + 0.1;
    const bW    = Math.floor((W - 80) / paces.length);
    paces.forEach((p, i) => {
      const bH = Math.max(4, Math.round(((p - minP) / (maxP - minP)) * 50));
      sparkline += `<rect x="${40 + i * bW}" y="${240 - bH}" width="${bW - 1}" height="${bH}" fill="${paceColorFor(p, targetPace)}" rx="1"/>`;
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#0a0a0a" rx="16"/>
<rect x="0" y="0" width="${W}" height="4" fill="#d4ff00" rx="2"/>
<text x="32" y="44" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#d4ff00" letter-spacing="3">AI RUN COACH</text>
<text x="32" y="108" font-family="Arial,sans-serif" font-size="52" font-weight="900" fill="#ffffff">${distKm}</text>
<text x="32" y="128" font-family="Arial,sans-serif" font-size="11" fill="#64748b" letter-spacing="2">KM</text>
<text x="220" y="90" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#ffffff">${chipTime}</text>
<text x="220" y="110" font-family="Arial,sans-serif" font-size="11" fill="#64748b" letter-spacing="2">CHIP TIME</text>
<text x="220" y="148" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#d4ff00">${paceStr}</text>
<text x="220" y="168" font-family="Arial,sans-serif" font-size="11" fill="#64748b" letter-spacing="2">AVG PACE / KM</text>
${targetPace ? `<text x="440" y="90" font-family="Arial,sans-serif" font-size="11" fill="#64748b" letter-spacing="2">VS TARGET</text><text x="440" y="122" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="${dColor}">${deltaStr}</text>` : ""}
${sparkline}
${splits.length >= 2 ? `<text x="40" y="268" font-family="Arial,sans-serif" font-size="9" fill="#334155" letter-spacing="2">PACE BY KM</text>` : ""}
<text x="${W - 32}" y="${H - 14}" font-family="Arial,sans-serif" font-size="10" fill="#334155" text-anchor="end">ai-run-coach</text>
</svg>`;
}
