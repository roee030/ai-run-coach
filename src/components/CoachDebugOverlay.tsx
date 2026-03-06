import React, { useEffect, useState } from "react";

function fmtTime(ts: number | null) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "-";
  }
}

function fmtSecsSince(ts: number | null) {
  if (!ts) return "0s";
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  return `${s}s`;
}

export const CoachDebugOverlay: React.FC<{
  debug: {
    lastSpokenAt: number | null;
    lastMessage: string | null;
    tooFastEnteredAt: number | null;
    tooSlowEnteredAt: number | null;
    lastKmPaceStr: string | null;
    lastKmAnnounced: number;
    cooldownRemainingMs: number;
    lastMessageType?: string | null;
    lastMessageTypeAt?: number | null;
  } | null;
  speedKmh?: number | null;
  paceMinPerKm?: number | null;
  distanceMeters?: number | null;
  onSetSpeedKmh: (v: number | null) => void;
  onSetPaceMinPerKm: (v: number | null) => void;
  onSetDistanceMeters: (v: number | null) => void;
}> = ({
  debug,
  speedKmh,
  paceMinPerKm,
  distanceMeters,
  onSetSpeedKmh,
  onSetPaceMinPerKm,
  onSetDistanceMeters,
}) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!debug) return null;

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 9999,
      }}
    >
      <div className="bg-black/70 text-white text-xs rounded-md p-3 w-72 backdrop-blur-sm border border-white/10">
        <div className="font-bold text-sm mb-2">Coach Debug</div>

        <div className="mb-2">
          <label className="text-gray-400">Distance (m)</label>
          <input
            className="w-full mt-1 p-1 rounded bg-black/30"
            type="number"
            value={distanceMeters ?? ""}
            onChange={(e) =>
              onSetDistanceMeters(
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        </div>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <div>
            <label className="text-gray-400">Speed (km/h)</label>
            <input
              className="w-full mt-1 p-1 rounded bg-black/30"
              type="number"
              step="0.1"
              value={speedKmh ?? ""}
              onChange={(e) =>
                onSetSpeedKmh(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </div>
          <div>
            <label className="text-gray-400">Pace (min/km)</label>
            <input
              className="w-full mt-1 p-1 rounded bg-black/30"
              type="number"
              step="0.01"
              value={paceMinPerKm ?? ""}
              onChange={(e) =>
                onSetPaceMinPerKm(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </div>
        </div>

        <div className="mb-1">
          <span className="text-gray-400">Last Spoken:</span>
          <div>
            {fmtTime(debug?.lastSpokenAt ?? null)} — {debug?.lastMessage ?? "-"}
          </div>
        </div>

        <div className="mb-1">
          <span className="text-gray-400">Sustained - Too Fast:</span>
          <div>{fmtSecsSince(debug?.tooFastEnteredAt ?? null)}</div>
        </div>

        <div className="mb-1">
          <span className="text-gray-400">Sustained - Too Slow:</span>
          <div>{fmtSecsSince(debug?.tooSlowEnteredAt ?? null)}</div>
        </div>

        <div className="mb-1">
          <span className="text-gray-400">Cooldown:</span>
          <div>{Math.ceil((debug?.cooldownRemainingMs || 0) / 1000)}s</div>
        </div>

        <div className="mb-1">
          <span className="text-gray-400">Last Km Split:</span>
          <div>
            {debug?.lastKmPaceStr ?? "-"} ({debug?.lastKmAnnounced ?? 0} km)
          </div>
        </div>

        <div className="mt-2 text-xxs text-gray-400">
          <div>LastMsgType: {debug?.lastMessageType ?? "-"}</div>
          <div>LastMsgAt: {fmtTime(debug?.lastMessageTypeAt ?? null)}</div>
        </div>
      </div>
    </div>
  );
};
