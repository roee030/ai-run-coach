# AI Run Coach

> A real-time AI running coach that lives in your pocket — listens, watches your pace, and speaks to you like a world-class coach would.

---

## What It Does

AI Run Coach tracks your run in real time and gives you a coach that actually talks to you. Not a notification. Not a beep. A voice — with personality, timing, and memory — that knows when to push you, when to celebrate with you, and when to shut up and let you run.

The coach watches your pace every second. When you start fading, it catches it before you do and intervenes early. When you hit a kilometre, it calls out your split. When you fight back from a tough patch, it notices. When you're locked in and running perfectly, it stays quiet — because silence is also coaching.

---

## Features

### Voice Coaching Engine
- Speaks out loud using the best available English voice on your device (Google UK/US, Microsoft Natural, or system fallback)
- Three coach personalities: **Motivational**, **Professional**, **Tough** — set in onboarding
- Phrase cemetery — never repeats the same line within 10 minutes
- Vibrates on every coaching cue (mobile)

### Smart Timing (Never Interrupts Your Flow)
- 4-minute hard minimum between any two interventions
- Flow protection: if you've been perfectly on pace for 6+ minutes, the coach stays silent
- 15-second settling window after every instruction — no spamming
- Need-to-speak score (0–100) determines every decision; the coach must earn the right to speak

### What the Coach Responds To
| Trigger | Response |
|---|---|
| Run starts | Intro with target pace |
| Resume after pause | Immediate "you're back!" cue |
| 1km, 2km, 3km… | Split time announcement |
| Pace fading (3-min trend) | Early predictive correction |
| Sustained pace deviation | Correction with urgency scaling |
| Recovering after struggle | Connected, narrative coaching |
| Halfway to goal | Halfway celebration |
| 90% of goal | Final push |
| 500m / 200m / 100m to go | Countdown cues |
| Finish | Voiced celebration with average pace |
| Heart rate > 185 bpm | Safety intervention |
| Climbing a hill | Speed penalty waived |
| Sudden pace spike/drop | Immediate response |
| On target for 2+ min | Form tip or flow check-in |

### Run Chapters
The coach tracks three phases of your run and adapts its tone:
- **Start** — easy, calibration, find your rhythm
- **Grind** — main phase, consistency, hold the line
- **Finish** — final push, leave nothing behind

### Post-Run Summary
- Full-screen summary with hero stats (distance, pace, time)
- Pace-coloured route map (green = fast, red = slow)
- Per-km splits analysis with phase detection (stability vs fade point)
- Coaching insights from the run narrative
- Export: CSV or shareable SVG card

### Workout Builder
- Build structured workouts with warm-up, intervals, repeats, and cool-down blocks
- Live Garmin-style HUD during the run showing current step, next step, and progress
- Pace and HR alerts per workout step (30s cooldown)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + NextUI + Framer Motion |
| Maps | Leaflet + OpenStreetMap |
| Voice | Web Speech API (SpeechSynthesis) |
| GPS | navigator.geolocation (real) or SimulatedRunSensor (dev) |
| Storage | LocalStorage via Repository pattern |
| Fonts | Oswald (brand) + Inter (body) |

---

## Architecture

```
App.tsx                         ← Screen router (onboarding → home → running → summary)
├── HomeScreen                  ← Start run, session intent, workout picker, side drawer
├── RunTracker                  ← Run lifecycle container (start/pause/resume/stop)
│   ├── useRunTracker           ← GPS session state, sensor management
│   ├── useCoachEngine          ← Voice coaching decisions (fires every 1s)
│   ├── useTimer                ← Elapsed time
│   ├── useActiveWorkout        ← Workout step tracking
│   ├── RunningScreen           ← Live metrics display
│   ├── RunControls             ← Pause / Resume / Stop buttons + confirmation modal
│   └── WorkoutHUD              ← Live step overlay
├── Summary/RunSummary          ← Full-screen post-run breakdown
│   ├── SummaryHero             ← Distance, pace, time hero card
│   ├── PerformanceMap          ← Leaflet pace-coloured route map
│   ├── SplitsAnalysis          ← Per-km bar chart + phase analysis
│   ├── CoachingInsights        ← Narrative events from the run
│   └── ExportPanel             ← CSV + SVG share card
├── History/RunHistory          ← Past runs list + re-view summary
├── Settings/SettingsScreen     ← Profile, coach style, fitness level
├── WorkoutBuilder              ← Drag-and-drop workout creator
└── SideDrawer                  ← Left-side navigation drawer
```

