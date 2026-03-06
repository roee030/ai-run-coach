/**
 * MetricCard - Premium dark athletic card for metric display
 */

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
}

export function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <div className="rounded-card bg-app-surface border border-white/8 px-md py-lg shadow-card flex flex-col items-center justify-center min-h-32">
      <span className="text-label text-app-text-muted mb-3 uppercase tracking-widest font-black">
        {label}
      </span>
      <span className="text-metric font-black text-app-text leading-none">
        {value}
      </span>
      {unit && (
        <span className="text-label text-app-text-muted mt-3 uppercase tracking-wider font-semibold">
          {unit}
        </span>
      )}
    </div>
  );
}
