import { EventDetector } from "../coaching/eventDetector";
import { update as coachUpdate } from "../coaching/coach";
import type { RunState, RunEvent } from "../coaching/coachTypes";

export type IntentRecord = { intent: string; ts: number };

export function runSequenceGetIntents(samples: RunState[]) {
  const detector = new EventDetector();
  const events: RunEvent[] = [];
  const intents: IntentRecord[] = [];

  for (const s of samples) {
    const emitted = detector.push(s);
    if (emitted.length) events.push(...emitted);
    const intent = coachUpdate(s as any, events as any);
    if (intent) intents.push({ intent, ts: s.timestamp });
  }

  return { intents, events };
}
