# AI Run Coach — Project Memory

## Stack
- React 19 + TypeScript, Vite, Tailwind CSS v4, NextUI, Framer Motion, Leaflet

## Key Architecture
- **Screens**: onboarding → home → running (App.tsx state machine)
- **Run flow**: `useRunTracker` (GPS + metrics) + `useTimer` (elapsed time) + `useCoachEngine` (TTS coach) — all composed in `RunTracker.tsx`
- **Sensor abstraction**: `RealRunSensor` / `SimulatedRunSensor` swapped via `createRunSensor()` (URL param `?mode=sim`)
- **Metrics pipeline**: GPS sample → SampleBuffer rolling average → MetricsUpdateScheduler (2.5s cycle) → smoothed state
- **Coach**: `useCoachEngine.ts` is self-contained TTS engine (120s global cooldown, 50% random chance). `coach.ts` + `EventDetector` are the pure decision layer used only in tests/debug panel.

## Design System (index.css)
- **Single retheme point**: change `--brand-primary` in `:root` → entire app updates
- Current brand: `#D4FF00` (Volt/Nike). Light mode available via `data-theme="light"` on `<html>`
- Key tokens: `--brand-primary`, `--brand-fg`, `--brand-glow`, `--bg-base`, `--bg-surface`, `--text-bold`, `--text-secondary`, `--text-muted`, `--danger`
- Tailwind `app-brand` color also updated to `#D4FF00` (tailwind.config.js)

## Onboarding Steps (6 total)
gender → fitness → goal → weeklyGoal → coachStyle → easyPace
Saved to `localStorage["onboarding"]`: `{ gender, fitnessLevel, goal, weeklyGoal, coachStyle, easyPace }`

## Dead Code Removed (session cleanup)
- `RunHeader.tsx`, `MetricCard.tsx` — were never imported
- `coaching/types.ts`, `coachingEngine.ts`, `stateDetector.ts`, `intentMapper.ts`, `examples.ts` — old unused coaching layer
- `coaching/index.ts` now exports only: `RunState`, `RunEvent`, `CoachState`, `CoachIntent`, `EventDetector`, `coachUpdate`
- Removed: `onResume`/`onFinish` dead prop chain, unused `runState` var, broken `onReset`/■ button, stale imports

## Known Bugs / Future Work
- No "finish run" button in UI (stop button removed; handleFinish exists in RunTracker but needs a UI trigger)
- Calories metric is a placeholder (`—`)
- `coachStyle` and `weeklyGoal` fields are saved but not yet wired into coach logic

## File Map (key files)
- `src/index.css` — design system tokens (edit here to retheme)
- `src/hooks/useCoachEngine.ts` — TTS coach logic
- `src/hooks/useRunTracker.ts` — GPS + metrics state
- `src/sensors/sensorFactory.ts` — real vs simulated GPS switch
- `src/coaching/` — pure decision brain (coach.ts, eventDetector.ts, coachTypes.ts)
