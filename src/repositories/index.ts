/**
 * Repository singletons — swap the concrete class here to change the backend
 * (e.g. new ApiRunRepository()) without touching any UI component.
 */

export type { RunRepository }     from "./RunRepository";
export type { UserRepository }    from "./UserRepository";
export type { WorkoutRepository } from "./WorkoutRepository";

import { LocalStorageRunRepository }     from "./LocalStorageRunRepository";
import { LocalStorageUserRepository }    from "./LocalStorageUserRepository";
import { LocalStorageWorkoutRepository } from "./LocalStorageWorkoutRepository";
import type { RunRepository }     from "./RunRepository";
import type { UserRepository }    from "./UserRepository";
import type { WorkoutRepository } from "./WorkoutRepository";

export const runRepository:     RunRepository     = new LocalStorageRunRepository();
export const userRepository:    UserRepository    = new LocalStorageUserRepository();
export const workoutRepository: WorkoutRepository = new LocalStorageWorkoutRepository();
