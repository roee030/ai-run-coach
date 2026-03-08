import type { SavedRun } from "../types/run";

/** Swap LocalStorageRunRepository for ApiRunRepository here without touching UI. */
export interface RunRepository {
  saveRun(run: SavedRun): Promise<void>;
  getRuns(): Promise<SavedRun[]>;
  getRunById(id: string): Promise<SavedRun | null>;
  deleteRun(id: string): Promise<void>;
}
