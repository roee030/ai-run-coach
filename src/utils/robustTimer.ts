/**
 * Robust timer using performance.now() for background tab support
 * Avoids setInterval which pauses when tab is backgrounded
 */

/**
 * Timer that uses requestAnimationFrame + performance.now()
 * Remains accurate even when browser tab is not in focus
 *
 * Returns elapsed seconds since start
 */
export class RobustTimer {
  private startTime: number | null = null;
  private pausedTime: number = 0;
  private isPaused: boolean = false;
  private rafId: number | null = null;
  private callbacks: Array<(elapsedSeconds: number) => void> = [];

  /**
   * Start or resume timer
   */
  start(): void {
    if (!this.isPaused && this.startTime === null) {
      // First start
      this.startTime = performance.now();
    } else if (this.isPaused && this.startTime !== null) {
      // Resume: adjust startTime to account for pause duration
      const pauseDuration = performance.now() - this.pausedTime;
      this.startTime += pauseDuration;
      this.isPaused = false;
    }

    this.scheduleFrame();
  }

  /**
   * Pause timer without resetting
   */
  pause(): void {
    this.isPaused = true;
    this.pausedTime = performance.now();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Reset timer to 0
   */
  reset(): void {
    this.startTime = null;
    this.pausedTime = 0;
    this.isPaused = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.notifyCallbacks(0);
  }

  /**
   * Get current elapsed time in seconds
   */
  getElapsed(): number {
    if (this.startTime === null) return 0;
    if (this.isPaused) return this.pausedTime - this.startTime;

    const now = performance.now();
    return (now - this.startTime) / 1000;
  }

  /**
   * Subscribe to timer updates
   * Callback is called every time elapsed time updates significantly
   */
  on(callback: (elapsedSeconds: number) => void): () => void {
    this.callbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Schedule next frame update
   */
  private scheduleFrame(): void {
    this.rafId = requestAnimationFrame(() => {
      if (!this.isPaused) {
        this.notifyCallbacks(this.getElapsed());
        this.scheduleFrame();
      }
    });
  }

  /**
   * Schedule frame and notify after delay
   */
  private notifyCallbacks(elapsed: number): void {
    this.callbacks.forEach((cb) => cb(elapsed));
  }

  /**
   * Stop and cleanup
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

/**
 * Metrics update scheduler - triggers metric recalculation on fixed 2.5s cycle
 *
 * Purpose: Decouple GPS data collection (frequent) from metric updates (fixed interval)
 * This prevents flickering and ensures stable metric displays
 */
export class MetricsUpdateScheduler {
  private rafId: number | null = null;
  private lastUpdateTime: number = 0;
  private callback: (() => void) | null = null;
  private isRunning: boolean = false;

  /**
   * Update interval in milliseconds (2.5 seconds = 2500ms)
   */
  readonly updateInterval: number = 2500;

  /**
   * Start the scheduler - calls callback every 2.5 seconds
   */
  start(callback: () => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.callback = callback;
    this.lastUpdateTime = performance.now();
    this.scheduleUpdate();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Private: Schedule next update using RAF
   * This works even when tab is backgrounded (unlike setInterval)
   */
  private scheduleUpdate(): void {
    this.rafId = requestAnimationFrame(() => {
      if (!this.isRunning) return;

      const now = performance.now();
      const timeSinceLastUpdate = now - this.lastUpdateTime;

      // Trigger callback if 2.5s or more has elapsed
      if (timeSinceLastUpdate >= this.updateInterval) {
        this.lastUpdateTime = now;
        if (this.callback) {
          this.callback();
        }
      }

      // Always schedule next check
      this.scheduleUpdate();
    });
  }
}
