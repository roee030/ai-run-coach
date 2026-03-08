import { useState, useEffect, useCallback } from "react";
import type { Workout } from "../types/workout";
import { workoutRepository } from "../repositories";

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    workoutRepository.getWorkouts().then(w => { setWorkouts(w); setLoading(false); });
  }, []);

  const saveWorkout = useCallback(async (workout: Workout) => {
    await workoutRepository.saveWorkout(workout);
    setWorkouts(prev => [workout, ...prev.filter(w => w.id !== workout.id)]);
  }, []);

  const deleteWorkout = useCallback(async (id: string) => {
    await workoutRepository.deleteWorkout(id);
    setWorkouts(prev => prev.filter(w => w.id !== id));
  }, []);

  return { workouts, loading, saveWorkout, deleteWorkout };
}
