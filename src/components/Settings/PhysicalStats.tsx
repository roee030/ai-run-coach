import type { UserProfile } from "../../types/user";

interface PhysicalStatsProps {
  weightKg?: number;
  heightCm?: number;
  onChange:  (updates: Partial<UserProfile>) => void;
}

function Field({ label, value, unit, min, max, step = 1, onChange }: {
  label: string; value: number | undefined; unit: string;
  min: number; max: number; step?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="number"
          value={value ?? ""}
          min={min} max={max} step={step}
          onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          style={{
            flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            color: "#e2e8f0", fontSize: 16, fontVariantNumeric: "tabular-nums",
            outline: "none", fontFamily: "inherit",
          }}
          placeholder="—"
        />
        <span style={{ color: "#475569", fontSize: 12, minWidth: 28 }}>{unit}</span>
      </div>
    </div>
  );
}

export function PhysicalStats({ weightKg, heightCm, onChange }: PhysicalStatsProps) {
  return (
    <div>
      <Field label="Body Weight" value={weightKg} unit="kg" min={30} max={250}
        onChange={v => onChange({ weightKg: v })} />
      <Field label="Height" value={heightCm} unit="cm" min={100} max={250}
        onChange={v => onChange({ heightCm: v })} />
    </div>
  );
}
