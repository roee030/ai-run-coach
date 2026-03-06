## Sensor System: Data Abstraction & Simulation Infrastructure

Complete sensor abstraction layer for run tracking. Enables seamless switching between real GPS and simulated data for development and testing.

---

## Architecture Overview

```
App (useRunTracker)
    ↓
RunSensor Interface (abstraction)
    ├─ RealRunSensor (navigator.geolocation)
    └─ SimulatedRunSensor (configurable scenarios)
        ├─ steadyRunScenario
        ├─ accelerateScenario
        ├─ slowDownScenario
        ├─ stopAndGoScenario
        ├─ gpsGlitchScenario
        ├─ hillRunScenario
        ├─ enduranceRunScenario
        └─ sprintIntervalsScenario
```

The app depends **only** on `RunSensor` interface. Actual sensor implementation is injected at runtime.

---

## Quick Start

### 1. Start App with Simulation

**In browser console:**

```javascript
// Switch to simulation mode
localStorage.setItem("RUN_MODE", "simulation");
localStorage.setItem("SCENARIO", "steadyRun");
// Reload page
location.reload();
```

**Or use URL parameters:**

```
http://localhost:5173/?RUN_MODE=simulation&SCENARIO=steadyRun
```

### 2. Available Scenarios

| Scenario          | Purpose                | Duration |
| ----------------- | ---------------------- | -------- |
| `steadyRun`       | Consistent 5:30 pace   | 10 min   |
| `accelerate`      | 6:00 → 5:00 pace       | 10 min   |
| `slowDown`        | 5:00 → 6:30 pace       | 10 min   |
| `stopAndGo`       | Running + pause cycles | 10 min   |
| `gpsGlitch`       | High GPS noise         | 10 min   |
| `hillRun`         | Elevation gain/loss    | 10 min   |
| `enduranceRun`    | Extended 30-min run    | 30 min   |
| `sprintIntervals` | Fast/slow alternation  | 10 min   |

### 3. Programmatic Control

```typescript
import {
  setRunMode,
  setScenario,
  getSensorConfig,
  createRunSensor,
} from "@/sensors";

// Set mode
setRunMode("simulation");
setScenario("steadyRun");

// Check config
const config = getSensorConfig();
console.log(config); // { mode: "simulation", scenario: "steadyRun" }

// Manual sensor creation (testing)
const sensor = createRunSensor();
sensor.start();
sensor.onSample((sample) => {
  console.log(`GPS: ${sample.latitude}, ${sample.longitude}`);
});
sensor.stop();
```

---

## Core Interfaces

### `RunSample`

Single GPS data point with timestamp and location.

```typescript
interface RunSample {
  timestamp: number; // Unix timestamp (ms)
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
  elevation?: number; // meters (optional)
  accuracy?: number; // GPS accuracy in meters
}
```

### `RunSensor`

Generic sensor interface - app depends only on this.

```typescript
interface RunSensor {
  start(): void;
  stop(): void;
  onSample(callback: (sample: RunSample) => void): void;
  offSample(callback: (sample: RunSample) => void): void;
  isRunning(): boolean;
}
```

### `SimulationScenario`

Configuration for simulated run behavior.

```typescript
interface SimulationScenario {
  name: string;
  startLat: number;
  startLon: number;
  durationSeconds: number;
  paceProfile: (elapsedSeconds: number) => number; // min/km
  elevationProfile?: (elapsedSeconds: number) => number; // optional
  gpsNoise?: number; // meters (default 3)
  sampleInterval?: number; // seconds (default 2.5)
}
```

---

## Implementation Details

### RealRunSensor

Wraps `navigator.geolocation.watchPosition()` with no UI coupling.

**Features:**

- High accuracy geolocation
- Error handling
- Clean callback interface
- No DOM dependencies

**Usage:**

```typescript
const sensor = new RealRunSensor();
sensor.start();
sensor.onSample((sample) => {
  console.log(`Real GPS: lat=${sample.latitude}`);
});
sensor.stop();
```

### SimulatedRunSensor

Generates realistic running data based on pace profile.

**Features:**

- Configurable pace curve
- Elevation changes
- Realistic GPS noise (±2-5m)
- Background-safe (uses RAF, not setInterval)
- Smooth position interpolation
- Direction variation (prevents straight lines)

**Physics:**

- Pace → Speed → Distance
- GPS noise applied per sample
- Haversine distance calculations
- Latitude/longitude coordinate conversion

**Example:**

