/**
 * Metrics smoothing and quantization utilities
 * Ensures stable, non-flickering metric displays
 */

/**
 * Quantize value to fixed increment
 * e.g., 5.237 -> 5.25 (increment 0.05)
 */
export function quantizeValue(value: number, increment: number): number {
  if (value === 0) return 0;
  return Math.round(value / increment) * increment;
}

/**
 * Rolling window buffer for samples
 */
export class SampleBuffer {
  private samples: number[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  add(value: number): void {
    this.samples.push(value);
    if (this.samples.length > this.maxSize) {
      this.samples.shift();
    }
  }

  getAverage(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  getMedian(): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  clear(): void {
    this.samples = [];
  }

  size(): number {
    return this.samples.length;
  }

  getAll(): number[] {
    return [...this.samples];
  }
}

/**
 * Detect and filter GPS spikes and unrealistic jumps
 * Returns true if value should be rejected (outlier)
 */
export function isGpsSpike(
  value: number,
  lastValidValue: number,
  maxDeltaPercent: number = 50,
): boolean {
  if (lastValidValue === 0) return false; // first value always valid

  const delta = Math.abs(value - lastValidValue);
  const percentChange = (delta / lastValidValue) * 100;

  // Reject if change > 50% in a single update
  return percentChange > maxDeltaPercent;
}

/**
 * Clamp sudden metric changes
 * Smoothly transition to new value over max allowed delta per update
 */
export function clampMetricChange(
  current: number,
  target: number,
  maxDeltaPerUpdate: number = 0.1,
): number {
  if (current === 0) return target; // first value

  const delta = target - current;
  if (Math.abs(delta) <= maxDeltaPerUpdate) {
    return target; // already within limit
  }

  // Clamp to max delta in direction of target
  return delta > 0 ? current + maxDeltaPerUpdate : current - maxDeltaPerUpdate;
}

/**
 * Smooth metrics using rolling average with outlier rejection
 * Returns smoothed pace/speed value ready for display
 */
export function smoothMetricValue(
  buffer: SampleBuffer,
  newValue: number,
  lastDisplayedValue: number,
  options: {
    quantizeIncrement?: number; // e.g. 0.05 for pace/speed
    maxDeltaPercent?: number; // reject spikes > N% change
    maxClampDelta?: number; // max change per update cycle
    useMedian?: boolean; // use median instead of mean
  } = {},
): number {
  const {
    quantizeIncrement = 0.05,
    maxDeltaPercent = 50,
    maxClampDelta = 0.1,
    useMedian = false,
  } = options;

  // 1. Check for GPS spike
  if (isGpsSpike(newValue, buffer.getAverage(), maxDeltaPercent)) {
    // Reject spike, return current smoothed value
    return lastDisplayedValue;
  }

  // 2. Add to buffer
  buffer.add(newValue);

  // 3. Calculate smoothed value (average or median)
  const smoothed = useMedian ? buffer.getMedian() : buffer.getAverage();

  // 4. Clamp sudden changes
  const clamped = clampMetricChange(
    lastDisplayedValue,
    smoothed,
    maxClampDelta,
  );

  // 5. Quantize to fixed increment
  const quantized = quantizeValue(clamped, quantizeIncrement);

  return quantized;
}

/**
 * Smooth distance value (cumulative, only increases)
 * Never decreases, gentle smoothing for noisy GPS
 */
export function smoothDistance(
  newDistance: number,
  lastDisplayedDistance: number,
  _buffer: SampleBuffer,
  options: {
    maxDeltaPerUpdate?: number; // max meters increase per update
  } = {},
): number {
  const { maxDeltaPerUpdate = 50 } = options; // default 50m max per update

  // Distance should never go backwards
  if (newDistance < lastDisplayedDistance) {
    return lastDisplayedDistance;
  }

  const delta = newDistance - lastDisplayedDistance;

  // Reject unrealistic jumps (e.g., >100m in one GPS update = likely error)
  if (delta > 100) {
    return lastDisplayedDistance; // ignore spike, keep last valid
  }

  // Smooth the increase
  if (delta > maxDeltaPerUpdate) {
    return lastDisplayedDistance + maxDeltaPerUpdate;
  }

  return newDistance;
}

/**
 * Smooth pace value with special handling
 * Pace is inverse of speed, requires careful smoothing
 */
export function smoothPace(
  newPace: number,
  lastDisplayedPace: number,
  buffer: SampleBuffer,
): number {
  // Pace of 0 is invalid (no distance covered yet)
  if (newPace === 0) {
    return 0;
  }

  // From 0 to first real pace, allow immediate jump
  if (lastDisplayedPace === 0) {
    return quantizeValue(newPace, 0.05);
  }

  // Normal smoothing: quantize with clamping
  return smoothMetricValue(buffer, newPace, lastDisplayedPace, {
    quantizeIncrement: 0.05,
    maxDeltaPercent: 30, // pace more stable than speed
    maxClampDelta: 0.15, // allow up to 0.15 min/km per update
    useMedian: false,
  });
}

/**
 * Smooth speed value
 * Speed changes more rapidly than pace
 */
export function smoothSpeed(
  newSpeed: number,
  lastDisplayedSpeed: number,
  buffer: SampleBuffer,
): number {
  // Speed of 0 during run is valid (standing still)
  if (newSpeed === 0) {
    return 0;
  }

  // From 0 to first real speed, quantize smoothly
  if (lastDisplayedSpeed === 0) {
    return quantizeValue(Math.max(newSpeed, 0.5), 0.1); // min 0.5 m/s = 1.8 km/h
  }

  // Normal smoothing with slightly larger deltas allowed
  return smoothMetricValue(buffer, newSpeed, lastDisplayedSpeed, {
    quantizeIncrement: 0.1, // 0.10 m/s increments
    maxDeltaPercent: 40,
    maxClampDelta: 0.2, // allow up to 0.2 m/s per update
    useMedian: false,
  });
}
