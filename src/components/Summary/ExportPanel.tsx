interface ExportPanelProps {
  hasSplits:     boolean;
  onShareCard:   () => void;
  onExportJson:  () => void;
  onExportCsv:   () => void;
}

function ExportBtn({ label, icon, color, onClick }: { label: string; icon: string; color: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "8px 14px", borderRadius: 8, background: "transparent", color,
      border: `1px solid ${color}`, fontFamily: "inherit", fontSize: 11, fontWeight: 700,
      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
    }}>
      <span>{icon}</span> {label}
    </button>
  );
}

export function ExportPanel({ hasSplits, onShareCard, onExportJson, onExportCsv }: ExportPanelProps) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <ExportBtn label="Share Card"  icon="🖼️" color="#a78bfa" onClick={onShareCard}  />
        <ExportBtn label="JSON Export" icon="{ }" color="#38bdf8" onClick={onExportJson} />
        {hasSplits && <ExportBtn label="CSV Splits" icon="📊" color="#4ade80" onClick={onExportCsv} />}
      </div>
      <div style={{ color: "#1e293b", fontSize: 9, marginTop: 8 }}>
        Share card saves as .svg · open in any browser to view or screenshot.
      </div>
    </div>
  );
}