### Repository Pattern
All data persistence goes through repository interfaces — swap the backend without touching any component:

```
src/repositories/
├── index.ts                    ← Exports singleton instances (change 2 lines to switch backend)
├── RunRepository.ts            ← Interface
├── LocalStorageRunRepository   ← Current implementation
└── (UserRepository, WorkoutRepository — same pattern)
```

### Sensor Abstraction
```
src/sensors/
├── sensorFactory.ts            ← Creates real or simulated sensor based on env/localStorage
├── RealRunSensor               ← navigator.geolocation.watchPosition
└── SimulatedRunSensor          ← Generates realistic GPS track for dev/testing
```

**DEV mode defaults to simulation** — no GPS hardware needed. Override with `?RUN_MODE=real` in the URL.

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and complete the onboarding (sets your coach style, fitness level, and easy pace).

### Running Modes

| Mode | How |
|---|---|
| Simulated GPS (default in DEV) | Just start a run — the sensor generates a moving GPS track |
| Real GPS | Add `?RUN_MODE=real` to the URL, or set `localStorage.setItem("RUN_MODE", "real")` |
| Specific scenario | Add `?SCENARIO=steadyRun` (or `fadingRun`, `hillRun`, etc.) |

### Coach Dev Panel (DEV only)
A fixed bottom panel appears in development with:
- Live coaching thought log (every decision with score and reason)
- Pace scenario buttons (sprint, fade, steady)
- Simulated incline control
- Full debug metrics

---

## Project Structure

```
src/
├── coaching/           ← Pure coaching logic (RunNarrative, eventDetector, coach)
├── components/
│   ├── Summary/        ← Post-run summary components
│   ├── History/        ← Run history
│   ├── Settings/       ← User settings screen
│   ├── WorkoutBuilder/ ← Workout editor
│   └── WorkoutHUD/     ← Live workout step overlay
├── hooks/
│   ├── useCoachEngine  ← Core coaching + TTS + voice selection
│   ├── useRunTracker   ← GPS session lifecycle
│   ├── useTimer        ← Elapsed time
│   ├── useRunAnalytics ← Post-run splits & phase analysis
│   ├── useRunHistory   ← CRUD for saved runs
│   ├── useWorkouts     ← CRUD for workouts
│   ├── useActiveWorkout← Flatten & track workout steps
│   └── useWorkoutCoach ← Per-step pace/HR alerts
├── repositories/       ← Data persistence (repository pattern)
├── sensors/            ← GPS sensor abstraction (real + simulated)
├── types/              ← Shared TypeScript types
└── utils/              ← Formatting, geolocation, metrics smoothing
```

---

## Coaching Philosophy

The engine is designed around one principle: **silence is the default**. The coach must earn every intervention with a score above 80 out of 100. That score is built from:

- How far off pace you are (and for how long)
- Whether the trend is improving or fading
- How long it's been since the last coaching cue
- Whether you're in a "flow" state (on target for 2+ minutes)
- The current run chapter (start / grind / finish)
- Whether you just recovered from a struggle

A runner in the zone should hear almost nothing. A runner starting to fade should hear a calm, early correction — not a shout after the damage is done.

---

## Roadmap

- [ ] Heart rate monitor integration (BLE / Ant+)
- [ ] AI-generated post-run summary (Claude API)
- [ ] Training plan builder (weekly schedule)
- [ ] Apple Watch / WearOS companion
- [ ] Cloud sync (swap LocalStorage repositories)
- [ ] Social sharing — challenge a friend's route

---

## License

MIT
