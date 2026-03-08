import type { UserRepository } from "./UserRepository";
import type { UserProfile } from "../types/user";
import { DEFAULT_USER_PROFILE } from "../types/user";

const PROFILE_KEY = "arc_user_profile";

export class LocalStorageUserRepository implements UserRepository {
  async getProfile(): Promise<UserProfile> {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? { ...DEFAULT_USER_PROFILE, ...(JSON.parse(raw) as Partial<UserProfile>) } : { ...DEFAULT_USER_PROFILE };
    } catch {
      return { ...DEFAULT_USER_PROFILE };
    }
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}
