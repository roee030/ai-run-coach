import React, { useEffect, useMemo, useRef, useState } from "react";
import { EventDetector, coachUpdate } from "../coaching";
import type {
  RunEvent as CoachRunEvent,
  RunState as CoachRunState,
} from "../coaching";

// DEV-only panel for testing coach brain. Renders nothing outside DEV.
export function CoachDebugPanel(): JSX.Element | null {
  if (!import.meta.env.DEV) return null;

  const detectorRef = useRef(new EventDetector());

  // Local simulated run state (single snapshot updated by controls)
  const [isMoving, setIsMoving] = useState(true);
  const [pace, setPace] = useState<number | null>(300); // sec/km
  const [speed, setSpeed] = useState(3.5); // m/s
  const [elevationGain, setElevationGain] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Event history accumulated for coach.update cooldown checks
  const eventsRef = useRef<CoachRunEvent[]>([]);

  const EVENT_EMOJI: Record<string, string> = {
    PACE_DROP: "📉",
    SUSTAINED_FAST_PACE: "📈",
    UPHILL: "⛰️",
    STOPPED: "⏸️",
    RESUMED: "▶️",
  };

  const runState: CoachRunState = useMemo(
    () => ({
      timestamp: Date.now(),
      pace,
      speed,
      distance: 0,
      elevationGain,
      isMoving,
      trend: {
        pace: pace === null ? "stable" : "stable",
        speed: "stable",
      },
    }),
    [pace, speed, elevationGain, isMoving],
  );

  // Helper: append log (also to console). emoji optional, meta for structured console logging
  function appendLog(line: string, emoji?: string, meta?: any) {
    const ts = new Date().toLocaleTimeString();
    const entry = `[${ts}] ${line}`;
    setLogs((s) => [...s, entry]);
    // Console structured logging with emoji and meta

    if (emoji) {
      if (meta !== undefined) console.log(`${emoji} ${line}`, meta);
      else console.log(`${emoji} ${line}`);
    } else {
      console.log(entry, meta ?? "");
    }
  }

  // Push current runState into detector and update events + coach decision
  function tickPush(
    stateOverride?: Partial<CoachRunState>,
    forcedTimestamp?: number,
  ) {
    const snapshot: CoachRunState = {
      ...runState,
      ...(stateOverride || {}),
      timestamp: forcedTimestamp ?? Date.now(),
    };
    appendLog(
      `RunState pace=${snapshot.pace ?? "-"} speed=${snapshot.speed.toFixed(2)} moving=${snapshot.isMoving}`,
      "🏃",
      snapshot,
    );
    const emitted = detectorRef.current.push(snapshot);
    if (emitted.length) {
      for (const e of emitted) {
        const meta = e as any;
        const emoji = EVENT_EMOJI[e.type] ?? "📣";
        appendLog(
          `Event: ${e.type}${"amount" in e ? ` (${meta.amount ?? meta.duration ?? ""})` : ""}`,
          emoji,
          e,
        );
      }
      eventsRef.current.push(...emitted);
    }

    const intent = coachUpdate(snapshot as any, eventsRef.current as any);
    if (intent) {
      appendLog(`Coach Intent: ${intent}`, "🧠");

      console.log("🧠 Coach Intent", { intent, timestamp: snapshot.timestamp });
    } else {
      const possible = inferIntentForDisplay(snapshot, eventsRef.current);
      if (possible) {
        const blocked = isIntentBlockedByCooldown(
          possible,
          eventsRef.current,
          snapshot.timestamp,
        );
        if (blocked) appendLog(`Intent blocked by cooldown: ${possible}`, "⏳");
      }
    }
  }

  // Fire a tick whenever controls change to simulate immediate effect
  useEffect(() => {
    tickPush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pace, speed, elevationGain, isMoving]);

  // Manual trigger helpers: simulate a short series of snapshots to make detector detect
  function simulatePaceDrop() {
    const start = pace ?? 300;
    const seq = [start, start + 2.5, start + 4, start + 6];
    // simulate over time to generate timestamps
    let t = Date.now();
    for (const p of seq) {
      t += 2500;
      tickPush({ pace: p, speed: Math.max(0.5, speed - (p - start) / 60) }, t);
    }
  }

  function simulateSustainedFast() {
    const start = pace ?? 300;
    const seq = [start, start - 1.5, start - 2.5, start - 3];
    let t = Date.now();
    for (const p of seq) {
      t += 2500;
      tickPush({ pace: p, speed: speed + (start - p) / 60 }, t);
    }
  }

  function simulateUphill() {
    // create elevation gain across pushes
    let t = Date.now();
    for (let i = 0; i < 4; i++) {
      const gain = elevationGain + 3 + i * 2;
      setElevationGain(gain);
      t += 2500;
      tickPush({ elevationGain: gain }, t);
    }
  }

  function simulateStopResume() {
    // stop
    const t0 = Date.now();
    setIsMoving(false);
    tickPush({ isMoving: false, pace: null }, t0);
    // resume after a longer pause to trigger STOPPED
    const t1 = t0 + 12_000; // 12s later
    setTimeout(() => {
      setIsMoving(true);
      tickPush({ isMoving: true, pace: pace ?? 300 }, t1);
    }, 100);
  }

  // Scenario runners (DEV only)
  function runScenarioEasy() {
    appendLog("Starting scenario: Easy Run", "🟢");
    // mostly stable with tiny fluctuations
    let t = Date.now();
    const base = 360; // easy pace
    for (let i = 0; i < 12; i++) {
      const p = base + (Math.random() - 0.5) * 6; // +/-3s
      t += 2500;
      tickPush(
        { pace: Math.round(p), speed: Math.max(2.5, 3.5 + (base - p) / 120) },
        t,
      );
    }
  }

  function runScenarioTempo() {
    appendLog("Starting scenario: Tempo Run", "🔥");
    let t = Date.now();
    const start = 330;
    // ramp up over 10 samples then sustain fast pace for ~1.5 minutes
    for (let i = 0; i < 6; i++) {
      const p = start - i * 5; // speed up
      t += 2500;
      tickPush({ pace: p, speed: 3 + (start - p) / 60 }, t);
    }
    // sustained fast for ~36 samples (~90s)
    for (let i = 0; i < 18; i++) {
      t += 2500;
      tickPush({ pace: start - 30, speed: 5 }, t);
    }
  }

  function runScenarioUphillFatigue() {
    appendLog("Starting scenario: Uphill Fatigue", "⛰️");
    let t = Date.now();
    let elev = elevationGain;
    let p = pace ?? 300;
    for (let i = 0; i < 20; i++) {
      elev += 2 + Math.random();
      p += 0.8 + Math.random() * 0.5; // pace slows
      t += 2500;
      tickPush(
        {
          elevationGain: Math.round(elev),
          pace: Math.round(p),
          speed: Math.max(2.5, speed - i * 0.05),
        },
        t,
      );
    }
  }

  function runScenarioStopResume() {
    appendLog("Starting scenario: Stop & Resume (Urban)", "🚦");
    let t = Date.now();
    // run a few ticks
    for (let i = 0; i < 4; i++) {
      t += 2500;
      tickPush({}, t);
    }
    // stop and wait long enough
    t += 12_000;
    tickPush({ isMoving: false, pace: null }, t);
    // resume
    t += 5000;
    tickPush({ isMoving: true, pace: pace ?? 300 }, t);
  }

  // Simple display-only gauge helpers (quantize to nearest 5)
  function quantize5(v: number) {
    return Math.round(v / 5) * 5;
  }

  // Clear logs and events
  function clearAll() {
    setLogs([]);
    eventsRef.current = [];
    detectorRef.current.reset();
    appendLog("Debug cleared");
  }

  return (
    <div className="w-full md:w-96 md:ml-4">
      <div className="bg-white/5 backdrop-blur rounded-lg p-4 w-full text-sm text-white">
        <div className="flex items-center justify-between mb-2">
          <strong>Coach Debug Panel (DEV)</strong>
          <div className="flex gap-2">
            <button
              onClick={() => clearAll()}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block mb-1">Pace (sec/km)</label>
            <input
              type="range"
              min={200}
              max={480}
              value={pace ?? 300}
              onChange={(e) => setPace(Number(e.target.value))}
            />
            <div className="text-xs">
              {pace ?? "-"} sec/km (quantized {quantize5(pace ?? 0)})
            </div>
          </div>

          <div>
            <label className="block mb-1">Speed (m/s)</label>
            <input
              type="range"
              min={0.5}
              max={8}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            <div className="text-xs">
              {speed.toFixed(2)} m/s (quantized {quantize5(speed)})
            </div>
          </div>

          <div>
            <label className="block mb-1">Uphill</label>
            <button
              onClick={() => {
                setElevationGain((g) => g + 3);
                tickPush();
              }}
              className="px-2 py-1 bg-gray-700 rounded mr-2"
            >
              +3m
            </button>
            <button
              onClick={() => {
                setElevationGain(0);
                tickPush();
              }}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              Reset
            </button>
            <div className="text-xs">elevationGain {elevationGain}m</div>
          </div>

          <div>
            <label className="block mb-1">Movement</label>
            <button
              onClick={() => {
                setIsMoving(false);
                tickPush({ isMoving: false, pace: null });
              }}
              className="px-2 py-1 bg-red-600 rounded mr-2"
            >
              Stop
            </button>
            <button
              onClick={() => {
                setIsMoving(true);
                tickPush({ isMoving: true });
              }}
              className="px-2 py-1 bg-green-600 rounded"
            >
              Resume
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <strong>Manual Triggers</strong>
            <div className="flex gap-2 mt-2">
              <button
                onClick={simulatePaceDrop}
                className="px-2 py-1 bg-yellow-700 rounded"
              >
                Trigger PACE_DROP
              </button>
              <button
                onClick={simulateSustainedFast}
                className="px-2 py-1 bg-green-700 rounded"
              >
                Trigger SUSTAINED_FAST_PACE
              </button>
              <button
                onClick={simulateUphill}
                className="px-2 py-1 bg-indigo-700 rounded"
              >
                Trigger UPHILL
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={simulateStopResume}
                className="px-2 py-1 bg-gray-600 rounded"
              >
                Trigger STOP/RESUME
              </button>
            </div>
            <div className="mt-3">
              <strong>Scenarios</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={runScenarioEasy}
                  className="px-2 py-1 bg-emerald-600 rounded"
                >
                  Easy Run
                </button>
                <button
                  onClick={runScenarioTempo}
                  className="px-2 py-1 bg-red-600 rounded"
                >
                  Tempo Run
                </button>
                <button
                  onClick={runScenarioUphillFatigue}
                  className="px-2 py-1 bg-indigo-600 rounded"
                >
                  Uphill Fatigue
                </button>
                <button
                  onClick={runScenarioStopResume}
                  className="px-2 py-1 bg-gray-600 rounded"
                >
                  Stop &amp; Resume
                </button>
              </div>
            </div>
          </div>

          <div>
            <strong>Visual Gauges (display only)</strong>
            <div className="flex items-center gap-4 mt-2">
              <Gauge
                label="Pace"
                value={pace ?? 0}
                quantize={quantize5}
                unit="sec/km"
              />
              <Gauge
                label="Speed"
                value={speed}
                quantize={quantize5}
                unit="m/s"
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <strong>Logs</strong>
          <div className="h-48 overflow-auto mt-2 bg-black/30 p-2 rounded text-xs font-mono">
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal SVG circular gauge used for display only
function Gauge({
  label,
  value,
  quantize,
  unit,
}: {
  label: string;
  value: number;
  quantize: (n: number) => number;
  unit: string;
}) {
  const q = quantize(Math.max(0, Math.round(value)));
  const pct = Math.min(100, (q / Math.max(1, q + 10)) * 100);
  const stroke = 10;
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ width: 110 }}>
      <svg width={110} height={90} viewBox="0 0 110 90">
        <g transform="translate(55,48)">
          <circle r={radius} stroke="#333" strokeWidth={stroke} fill="none" />
          <circle
            r={radius}
            stroke="#0ea5e9"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90)"
          />
          <text y={6} textAnchor="middle" fill="#fff" fontSize={12}>
            {label}
          </text>
          <text y={24} textAnchor="middle" fill="#fff" fontSize={11}>
            {q} {unit}
          </text>
        </g>
      </svg>
    </div>
  );
}

