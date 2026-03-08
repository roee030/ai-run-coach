import type { RunRepository } from "./RunRepository";
import type { SavedRun } from "../types/run";

const RUNS_KEY = "arc_run_history";

export class LocalStorageRunRepository implements RunRepository {
  async saveRun(run: SavedRun): Promise<void> {
    const existing = await this.getRuns();
    const updated  = [run, ...existing.filter(r => r.id !== run.id)];
    localStorage.setItem(RUNS_KEY, JSON.stringify(updated));
  }

  async getRuns(): Promise<SavedRun[]> {
    try {
      const raw = localStorage.getItem(RUNS_KEY);
      return raw ? (JSON.parse(raw) as SavedRun[]) : [];
    } catch {
      return [];
    }
  }

  async getRunById(id: string): Promise<SavedRun | null> {
    const runs = await this.getRuns();
    return runs.find(r => r.id === id) ?? null;
  }

  async deleteRun(id: string): Promise<void> {
    const runs = await this.getRuns();
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs.filter(r => r.id !== id)));
  }
}
