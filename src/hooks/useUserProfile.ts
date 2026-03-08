import { useState, useEffect, useCallback } from "react";
import type { UserProfile } from "../types/user";
import { DEFAULT_USER_PROFILE } from "../types/user";
import { userRepository } from "../repositories";

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_USER_PROFILE });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userRepository.getProfile().then(p => { setProfile(p); setLoading(false); });
  }, []);

  const saveProfile = useCallback(async (updated: UserProfile) => {
    await userRepository.saveProfile(updated);
    setProfile(updated);
  }, []);

  return { profile, loading, saveProfile };
}
