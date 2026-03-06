# AI Run Coach: Sensor & Simulation System Implementation

## What's New

Complete **data abstraction layer + simulation infrastructure** for testing and development.

### Quick Start (30 seconds)

```javascript
// In browser console, right now:
localStorage.setItem("RUN_MODE", "simulation");
localStorage.setItem("SCENARIO", "steadyRun");
location.reload();
```

App now runs with simulated data. No GPS needed.

---

## Key Features

✅ **Test Without GPS** - No permission prompts, works offline  
✅ **8 Realistic Scenarios** - Steady pace, acceleration, hills, intervals, etc.  
✅ **Easy Switching** - Change scenarios in browser console  
✅ **Deterministic Data** - Same scenario = same data (perfect for testing)  
✅ **Zero UI Changes** - Pure logic layer, app looks identical  
✅ **Metrics Smoothing** - Works with existing smoothing (0.05/0.10 increments)  
✅ **Background Safe** - Accurate timing even when tab is backgrounded  
✅ **AI Ready** - Clean data pipeline for coach integration

---

## Documentation

### For Quick Testing (1-5 minutes)

→ **`SENSOR_QUICK_START.md`** - Common tasks and console commands

### For Full Understanding (30 minutes)

→ **`SENSOR_SYSTEM.md`** - Complete architecture, API, integration guide

### For Implementation Details (10 minutes)

→ **`IMPLEMENTATION_SUMMARY.md`** - What was built, files changed

### For Verification (2 minutes)

→ **`COMPLETION_CHECKLIST.md`** - Verify everything works

---

## How It Works

### Architecture

```
App (useRunTracker)
    ↓
RunSensor Interface (abstraction)
    ├─ RealRunSensor (navigator.geolocation)
    └─ SimulatedRunSensor (configurable scenarios)
    ↓
Metrics Smoothing (unchanged)
    ↓
UI Display (unchanged)
```

**Key principle:** App depends only on `RunSensor` interface, not specific implementations.

### Data Flow

```
GPS/Sim Sample
  ↓
Calculate Distance (Haversine)
  ↓
Buffer Speed (rolling window)
  ↓
Every 2.5 Seconds:
  • Smooth metrics (quantize, clamp, filter)
  • Update state
  ↓
UI renders smoothed values
```

---

## Available Scenarios

| Scenario          | Purpose                                 |
| ----------------- | --------------------------------------- |
| `steadyRun`       | Constant pace (5:30) - baseline testing |
| `accelerate`      | 6:00 → 5:00 - speed increase testing    |
| `slowDown`        | 5:00 → 6:30 - deceleration testing      |
| `stopAndGo`       | Running + pauses - interval testing     |
| `gpsGlitch`       | High noise - spike filtering test       |
| `hillRun`         | Elevation changes - terrain testing     |
| `enduranceRun`    | 30 minute run - long session testing    |
| `sprintIntervals` | 4:00 ↔ 6:00 - interval testing          |

Switch scenarios:

```javascript
localStorage.setItem("SCENARIO", "accelerate");
location.reload();
```

---

## Configuration Methods

### Browser Console (Development)

```javascript
localStorage.setItem("RUN_MODE", "simulation");
localStorage.setItem("SCENARIO", "steadyRun");
location.reload();
```

### URL Parameters

```
http://localhost:5173/?RUN_MODE=simulation&SCENARIO=hillRun
```

### Environment Variables (Build-time)

```bash
VITE_RUN_MODE=simulation VITE_SCENARIO=steadyRun npm run dev
VITE_RUN_MODE=real npm run build
```

### Reset to Defaults

```javascript
import { clearSensorOverrides } from "@/sensors";
clearSensorOverrides();
location.reload();
```

---

## Files Added/Changed

### New Files (1500+ lines total)

```
src/types/sensor.ts                    # Interfaces
src/sensors/
├── index.ts                           # Public API
├── RealRunSensor.ts                   # Real GPS wrapper
├── SimulatedRunSensor.ts              # Simulation engine
├── simulations.ts                     # 8 preset scenarios
└── sensorFactory.ts                   # Config & mode selection

src/__tests__/sensors.test.ts          # Unit tests

SENSOR_SYSTEM.md                       # Complete guide (1100+ lines)
SENSOR_QUICK_START.md                  # Quick reference
IMPLEMENTATION_SUMMARY.md              # Overview
COMPLETION_CHECKLIST.md                # Verification
```

### Updated Files

```
src/hooks/useRunTracker.ts             # Now uses RunSensor abstraction
```

---

## Testing Without Real GPS

Currently (before):

```
App requires GPS permission → app can't test without real GPS/location
```

Now (after):

```
App uses RunSensor abstraction → can use simulated or real GPS
→ Test immediately without permission
```

### Test Immediately

1. Open app
2. Paste in console:
   ```javascript
   localStorage.setItem("RUN_MODE", "simulation");
   localStorage.setItem("SCENARIO", "steadyRun");
   location.reload();
   ```
