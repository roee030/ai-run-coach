## Sensor System: Quick Developer Guide

### 5-Second Start: Test App Without Real GPS

```javascript
// In browser console, right now:
localStorage.setItem("RUN_MODE", "simulation");
localStorage.setItem("SCENARIO", "steadyRun");
location.reload();
```

Done. App now generates realistic running data. No GPS needed.

---

## Change Simulation Scenario

```javascript
// Fast acceleration
localStorage.setItem("SCENARIO", "accelerate");
location.reload();

// Stop & go intervals
localStorage.setItem("SCENARIO", "stopAndGo");
location.reload();

// Hill with elevation
localStorage.setItem("SCENARIO", "hillRun");
location.reload();

// List all scenarios
Object.keys({
  steadyRun: 1,
  accelerate: 1,
  slowDown: 1,
  stopAndGo: 1,
  gpsGlitch: 1,
  hillRun: 1,
  enduranceRun: 1,
  sprintIntervals: 1,
});
```

---

## Switch Back to Real GPS

```javascript
localStorage.setItem("RUN_MODE", "real");
location.reload();
```

---

## What Each Scenario Does

| Scenario            | What It Tests                     | Time   |
| ------------------- | --------------------------------- | ------ |
| **steadyRun**       | Stable metrics at constant pace   | 10 min |
| **accelerate**      | Pace smoothing during speed up    | 10 min |
| **slowDown**        | Pace smoothing during slow down   | 10 min |
| **stopAndGo**       | Distance/pace during pause cycles | 10 min |
| **gpsGlitch**       | Filter spikes, maintain stability | 10 min |
| **hillRun**         | Elevation tracking                | 10 min |
| **enduranceRun**    | Long run (30 min) with fade       | 30 min |
| **sprintIntervals** | Fast/slow/fast pace changes       | 10 min |

---

## Verify It's Working

1. Open app, click "Start Run"
2. Open browser console → Network tab
3. You should see smooth data flowing in
4. No GPS permission prompts (if using simulation)
5. Pace/speed update smoothly without jumping

Check console logs:

```
[RunTracker] Using SimulatedRunSensor: Steady Run
```

---

## Test Metrics Smoothing

Run **steadyRun** and watch pace in browser:

- Should hover around **5:30 min/km**
- No erratic jumping (±0.05 increments max)
- Updates every 2.5 seconds

Run **accelerate** and watch pace:

- Should slowly decrease: 6:00 → 5:50 → 5:40 → 5:30
- No sudden jumps from one interval to next
- Smooth 0.05 min/km steps

Run **stopAndGo** and watch:

- During running: normal pace updates
- During pause: pace holds steady (doesn't spike)
- Resume running: metrics resume normal flow

---

## For Testing: URL Parameters

Instead of localStorage:

```
http://localhost:5173/?RUN_MODE=simulation&SCENARIO=steadyRun
http://localhost:5173/?RUN_MODE=simulation&SCENARIO=hillRun
http://localhost:5173/?RUN_MODE=real
```

URL params override localStorage, override environment variables.

---

## How Sensor System Works

```
You (testing) ─→ localStorage/URL ─→ createRunSensor()
                                         ↓
                              RealRunSensor (GPS)
                              SimulatedRunSensor (data)
                                         ↓
                            useRunTracker hook
                                         ↓
                            Smooth metrics (2.5s cycle)
                                         ↓
                            Update UI (pace, speed, distance)
```

App doesn't care where data comes from. Same code for real or simulated.

---

## Debugging

### Check Current Config

```javascript
import { getSensorConfig } from "@/sensors";
console.log(getSensorConfig());
// { mode: "simulation", scenario: "steadyRun" }
```

### Clear Overrides (use system defaults)

```javascript
import { clearSensorOverrides } from "@/sensors";
clearSensorOverrides();
location.reload();
```

### Check Sensor is Running

```javascript
// In app, after starting run:
const sensor = sensorRef.current;
console.log("Sensor running:", sensor?.isRunning());
```

### Manual Test Sensor

```javascript
import { createRunSensor } from "@/sensors";

const sensor = createRunSensor();
const samples = [];

sensor.onSample((sample) => {
  samples.push(sample);
  console.log(`Sample ${samples.length}:`, sample);
});

sensor.start();

// After ~10 seconds
setTimeout(() => {
  sensor.stop();
  console.log("Got", samples.length, "samples");
}, 10000);
```

---

## For Integration: Programmatic API

```typescript
import {
  createRunSensor,
  setRunMode,
  setScenario,
  type RunSensor,
} from "@/sensors";

// Create sensor (real or simulated based on config)
const sensor: RunSensor = createRunSensor();

// Subscribe
sensor.onSample((sample) => {
  console.log(`Lat: ${sample.latitude}, Lon: ${sample.longitude}`);
});

// Control
sensor.start();
// ... app running ...
sensor.stop();
```

Or with forced mode (for testing):

```typescript
import { SimulatedRunSensor } from "@/sensors";
import { accelerateScenario } from "@/sensors";

const sensor = new SimulatedRunSensor(accelerateScenario);
sensor.start();
// Guaranteed to get acceleration data
```

---

## Files Changed/Added

### New Files

```
src/types/sensor.ts                    # Interfaces (RunSample, RunSensor)
src/sensors/RealRunSensor.ts           # Real GPS wrapper
src/sensors/SimulatedRunSensor.ts      # Simulation engine
src/sensors/simulations.ts             # 8 preset scenarios
src/sensors/sensorFactory.ts           # Mode selection
src/sensors/index.ts                   # Public API
src/__tests__/sensors.test.ts          # Unit tests
```

### Modified Files

```
src/hooks/useRunTracker.ts             # Now uses RunSensor abstraction
src/hooks/useTimer.ts                  # (already updated - no change)
```

### New Documentation

```
SENSOR_SYSTEM.md                       # Complete guide
SENSOR_QUICK_START.md                  # This file
```

---

## Common Tasks

### Run app with different scenario each time

```bash
# Development: Easy testing
localStorage.setItem('SCENARIO', 'steadyRun')

# Acceleration test
localStorage.setItem('SCENARIO', 'accelerate')

# Edge case: GPS noise
localStorage.setItem('SCENARIO', 'gpsGlitch')

# Performance: Long run
localStorage.setItem('SCENARIO', 'enduranceRun')
```

### Test real GPS

```javascript
localStorage.clear();
location.reload();
// Uses real GPS (default)
```

### Test in production builds

```bash
# Build with simulation for CI testing
VITE_RUN_MODE=simulation npm run build

# Build with real GPS for production
VITE_RUN_MODE=real npm run build
```

---

## Next: AI Coach Integration

Sensor data → Metrics smoothing → **AI decisions** (next step)

Current flow:

```
GPS/Sim → useRunTracker → Smoothed metrics → UI
```

Future flow:

```
GPS/Sim → useRunTracker → Smoothed metrics → AI Coach → Coaching feedback
```

The AI coach will consume the same smoothed metrics and emit training recommendations.

---

## Troubleshooting

| Problem                             | Solution                                      |
| ----------------------------------- | --------------------------------------------- |
| GPS permission dialog in simulation | Set `RUN_MODE=simulation`                     |
| Metrics jumping/flickering          | Check smoothing: pace should change 0.05/step |
| Sensor not emitting data            | Check console for `[RunTracker]` log          |
| Want consistent test data           | Use `SimulatedRunSensor` with preset scenario |
| Need to debug sensor                | Check `getSensorConfig()`, inspect samples    |
