/**
 * HomeScreen - Hero with separate play button and label (text not inside button)
 */

interface HomeScreenProps {
  onStartRun: () => void;
}

export function HomeScreen({ onStartRun }: HomeScreenProps) {
  return (
    <div className="min-h-screen md:min-h-full w-full app-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Depth */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 -left-24 w-[320px] h-[320px] rounded-full blur-[120px] app-brand-blur" />
        <div className="absolute bottom-0 left-0 right-0 h-2/5 app-gradient-bottom opacity-80" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[480px] mx-auto px-6 sm:px-8 md:px-10 py-12 sm:py-16 md:py-20 safe-top safe-bottom">
        <header className="flex flex-col items-center gap-4 sm:gap-5 text-center mb-10 sm:mb-14">
          <h1 className="app-hero app-text tracking-tight">
            Run Tracker
          </h1>
          <p className="app-subtitle app-text-secondary max-w-[280px] sm:max-w-none">
            Ready to run?
          </p>
        </header>

        {/* Button and label are separate: circle = button, text = label below */}
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={onStartRun}
            className="w-[140px] h-[140px] sm:w-[150px] sm:h-[150px] rounded-full app-brand app-shadow-button flex items-center justify-center focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--app-brand)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--app-bg)] hover:opacity-95 active:scale-95 transition-all"
            aria-label="Start run"
          >
            <svg className="w-12 h-12 sm:w-14 sm:h-14 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </button>
          <span className="app-label app-text">Start</span>
        </div>

        <p className="mt-12 sm:mt-14 app-label app-text-muted text-center max-w-[300px]">
          Track distance, pace & speed
        </p>
      </div>
    </div>
  );
}
