/**
 * MetricCard - Uses CSS design tokens so colors and typography always apply
 */

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
}

export function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <div
      className="rounded-2xl app-surface border border-white/10 px-5 py-6 sm:px-6 sm:py-7 app-shadow-card flex flex-col items-center justify-center min-h-[100px] sm:min-h-[112px]"
    >
      <span className="app-label app-text-secondary mb-2 tracking-wider">
        {label}
      </span>
      <span className="app-metric app-text leading-none">
        {value}
      </span>
      {unit && (
        <span className="app-label app-text-muted mt-1.5 tracking-wider">{unit}</span>
      )}
    </div>
  );
}
