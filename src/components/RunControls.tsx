/**
 * RunControls component - Start/Stop buttons and error display
 */

interface RunControlsProps {
  isRunning: boolean;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function RunControls({
  isRunning,
  error,
  onStart,
  onStop,
  onReset,
}: RunControlsProps) {
  return (
    <div className="bg-bg-primary px-6 py-8 border-t border-white border-opacity-5 max-w-4xl mx-auto w-full">
      {/* Error Display */}
      {error && (
        <div className="bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded-card px-4 py-3 mb-8 backdrop-blur-sm">
          <p className="text-danger text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4">
        {!isRunning ? (
          <button
            onClick={onStart}
            className="flex-1 h-20 rounded-pill bg-brand-primary hover:bg-opacity-90 active:bg-opacity-75 text-bg-primary font-bold text-xl shadow-button hover:shadow-lg transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-5 transition-opacity"></div>
            <span className="relative flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              Start Run
            </span>
          </button>
        ) : (
          <>
            <button
              onClick={onStop}
              className="flex-1 h-20 rounded-pill bg-danger hover:bg-opacity-90 active:bg-opacity-75 text-white font-bold text-xl shadow-lg shadow-danger/40 hover:shadow-xl hover:shadow-danger/60 transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white opacity-0 group-active:opacity-10 transition-opacity"></div>
              <span className="relative flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4z" />
                </svg>
                Stop
              </span>
            </button>
            <button
              onClick={onReset}
              className="w-20 h-20 rounded-pill bg-white bg-opacity-10 hover:bg-opacity-15 active:bg-opacity-20 border border-white border-opacity-20 hover:border-opacity-30 text-white font-bold text-lg transition-all duration-300 flex items-center justify-center group"
              title="Reset session"
            >
              <svg
                className="w-6 h-6 group-active:rotate-180 transition-transform duration-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M4 10a6 6 0 016-6v3l4-4-4-4v3a8 8 0 000 16 8 8 0 000-16z" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Notes */}
      <div className="mt-8 text-xs text-text-secondary text-center space-y-1">
        <p>Keep screen on during your run</p>
        <p>Grant location access for accurate tracking</p>
      </div>
    </div>
  );
}
