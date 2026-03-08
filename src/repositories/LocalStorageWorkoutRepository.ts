import type { WorkoutRepository } from "./WorkoutRepository";
import type { Workout } from "../types/workout";

const KEY = "arc_workouts";

export class LocalStorageWorkoutRepository implements WorkoutRepository {
  async saveWorkout(workout: Workout): Promise<void> {
    const existing = await this.getWorkouts();
    const updated  = [workout, ...existing.filter(w => w.id !== workout.id)];
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  async getWorkouts(): Promise<Workout[]> {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Workout[]) : [];
    } catch {
      return [];
    }
  }

  async deleteWorkout(id: string): Promise<void> {
    const existing = await this.getWorkouts();
    localStorage.setItem(KEY, JSON.stringify(existing.filter(w => w.id !== id)));
  }
}
