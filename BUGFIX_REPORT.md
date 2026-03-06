# Bug Fix Report: Metrics & Map Issues

## Summary

Fixed two critical production issues:

1. **Metrics stuck at 0** - Distance, pace, speed not updating despite GPS samples arriving
2. **Map flickering** - Map re-rendering/resetting on every GPS update instead of smooth marker movement

## Issue 1: Metrics Not Updating

### Root Cause

The `updateSmoothedMetrics` callback was defined inside the `start()` and `resume()` callbacks using `useCallback`. This created a closure that captured stale values of `session.isRunning` and `session.elapsedTime` at the time the scheduler was started, not when the scheduler actually fired.

When the metrics scheduler tried to call this callback 2.5 seconds later:

- The closure had old state values
- The `session.isRunning` and `session.elapsedTime` read from the closure were stale
- Early exit condition `if (!session.isRunning) return;` was using outdated state

This prevented metrics from updating despite the scheduler firing and sensor data flowing.

### Solution

Converted `updateSmoothedMetrics` from a callback inside `start()`/`resume()` to a **ref-based pattern**:

1. Created `updateSmoothedMetricsRef` - a mutable ref that always holds the current callback
2. Created an Effect that updates this ref whenever `session.elapsedTime` or `session.isRunning` changes
3. The Effect wraps the metrics update logic with fresh state values
4. The scheduler now calls `updateSmoothedMetricsRef.current()` instead of a stale closure
5. Removed the change detection logic that was preventing state updates - let state update every 2.5s cycle

This ensures:

- ✅ The scheduler always has access to current state values
- ✅ Metrics update every 2.5s even if no change is detected
- ✅ No stale closure issues
- ✅ Proper cleanup with Effect dependencies

### Code Changes

[useRunTracker.ts](src/hooks/useRunTracker.ts#L69-L118): Replaced useCallback with ref-based pattern
[useRunTracker.ts](src/hooks/useRunTracker.ts#L155-L160): Use ref in start()
[useRunTracker.ts](src/hooks/useRunTracker.ts#L287-L290): Use ref in resume()

## Issue 2: Map Flickering

### Root Cause

The `MapTracker` component had `lastLocation` in the initialization effect's dependency array:

```tsx
useEffect(() => {
  // Initialize map...
}, [lastLocation]); // <- This causes re-initialization on every location change!
```

This caused:

- Map to re-initialize on every GPS sample
- All references lost (polyline, marker, bounds)
- Complete tile reload and zoom reset
- Visual flicker and jank

### Solution

Split map setup into two distinct effects:

1. **Initialization Effect** (empty deps `[]`)
   - Runs once on component mount
   - Creates map instance, tiles, polyline, and marker
   - Initializes everything to default location

2. **Location Update Effect** (depends on `lastLocation`, `isRunning`)
   - Runs whenever location changes
   - Updates marker position only
   - Adds point to polyline
   - Pans map during active run
   - Deduplicates path points to prevent marker overlap

### Additional Improvements

- Added duplicate position check to avoid adding same point twice
- Used `animate: false` on pan to prevent animation jank
- Marker now moves smoothly without map re-initialization
- Polyline grows incrementally as runner moves

### Code Changes

[MapTracker.tsx](src/components/MapTracker.tsx#L21-L62): Removed lastLocation from init deps, create map once
[MapTracker.tsx](src/components/MapTracker.tsx#L65-L94): Enhanced location update with deduplication

## Testing the Fixes

### Issue 1 - Metrics

1. Start a run (real GPS or simulation mode)
2. After 2.5 seconds, distance should display (e.g., "0.25 km")
3. Pace should update (e.g., "06:30 min/km")
4. Speed should update (e.g., "9.2 km/h")
5. Values update smoothly every 2.5 seconds

**Before Fix:** Distance stuck at 0.00, pace at --:--, speed at 0.0
**After Fix:** All metrics update correctly on 2.5s cycle

### Issue 2 - Map

1. Start a run
2. Watch the map marker - it should move smoothly
3. The polyline (purple path) should grow as you move
4. Map should NOT reset, tiles should NOT reload
5. Zoom level stays constant during run

**Before Fix:** Map flickered, reset, and reloaded tiles on every GPS update
**After Fix:** Smooth marker movement, no flicker, constant map state

## Verification

- ✅ Build passes with zero TypeScript errors
- ✅ All dependencies are correct
- ✅ No stale closure issues
- ✅ Sensor system still functioning
- ✅ State management simplified

## Performance Impact

- Reduced unnecessary re-renders in MapTracker
- Eliminated map re-initialization overhead
- More stable metrics rendering
- Smoother visual experience

## Next Steps

1. Test with real GPS in the field
2. Verify simulation mode metrics are accurate
3. Test with poor GPS signal (accuracy filter)
4. Check map performance with long running sessions
