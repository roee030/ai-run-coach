/**
 * RunHeader component - displays app title and status
 */

interface RunHeaderProps {
  isRunning: boolean;
  gpsAcquired: boolean;
  onBack: () => void;
}

export function RunHeader({ isRunning, gpsAcquired, onBack }: RunHeaderProps) {
  return (
    <div className="bg-bg-primary px-6 py-4 border-b border-white border-opacity-5 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white bg-opacity-10 hover:bg-opacity-15 active:bg-opacity-20 transition-colors flex items-center justify-center text-white"
          aria-label="Back to home"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
          </svg>
        </button>

        <div className="flex-1 flex items-center justify-center gap-3">
          <h1 className="text-title font-bold text-text-primary">
            Run Tracker
          </h1>
          {isRunning && (
            <div className="flex items-center gap-2 ml-4">
              <span className="inline-flex h-2 w-2 rounded-full bg-brand-primary animate-pulse"></span>
              <span className="text-xs font-bold text-brand-primary uppercase tracking-wide">
                LIVE
              </span>
            </div>
          )}
        </div>

        <div className="w-10 flex justify-end">
          {!gpsAcquired && isRunning && (
            <div className="text-xs font-bold text-yellow-400 bg-yellow-600 bg-opacity-20 px-3 py-1 rounded-pill">
              GPS…
            </div>
          )}
          {gpsAcquired && isRunning && (
            <div className="text-xs font-bold text-brand-primary bg-brand-primary bg-opacity-10 px-3 py-1 rounded-pill">
              GPS ✓
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