3. Click "Start Run"
4. Watch metrics flow in without GPS errors

### Test Different Scenarios

```javascript
// Try acceleration
localStorage.setItem("SCENARIO", "accelerate");
location.reload();

// Try stop & go
localStorage.setItem("SCENARIO", "stopAndGo");
location.reload();

// Try hills with elevation
localStorage.setItem("SCENARIO", "hillRun");
location.reload();
```

---

## API Reference

### Main Export

```typescript
import { createRunSensor } from '@/sensors';

const sensor = createRunSensor();
sensor.start();
sensor.onSample((sample) => { ... });
sensor.stop();
```

### Configuration

```typescript
import {
  setRunMode, // 'real' | 'simulation'
  setScenario, // scenario name
  getSensorConfig, // check current mode/scenario
  clearSensorOverrides, // reset to defaults
} from "@/sensors";
```

### Scenarios & Types

```typescript
import {
  steadyRunScenario,
  accelerateScenario,
  // ... 6 more scenarios
  ALL_SCENARIOS,
  getScenario,
  getRandomScenario,
} from "@/sensors";

import type { RunSample, RunSensor, SimulationScenario } from "@/sensors";
```

---

## Verification

### Quick Test (30 seconds)

```javascript
// Browser console
localStorage.setItem("RUN_MODE", "simulation");
localStorage.setItem("SCENARIO", "steadyRun");
location.reload();
// Start run - should work without GPS
```

### Check Config

```javascript
import { getSensorConfig } from "@/sensors";
console.log(getSensorConfig());
// { mode: "simulation", scenario: "steadyRun" }
```

### Build Passes

```bash
npm run build
# No errors, output in dist/
```

### View Details

- See `COMPLETION_CHECKLIST.md` for full verification
- See `SENSOR_SYSTEM.md` for architecture details
- See `SENSOR_QUICK_START.md` for common tasks

---

## Metrics Smoothing Integration

The sensor system works seamlessly with existing metrics smoothing:

### Smoothing Applied (Unchanged Behavior)

- Pace updates: every 2.5 seconds
- Pace increments: 0.05 min/km
- Speed increments: 0.10 m/s
- Spike filtering: >50% changes rejected
- Clamping: max 0.15 min/km, 0.2 m/s per update

### Result

- Real GPS → noisy samples → smoothed display
- Simulated data → realistic samples → identical smoothing

Same code, same metrics behavior, different data sources.

---

## Ready for AI Coach

This infrastructure prepares the data pipeline for AI coach integration:

```
RunSensor (real or simulated)
    ↓
useRunTracker (unchanged smoothing)
    ↓
Stable Metrics (pace, speed, distance)
    ↓
AI Coach (coming next)
    ↓
Coaching Feedback
```

The AI coach will consume smoothed metrics and emit training recommendations.

---

## Production Use

### Real GPS (Default)

```bash
# No configuration needed - uses real GPS by default
npm run build
VITE_RUN_MODE=real npm run build  # explicit
```

### Simulation for Testing

```bash
# Build with simulation for CI/testing
VITE_RUN_MODE=simulation npm run build
```

### Switch at Runtime

```javascript
// If needed for specific use cases
localStorage.setItem("RUN_MODE", "real");
location.reload();
```

---

## Support & Troubleshooting

### Common Tasks

See **`SENSOR_QUICK_START.md`** for:

- Switching scenarios
- Checking configuration
- Resetting to defaults
- Console commands

### Architecture & Design

See **`SENSOR_SYSTEM.md`** for:

- Complete API reference
- How simulation works
- Creating custom scenarios
- Integration examples

### Implementation Details

See **`IMPLEMENTATION_SUMMARY.md`** for:

- What was built
- Files created/modified
- Code structure
- Integration with metrics

### Verify Everything Works

See **`COMPLETION_CHECKLIST.md`** for:

- Verification steps
- Quick test procedures
- Success criteria
- Expected results

---

## Summary

**✅ Complete, production-ready sensor & simulation system implemented**

- Data abstraction layer (RunSensor interface)
- Real GPS sensor implementation
- Comprehensive simulation engine with 8 scenarios
- Smart factory for transparent mode switching
- Full integration with existing metrics smoothing
- Zero UI changes
- Extensive documentation
- Ready for AI coach integration

**The app can now be tested offline without GPS, and is ready for AI coach features.**

---

## Next Steps

1. **Test It** - Try scenarios from console (5 min)
2. **Understand It** - Read SENSOR_QUICK_START.md (5 min)
3. **Deep Dive** - Read SENSOR_SYSTEM.md (30 min)
4. **Build Coach** - Implement AI features (next phase)

**Start with:**

```javascript
localStorage.setItem("RUN_MODE", "simulation");
localStorage.setItem("SCENARIO", "steadyRun");
location.reload();
```
