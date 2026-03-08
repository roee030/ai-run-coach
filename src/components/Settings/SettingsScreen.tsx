import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { UserProfile } from "../../types/user";
import { useUserProfile } from "../../hooks/useUserProfile";
import { PhysicalStats } from "./PhysicalStats";
import { PacingGoals }   from "./PacingGoals";
import { Preferences }   from "./Preferences";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 14px", marginBottom: 12 }}>
      <div style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { profile, loading, saveProfile } = useUserProfile();
  const [draft, setDraft]   = useState<UserProfile>(profile);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading) setDraft(profile); }, [loading, profile]);

  const patch = (updates: Partial<UserProfile>) =>
    setDraft(prev => ({ ...prev, ...updates }));

  const handleSave = async () => {
    setSaving(true);
    await saveProfile(draft);
    setSaving(false);
    onBack();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3 }}
      style={{ background: "#050505", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: "#e2e8f0", display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 8 }}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <div style={{ color: "#d4ff00", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Profile</div>
          <div style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 900, fontFamily: "'Oswald', Inter, system-ui, sans-serif" }}>Settings</div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
        <Section title="Physical Stats">
          <PhysicalStats weightKg={draft.weightKg} heightCm={draft.heightCm} onChange={patch} />
        </Section>

        <Section title="Pacing Goals">
          <PacingGoals targetPaceMinPerKm={draft.targetPaceMinPerKm} hrZones={draft.hrZones} onChange={patch} />
        </Section>

        <Section title="Preferences">
          <Preferences units={draft.units} audioFeedbackFrequency={draft.audioFeedbackFrequency} onChange={patch} />
        </Section>
      </div>

      {/* Save button */}
      <div style={{ padding: "12px 16px 24px" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            width: "100%", padding: "1rem", borderRadius: 9999,
            background: saving || loading ? "#334155" : "#d4ff00",
            color: "#000", fontWeight: 900, fontSize: "1rem",
            letterSpacing: "0.1em", textTransform: "uppercase",
            border: "none", cursor: saving || loading ? "default" : "pointer",
            fontFamily: "'Oswald', Inter, system-ui, sans-serif",
          }}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </motion.div>
  );
}
