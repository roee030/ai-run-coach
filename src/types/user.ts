/** User profile & preferences stored independently of run data. */
export interface UserProfile {
  // Physical stats (used for calorie / training-load calculations)
  weightKg?: number;
  heightCm?: number;

  // Pacing goals
  targetPaceMinPerKm?: number;   // e.g. 5.5 = 5:30/km
  hrZones?: {
    zone1: number;   // easy: HR < zone1
    zone2: number;   // aerobic: HR < zone2
    zone3: number;   // tempo: HR < zone3
    zone4: number;   // threshold: HR < zone4  (zone5 = above)
  };

  // Preferences
  units:                  "km" | "miles";
  audioFeedbackFrequency: "minimal" | "normal" | "frequent";
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  units: "km",
  audioFeedbackFrequency: "normal",
};