```typescript
const sensor = new SimulatedRunSensor(accelerateScenario);
sensor.start();

sensor.onSample((sample) => {
  // Data flows into useRunTracker just like real GPS
  console.log(`Simulated: pace=${calculatePace(sample)}`);
});

sensor.stop();
```

---

## How It Integrates with useRunTracker

### Before (Direct GPS)

```typescript
navigator.geolocation.watchPosition((position) => {
  // Direct access to position.coords
});
```

### After (Sensor Abstraction)

```typescript
const sensor = createRunSensor(); // Real or simulated
sensor.onSample((sample) => {
  // Unified interface, same code for both
  const location: LocationPoint = {
    latitude: sample.latitude,
    longitude: sample.longitude,
    // ... map other fields
  };
});
sensor.start();
```

**Benefits:**

- ✅ No GPS required for testing
- ✅ Same metric smoothing/calculation
- ✅ Deterministic data for unit tests
- ✅ Easy scenario switching
- ✅ No UI changes needed

---

## Creating Custom Scenarios

### Simple Scenario: Fixed Pace

```typescript
const joggingScenario: SimulationScenario = {
  name: "Easy Jog",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 600,
  paceProfile: () => 6.5, // Constant 6:30/km
  gpsNoise: 2,
  sampleInterval: 2.5,
};

const sensor = new SimulatedRunSensor(joggingScenario);
```

### Complex Scenario: Variable Pace + Elevation

```typescript
const mountainScenario: SimulationScenario = {
  name: "Mountain Run",
  startLat: 40.7128,
  startLon: -74.006,
  durationSeconds: 1200, // 20 minutes

  paceProfile: (elapsed) => {
    const third = 1200 / 3;
    if (elapsed < third) return 6.0 + (elapsed / third) * 1.0; // uphill
    if (elapsed < 2 * third) return 7.0 - ((elapsed - third) / third) * 0.5;
    return 6.5; // descent
  },

  elevationProfile: (elapsed) => {
    const third = 1200 / 3;
    if (elapsed < third) return (elapsed / third) * 200; // climb 200m
    if (elapsed < 2 * third) return 200 - ((elapsed - third) / third) * 200; // descend
    return 0;
  },

  gpsNoise: 4,
  sampleInterval: 2.5,
};
```

---

## Testing & Verification

### Manual Testing in Console

```javascript
// Test simulation
setRunMode("simulation");
setScenario("steadyRun");
location.reload();

// App should track session without real GPS
// Check browser console for sensor logs
```

### Verify Pace Smoothing

Run each scenario and observe:

- **steadyRun**: Pace stays ~5:30
- **accelerate**: Pace smoothly decreases from 6:00 to 5:00
- **slowDown**: Pace smoothly increases from 5:00 to 6:30
- **stopAndGo**: Pace spikes ignored during pauses
- **sprintIntervals**: Clean 4:00 ↔ 6:00 transitions

### Unit Tests

See `src/__tests__/sensors.test.ts` for comprehensive test scenarios:

- Steady pace consistency
- Acceleration detection
- Stop & go behavior
- Hill elevation tracking
- GPS noise/glitch handling
- Data integrity validation

**Run tests (requires Vitest):**

```bash
npm install -D vitest
npm test
```

---

## Configuration

### Environment Variables

Set in `.env` or `.env.local`:

```env
VITE_RUN_MODE=simulation|real          # Default: real
VITE_SCENARIO=steadyRun|accelerate|... # Default: steadyRun
```

### Runtime Control

**Console:**

```javascript
import { setRunMode, setScenario, clearSensorOverrides } from "@/sensors";

// Set mode
setRunMode("simulation");
setScenario("gpsGlitch");

// Clear and use defaults
clearSensorOverrides();

// Check current config
import { getSensorConfig } from "@/sensors";
console.log(getSensorConfig());
```

**URL:**

```
http://localhost:5173/?RUN_MODE=simulation&SCENARIO=hillRun
```

**Priority (highest to lowest):**

1. URL parameters (`?RUN_MODE=...`)
2. localStorage
3. Environment variables
4. Defaults (real GPS, steadyRun)

---

## File Structure

```
src/
├── types/
│   └── sensor.ts              # RunSample, RunSensor, SimulationScenario
├── sensors/
│   ├── index.ts               # Exports (public API)
│   ├── RealRunSensor.ts       # navigator.geolocation wrapper
│   ├── SimulatedRunSensor.ts  # Simulation engine
│   ├── simulations.ts         # Preset scenarios
│   └── sensorFactory.ts       # Mode selection & config
├── hooks/
│   └── useRunTracker.ts       # Updated to use RunSensor
└── __tests__/
    └── sensors.test.ts        # Unit tests
```

