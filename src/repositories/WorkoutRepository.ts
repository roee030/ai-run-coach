import type { Workout } from "../types/workout";

export interface WorkoutRepository {
  saveWorkout(workout: Workout): Promise<void>;
  getWorkouts(): Promise<Workout[]>;
  deleteWorkout(id: string): Promise<void>;
}
