import type { UserProfile } from "../types/user";

/** Swap LocalStorageUserRepository for ApiUserRepository here without touching UI. */
export interface UserRepository {
  getProfile(): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<void>;
}