---

## Metrics Smoothing Integration

Sensor data flows through:

1. **Raw GPS** → Sample emitted
2. **useRunTracker** → Parse sample to LocationPoint
3. **Distance calculation** → Haversine formula
4. **Speed buffering** → Rolling window (15 samples)
5. **Every 2.5s** → Smooth metrics (quantize, clamp, filter)
6. **UI update** → Render smoothed metrics (pace, speed, distance)

Pace/speed never jump erratically because:

- Simulated data is realistic
- Spikes are filtered (>50% change)
- Metrics clamped to fixed increments
- Displayed on 2.5s cycle (not per GPS ping)

---

## Production Readiness

### For Production (Real GPS Only)

```javascript
setRunMode("real");
// OR set in CI/deploy environment:
// VITE_RUN_MODE=real npm run build
```

### For Development (Flexible)

```javascript
setRunMode("simulation");
setScenario("steadyRun");
// Easy to switch scenarios in browser console
```

### For Testing (Deterministic)

```typescript
// In tests:
const sensor = createRunSensor("simulation", accelerateScenario);
// Predictable data, repeatable results
```

---

## Next Steps: AI Coach Integration

This sensor system is designed as a foundation for the AI running coach:

1. **Raw Metrics** ← SimulatedRunSensor
2. **Smoothed Metrics** ← useRunTracker (metrics smoothing)
3. **Coach Decisions** ← AI Engine (coming next)
4. **Coaching Feedback** → User

The AI coach will consume smoothed metrics and emit coaching instructions at regular intervals.

---

## Troubleshooting

### "Browser has no location permission"

- Running real GPS? Grant location permission
- Running simulation? Check `RUN_MODE=simulation`

### "Metrics seem jumpy"

- Likely using real GPS with poor signal
- Try simulation scenario first: `setScenario('steadyRun')`
- Check GPS accuracy in browser devtools

### "Simulation doesn't seem to run"

- Verify browser supports ES6 `requestAnimationFrame`
- Check localStorage: `localStorage.getItem('RUN_MODE')`
- Check URL params for sensor config

### "Data doesn't flow to UI"

- Verify sensor is running: `sensor.isRunning()`
- Check callbacks are registered: `sensor.onSample(cb)`
- Look for errors in browser console

---

## API Summary

### Public Exports (`src/sensors/index.ts`)

```typescript
// Sensor classes
export { RealRunSensor };
export { SimulatedRunSensor };

// Factory & config
export { createRunSensor, setRunMode, setScenario, clearSensorOverrides, getSensorConfig };

// Presets
export { steadyRunScenario, accelerateScenario, slowDownScenario, ... };
export { getScenario, getRandomScenario };

// Types
export type { RunSample, RunSensor, SimulationScenario, SimulationEvent };
```

### Key Functions

| Function                 | Purpose                         |
| ------------------------ | ------------------------------- |
| `createRunSensor()`      | Get active sensor (real or sim) |
| `setRunMode(mode)`       | Switch between real/simulation  |
| `setScenario(name)`      | Choose simulation scenario      |
| `getSensorConfig()`      | Get current mode/scenario       |
| `clearSensorOverrides()` | Reset to defaults               |

---

## Code Example: Complete Flow

```typescript
import { createRunSensor } from '@/sensors';
import { useRunTracker } from '@/hooks/useRunTracker';

// In useRunTracker:
const start = useCallback(() => {
  // Create sensor (looks at RUN_MODE env/localStorage)
  const sensor = createRunSensor();
  sensorRef.current = sensor;

  // Subscribe to samples
  const handleSample = (sample: RunSample) => {
    // Convert to LocationPoint
    const location: LocationPoint = {
      latitude: sample.latitude,
      longitude: sample.longitude,
      altitude: sample.elevation,
      accuracy: sample.accuracy,
      timestamp: sample.timestamp,
    };

    // Calculate distance, speed
    const distance = calculateDistance(last, current);
    const speed = calculateSpeed(distance, timeDelta);

    // Buffer for smoothing
    speedBuffer.add(speed);
  };

  sensor.onSample(handleSample);
  sensor.start();

  // Every 2.5s: smooth metrics
  scheduler.start(() => {
    const smoothedPace = smoothPace(calculatedPace, lastDisplayedPace, buffer);
    setState({ pace: smoothedPace, ... });
  });
}, []);
```

**Same code works whether using:**

- Real GPS (navigator.geolocation)
- Simulated data (deterministic scenarios)
- Custom sensors (implement RunSensor interface)
