// ─── Enums ────────────────────────────────────────────────────────────────────

export type StepType     = "warmup" | "run" | "recover" | "rest" | "cooldown" | "other";
export type DurationType = "distance" | "time" | "open";

// ─── Duration ─────────────────────────────────────────────────────────────────

export interface StepDuration {
  type:   DurationType;
  value?: number;  // metres (distance) | seconds (time) | undefined (open)
}

// ─── Targets ──────────────────────────────────────────────────────────────────

export interface PaceTarget {
  type:            "pace";
  minPaceMinPerKm: number;
  maxPaceMinPerKm: number;
}

export interface HrZoneTarget {
  type: "heartRateZone";
  zone: 1 | 2 | 3 | 4 | 5;
}

export interface CadenceTarget {
  type:   "cadence";
  minSpm: number;
  maxSpm: number;
}

export interface NoTarget { type: "none"; }

export type StepTarget = PaceTarget | HrZoneTarget | CadenceTarget | NoTarget;

// ─── Steps ────────────────────────────────────────────────────────────────────

export interface WorkoutStep {
  id:       string;
  stepType: StepType;
  duration: StepDuration;
  target:   StepTarget;
  notes?:   string;
}

export interface RepeatBlock {
  id:          string;
  repeatCount: number;       // 2–40
  steps:       WorkoutStep[];
}

export type WorkoutNode = WorkoutStep | RepeatBlock;

// ─── Workout ──────────────────────────────────────────────────────────────────

export interface Workout {
  id:        string;
  name:      string;
  nodes:     WorkoutNode[];
  createdAt: number;         // ms epoch
}

/** Flattened step with repeat context, used by useActiveWorkout during a run. */
export interface ActiveStep extends WorkoutStep {
  repeatIndex?:        number;   // 0-based iteration index
  repeatTotal?:        number;   // total repeat count
  repeatStepPosition?: number;   // step position within repeat
  repeatStepTotal?:    number;
}

// ─── Type guards ──────────────────────────────────────────────────────────────

export function isRepeatBlock(n: WorkoutNode): n is RepeatBlock {
  return "repeatCount" in n;
}
export function isWorkoutStep(n: WorkoutNode): n is WorkoutStep {
  return "stepType" in n;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function flattenWorkout(workout: Workout): ActiveStep[] {
  const steps: ActiveStep[] = [];
  for (const node of workout.nodes) {
    if (isRepeatBlock(node)) {
      for (let r = 0; r < node.repeatCount; r++) {
        node.steps.forEach((step, si) => {
          steps.push({ ...step, repeatIndex: r, repeatTotal: node.repeatCount, repeatStepPosition: si, repeatStepTotal: node.steps.length });
        });
      }
    } else {
      steps.push({ ...node });
    }
  }
  return steps;
}

/** Visual metadata per step type — colour, icon, display label. */
export const STEP_META: Record<StepType, { color: string; icon: string; label: string }> = {
  warmup:   { color: "#facc15", icon: "🔥", label: "Warm Up"   },
  run:      { color: "#4ade80", icon: "🏃", label: "Run"       },
  recover:  { color: "#60a5fa", icon: "🌊", label: "Recover"   },
  rest:     { color: "#94a3b8", icon: "⏸",  label: "Rest"      },
  cooldown: { color: "#a78bfa", icon: "🧊", label: "Cool Down" },
  other:    { color: "#e2e8f0", icon: "⚡", label: "Other"     },
};

/** HR zone ceiling defaults (bpm) — overridden by user profile. */
export const DEFAULT_HR_ZONES = { zone1: 130, zone2: 145, zone3: 160, zone4: 175 };

/** HR zone ceiling bpm and label lookup. */
export const HR_ZONE_LABELS: Record<1|2|3|4|5, string> = {
  1: "Recovery",  2: "Aerobic",  3: "Tempo",  4: "Threshold",  5: "Max",
};
