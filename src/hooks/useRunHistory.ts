import { useState, useEffect, useCallback } from "react";
import type { SavedRun } from "../types/run";
import { runRepository } from "../repositories";

export function useRunHistory() {
  const [runs, setRuns]       = useState<SavedRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runRepository.getRuns().then(r => { setRuns(r); setLoading(false); });
  }, []);

  const saveRun = useCallback(async (run: SavedRun) => {
    await runRepository.saveRun(run);
    setRuns(prev => [run, ...prev.filter(r => r.id !== run.id)]);
  }, []);

  const deleteRun = useCallback(async (id: string) => {
    await runRepository.deleteRun(id);
    setRuns(prev => prev.filter(r => r.id !== id));
  }, []);

  return { runs, loading, saveRun, deleteRun };
}