// Best-effort helpers replicated for display purposes
const INTENT_MAP: Record<string, string> = {
  KEEP_GOING: "ENCOURAGING",
  SLOW_DOWN: "WARNING",
  GREAT_JOB: "PRAISING",
  RECOVER: "ENCOURAGING",
};
const INTENT_TRIGGERS: Record<string, string[]> = {
  SLOW_DOWN: ["PACE_DROP"],
  GREAT_JOB: ["SUSTAINED_FAST_PACE"],
  KEEP_GOING: ["UPHILL", "RESUMED"],
  RECOVER: ["RESUMED"],
};
const COOLDOWNS: Record<string, number> = {
  SLOW_DOWN: 45,
  GREAT_JOB: 90,
  KEEP_GOING: 60,
  RECOVER: 60,
};

function inferIntentForDisplay(state: CoachRunState, events: CoachRunEvent[]) {
  const now = state.timestamp;
  const recent = (type: CoachRunEvent["type"], window = 15) =>
    events.some(
      (e) => e.type === type && Math.abs(now - e.timestamp) < window * 1000,
    );
  if (recent("STOPPED", 10)) return null;
  if (recent("SUSTAINED_FAST_PACE", 20)) return "GREAT_JOB";
  if (recent("PACE_DROP", 15)) return "SLOW_DOWN";
  if (recent("UPHILL", 12)) return "KEEP_GOING";
  if (recent("RESUMED", 10)) return "KEEP_GOING";
  if (state.trend.pace === "improving") return "GREAT_JOB";
  if (state.trend.pace === "declining") return "SLOW_DOWN";
  return "KEEP_GOING";
}

function isIntentBlockedByCooldown(
  intent: string | null,
  events: CoachRunEvent[],
  nowTs: number,
) {
  if (!intent) return false;
  const triggers = INTENT_TRIGGERS[intent] || [];
  let last = 0;
  for (const e of events)
    if (triggers.includes(e.type)) last = Math.max(last, e.timestamp);
  if (!last) return false;
  const elapsed = (nowTs - last) / 1000;
  return elapsed < (COOLDOWNS[intent] || 0);
}

export default CoachDebugPanel;
