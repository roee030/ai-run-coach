import type { LocationPoint } from "./index";
import type { RunReport } from "../hooks/useCoachEngine";

/** A completed run persisted to the data layer. */
export interface SavedRun {
  id:          string;        // uuid / timestamp string
  date:        number;        // ms epoch (run start)
  distance:    number;        // metres
  elapsedTime: number;        // seconds
  pace:        number;        // min/km average
  intent?:     string;
  runReport?:  RunReport | null;
  locations?:  LocationPoint[];
}
