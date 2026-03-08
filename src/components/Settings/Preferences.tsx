import type { UserProfile } from "../../types/user";

interface PreferencesProps {
  units:                  UserProfile["units"];
  audioFeedbackFrequency: UserProfile["audioFeedbackFrequency"];
  onChange:               (updates: Partial<UserProfile>) => void;
}

function SegmentControl<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit", border: "1px solid",
              background: value === opt.value ? "rgba(212,255,0,0.12)"   : "rgba(255,255,255,0.04)",
              borderColor: value === opt.value ? "rgba(212,255,0,0.4)"   : "rgba(255,255,255,0.08)",
              color:       value === opt.value ? "#d4ff00"                : "#475569",
              transition:  "all 0.15s",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Preferences({ units, audioFeedbackFrequency, onChange }: PreferencesProps) {
  return (
    <div>
      <SegmentControl
        label="Distance Units"
        options={[{ value: "km", label: "Kilometres" }, { value: "miles", label: "Miles" }]}
        value={units}
        onChange={v => onChange({ units: v })}
      />
      <SegmentControl
        label="Audio Coach Frequency"
        options={[
          { value: "minimal",  label: "Minimal"  },
          { value: "normal",   label: "Normal"   },
          { value: "frequent", label: "Frequent" },
        ]}
        value={audioFeedbackFrequency}
        onChange={v => onChange({ audioFeedbackFrequency: v })}
      />
    </div>
  );
}
