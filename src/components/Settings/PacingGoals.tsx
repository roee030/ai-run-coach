import type { UserProfile } from "../../types/user";

interface PacingGoalsProps {
  targetPaceMinPerKm?: number;
  hrZones?:            UserProfile["hrZones"];
  onChange:            (updates: Partial<UserProfile>) => void;
}

function PaceInput({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  // Display as "M:SS", store as fractional min/km
  const toDisplay = (v: number | undefined) => {
    if (!v) return "";
    const m = Math.floor(v);
    const s = Math.round((v - m) * 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  const fromDisplay = (raw: string): number | undefined => {
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return undefined;
    return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="text"
          defaultValue={toDisplay(value)}
          placeholder="M:SS"
          maxLength={5}
          onBlur={e => onChange(fromDisplay(e.target.value))}
          style={{
            flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            color: "#e2e8f0", fontSize: 16, fontVariantNumeric: "tabular-nums",
            outline: "none", fontFamily: "inherit",
          }}
        />
        <span style={{ color: "#475569", fontSize: 12 }}>min/km</span>
      </div>
    </div>
  );
}

function HrZoneField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <div style={{ color: "#475569", fontSize: 10, minWidth: 60 }}>{label}</div>
      <input
        type="number"
        value={value ?? ""}
        min={60} max={220}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          flex: 1, padding: "7px 10px", background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
          color: "#e2e8f0", fontSize: 14, fontVariantNumeric: "tabular-nums",
          outline: "none", fontFamily: "inherit",
        }}
        placeholder="BPM"
      />
      <span style={{ color: "#334155", fontSize: 10 }}>bpm</span>
    </div>
  );
}

export function PacingGoals({ targetPaceMinPerKm, hrZones, onChange }: PacingGoalsProps) {
  const updateZone = (key: keyof NonNullable<UserProfile["hrZones"]>, v: number) =>
    onChange({ hrZones: { zone1: 130, zone2: 145, zone3: 160, zone4: 175, ...hrZones, [key]: v } });

  return (
    <div>
      <PaceInput label="Default Target Pace" value={targetPaceMinPerKm}
        onChange={v => onChange({ targetPaceMinPerKm: v })} />
      <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        HR Zone Ceilings
      </div>
      <HrZoneField label="Zone 1" value={hrZones?.zone1} onChange={v => updateZone("zone1", v)} />
      <HrZoneField label="Zone 2" value={hrZones?.zone2} onChange={v => updateZone("zone2", v)} />
      <HrZoneField label="Zone 3" value={hrZones?.zone3} onChange={v => updateZone("zone3", v)} />
      <HrZoneField label="Zone 4" value={hrZones?.zone4} onChange={v => updateZone("zone4", v)} />
    </div>
  );
}
