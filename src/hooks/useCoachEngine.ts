import { useEffect, useRef, useState, useCallback } from "react";
import { RunNarrative } from "../coaching/runNarrative";
import type { NarrativeEvent } from "../coaching/runNarrative";

// ─── Public types ─────────────────────────────────────────────────────────────

type RunState = {
  distance: number;
  pace: number; // min/km
  elapsedTime: number; // seconds
  isRunning?: boolean;
  isPaused?: boolean;
  isFinished?: boolean;
  sessionIntent?: string;
  altitudeM?: number | null; // current GPS altitude (meters ASL)
  heartRate?: number | null; // BPM; null = unavailable
};

export type MessageType =
  | "slow"
  | "speed"
  | "km"
  | "intro"
  | "finish"
  | "trend_accel"
  | "trend_fade"
  | "chapter"
  | "predictive_fade"
  | "recovery"
  | "milestone"
  | "tip"
  | "flow_checkin"
  | "hr_warning"
  | null;

/** Compiled after the run — ready to send to an LLM for AI summary generation. */
export interface RunReport {
  distanceMeters: number;
  elapsedSeconds: number;
  averagePaceMinPerKm: number;
  intent: string;
  events: import("../coaching/runNarrative").NarrativeEvent[];
  chapter: import("../coaching/runNarrative").RunChapter;
  goalDistanceMeters: number | null;
  goalCompletionPct: number | null; // 0–1
  peakAltitudeM: number | null;
  coachStyle: string;
  fitnessLevel: string;
  maxHeartRate: number | null;
}

/** Single entry in the Coach Thought Log — every analyze() decision captured. */
export type ThoughtEntry = {
  time: string; // "MM:SS" into run
  score: number; // need-to-speak score (0-100), 0 = hard-blocked
  inputDesc: string; // "Pace:5:30 | Trend:fading | Dev:+12.3%"
  decision: "SPEAK" | "SILENT" | "MILESTONE";
  reason: string; // e.g. "Score < 80" / "Flow protected" / "Spoke: slow"
  msgType?: string;
  timestamp: number;
};

type CoachStyle = "Motivational" | "Professional" | "Tough";
type FitnessLevel = "Beginner" | "Intermediate" | "Advanced";
type CoachDirection = "slow_down" | "speed_up" | null;

export type UseCoachEngineResult = {
  currentMessage: string | null;
  isSpeaking: boolean;
  messageType: MessageType;
  isCoachSatisfied: boolean;
  /** Call this at the moment the run ends to get the AI-ready report. */
  getRunReport: () => RunReport;
  debug: {
    lastSpokenAt: number | null;
    lastMessage: string | null;
    tooFastEnteredAt: number | null;
    tooSlowEnteredAt: number | null;
    lastKmPaceStr: string | null;
    lastKmAnnounced: number;
    cooldownRemainingMs: number;
    deviation: number;
    prevPace: number | null;
    chapter: string;
    needToSpeakScore: number;
    lastDirection: CoachDirection;
    settlingRemainMs: number;
    phraseCemeterySize: number;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePaceString(p: string | undefined): number | null {
  if (!p) return null;
  const m = p.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function formatPaceForMessage(p: number): string {
  if (!p || p <= 0) return "--:--";
  const min = Math.floor(p);
  const sec = Math.round((p - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function parseIntent(intent: string): {
  easyMode: boolean;
  targetPaceMinPerKm: number | null;
} {
  const lower = intent.toLowerCase();
  return {
    easyMode: /\b(easy|recovery|slow|light|jog|relax)\b/.test(lower),
    targetPaceMinPerKm: (() => {
      const m = lower.match(/(\d{1,2}):(\d{2})/);
      return m ? parseInt(m[1], 10) + parseInt(m[2], 10) / 60 : null;
    })(),
  };
}

function parseGoalDistance(intent: string): number | null {
  const lower = intent.toLowerCase();
  if (/half[\s-]?marathon/.test(lower)) return 21_097;
  if (/\bmarathon\b/.test(lower)) return 42_195;
  const miles = lower.match(/(\d+(?:\.\d+)?)\s*miles?/);
  if (miles) return parseFloat(miles[1]) * 1609.34;
  const km = lower.match(/(\d+(?:\.\d+)?)\s*k(?:m)?/);
  if (km) return parseFloat(km[1]) * 1000;
  return null;
}

type PaceSample = { pace: number; timestamp: number };

function computeTrend(
  samples: PaceSample[],
  minSamples = 6,
  minWindowMs = 20_000,
  threshold = 0.07,
): "surging" | "fading" | "stable" {
  if (samples.length < minSamples) return "stable";
  const span = samples[samples.length - 1].timestamp - samples[0].timestamp;
  if (span < minWindowMs) return "stable";
  const half = Math.floor(samples.length / 2);
  const avg1 = samples.slice(0, half).reduce((s, x) => s + x.pace, 0) / half;
  const avg2 =
    samples.slice(half).reduce((s, x) => s + x.pace, 0) /
    (samples.length - half);
  const change = (avg1 - avg2) / avg1;
  if (change >= threshold) return "surging";
  if (change <= -threshold) return "fading";
  return "stable";
}

// ─── Phrase cemetery ──────────────────────────────────────────────────────────

const CEMETERY_MS = 600_000;

function pickFreshStr(
  arr: string[],
  typeKey: string,
  cemetery: Map<string, number>,
): string | null {
  const now = Date.now();
  const fresh = arr
    .map((_, i) => i)
    .filter((i) => {
      const u = cemetery.get(`${typeKey}_${i}`);
      return !u || now - u > CEMETERY_MS;
    });
  if (fresh.length === 0) return null;
  const idx = fresh[Math.floor(Math.random() * fresh.length)];
  cemetery.set(`${typeKey}_${idx}`, now);
  return arr[idx];
}

function pickFreshFn<A extends unknown[]>(
  arr: Array<(...args: A) => string>,
  typeKey: string,
  cemetery: Map<string, number>,
  ...args: A
): string | null {
  const now = Date.now();
  const fresh = arr
    .map((_, i) => i)
    .filter((i) => {
      const u = cemetery.get(`${typeKey}_${i}`);
      return !u || now - u > CEMETERY_MS;
    });
  if (fresh.length === 0) return null;
  const idx = fresh[Math.floor(Math.random() * fresh.length)];
  cemetery.set(`${typeKey}_${idx}`, now);
  return arr[idx](...args);
}

// ─── Connected coaching ────────────────────────────────────────────────────────

function buildRecoveryMessage(
  event: NarrativeEvent | null,
  style: CoachStyle,
): string {
  const minsAgo = event
    ? Math.round((Date.now() - event.timestamp) / 60_000)
    : 0;
  const ref =
    minsAgo <= 1
      ? "just now"
      : `${minsAgo} minute${minsAgo !== 1 ? "s" : ""} ago`;
  const M: Record<CoachStyle, string[]> = {
    Motivational: [
      `You pushed through that tough patch ${ref} and found your stride again — that's what real runners do.`,
      `I saw you struggle ${ref}. Look at you now — you fought back. Keep this rhythm going.`,
      `That recovery from ${ref} shows real grit. You're stronger than you think.`,
      `${ref.charAt(0).toUpperCase() + ref.slice(1)} you were struggling — now look at this pace. Beautiful recovery.`,
      `Anyway, back to the run — you've bounced back brilliantly from ${ref}. Stay here.`,
    ],
    Professional: [
      `Pace recovered after the deviation ${ref}. Good self-correction. Maintain target effort.`,
      `You've stabilised after the drop ${ref}. Resume controlled pace now.`,
      `Positive recovery noted from ${ref}. Discipline restored — maintain.`,
    ],
    Tough: [
      `You struggled ${ref}. Good — you fought back. Don't let it happen again.`,
      `Back on track from ${ref}. That's more like it. Hold it now.`,
      `As I was saying — get back on pace and stay there. No more drift.`,
    ],
  };
  const vals = M[style];
  return vals[Math.floor(Math.random() * vals.length)];
}

// ─── Message bank ─────────────────────────────────────────────────────────────

const MSG = {
  intro: {
    Motivational: [
      (p: string) =>
        `Let's go! Target pace ${p}. You've got this — ease into it!`,
      (p: string) => `Here we go — aim for ${p}. Start easy and build strong!`,
      (p: string) =>
        `Run time! ${p} is your pace. Breathe and find your rhythm.`,
      (p: string) =>
        `Alright, we're moving. ${p} is the goal — let your body warm up.`,
      (p: string) =>
        `First steps are the hardest. Target is ${p} — take it easy early.`,
    ],
    Professional: [
      (p: string) =>
        `Session started. Target pace ${p}. Ease in for the first kilometre.`,
      (p: string) => `Running initiated. Aiming for ${p} per kilometre.`,
      (p: string) => `All systems go. Target ${p}. Begin at 60% effort.`,
      (p: string) =>
        `Start confirmed. ${p} target. Conserve energy — first km is calibration.`,
    ],
    Tough: [
      (p: string) => `Move it. ${p} is the target. No excuses — let's go.`,
      (p: string) => `Lock in ${p}. Start now, think later.`,
      (p: string) => `Clock's running. ${p} pace — hit it.`,
      (p: string) => `No easing in. ${p}. That's the number. Go.`,
    ],
  },
  chapter_grind: {
    Motivational: [
      "You're into the heart of the run now — settle in and find your flow.",
      "Warmup done. This is where the run is won. Breathe and cruise.",
      "Anyway, back to business — you're in the main phase now. Settle the pace.",
      "The first stretch is behind you. This is your rhythm zone — own it.",
    ],
    Professional: [
      "Main phase. Focus on steady, controlled effort.",
      "Moving into your primary running zone. Maintain consistency.",
      "Warm-up complete. Primary phase engaged — hold target pace.",
    ],
    Tough: [
      "Warmup's over. This is the real run — hold your pace.",
      "Into the grind. No drifting. Stick to the plan.",
      "Easy part's done. Now we see what you're made of.",
    ],
  },
  chapter_finish: {
    Motivational: [
      "The finish is in reach — dig deep! You've earned every step.",
      "Almost there — this is your moment. Empty the tank!",
      "Everything you've trained for comes down to this stretch. Go get it.",
    ],
    Professional: [
      "Final phase. Increase perceived effort. Leave nothing in reserve.",
      "Approaching finish. Maintain form and push.",
      "Last segment. Execute the final push — controlled acceleration.",
    ],
    Tough: [
      "Last stretch. Empty the tank. No excuses.",
      "Final push. Everything you have — give it.",
      "This is where it counts. Don't hold back a single step.",
    ],
  },
  milestone_halfway: {
    Motivational: [
      "Halfway! You're doing amazing — now let's bring it home strong!",
      "50% done. You've got the exact same distance left — and you're warmed up. Go get it!",
      "Half done! This second half is where real runners shine.",
    ],
    Professional: [
      "50 percent complete. Halfway point reached. Maintain current pace.",
      "Halfway marker. Check effort — hold target pace to the finish.",
    ],
    Tough: [
      "Halfway. No celebrating yet — keep the pressure on.",
      "50 percent. You've done half. Now do the harder half.",
    ],
  },
  milestone_final_push: {
    Motivational: [
      "90 percent done — almost there! Empty the tank, this is your moment!",
      "You can see the finish line from here. Give everything you have left!",
      "Last 10 percent. Forget the fatigue, just run.",
    ],
    Professional: [
      "90 percent of distance complete. Final push — stay on form.",
      "Last 10 percent. Maintain cadence and push through.",
    ],
    Tough: [
      "Last 10 percent. Leave nothing behind. GO.",
      "90 percent done. Suffer now, celebrate later. PUSH.",
    ],
  },
  predictive_fade: {
    Motivational: [
      "Your energy's dipping slightly — take a deep breath and reset your posture. You've got more in you.",
      "I notice a small drift in pace. Refocus and find your rhythm — you're not done yet.",
      "Small fade starting. Shorten your stride, speed up your steps. Snap out of it.",
      "I see the pace creeping. Breathe in, drive the arms — let the legs follow.",
      "Speaking of drift — I'm catching a slow fade. Correct it now, not in two minutes.",
      "Three-minute trend says you're slowing. Small adjustments now save big effort later.",
      "Hey — I see what's happening. Refocus. Arms, cadence, posture. Go.",
    ],
    Professional: [
      "3-minute trend shows mild pace decline. Increase cadence slightly to compensate.",
      "Early fade detected. Correct now before it compounds.",
      "Pace drift identified over last 3 minutes. Minor cadence increase needed.",
      "Predictive alert: pace declining gradually. Intervene early.",
    ],
    Tough: [
      "I see you slowing — it's gradual but it's there. Fight it now, not later.",
      "Don't let the pace creep. Take control. Pick up the feet.",
      "You're giving time away. Stop it.",
      "Three minutes of drift. That's too long. Fix it now.",
    ],
  },
  slow: {
    Motivational: [
      "Easy there — you're flying! Reel it back in.",
      "Love the energy! Bring the pace back a touch.",
      "Breathe — slow it down a little. You'll thank yourself later.",
      "Hey, you're pushing too hard for this stage. Ease off.",
      "That's too quick right now. Back it down.",
      "Save it — we've got more to go. Settle in.",
      "You're ahead of pace. Ease up or you'll pay for it.",
      "Slow the legs, keep the momentum — find the groove.",
      "Back it off just a little. You're burning through reserves.",
      "Steady now — this is a long game, not a sprint.",
    ],
    Professional: [
      "Pace exceeds target. Reduce effort by roughly 5 to 8 percent.",
      "Running too fast. Back off to stay in your aerobic zone.",
      "Current pace outside target range. Ease up.",
      "Speed above threshold. Reduce cadence or shorten stride.",
      "Pace deviation: running fast. Self-regulate now.",
      "You're burning matches. Slow to target pace immediately.",
      "Pace exceeds plan. Adjust now — discipline is the key.",
      "Rate too high. Sustainable effort requires easing back.",
      "Pace exceeds plan. Reduce by 10 percent to stay in zone.",
    ],
    Tough: [
      "Back off! You'll blow up before the finish.",
      "Slow down. Race strategy matters — stick to the plan.",
      "That's too fast. Control yourself.",
      "You're going to pay for that — back off now.",
      "Smart runners don't burn the first half. Slow down.",
      "Nice ego. Bad strategy. Back it down.",
      "You're racing yourself. Stop it.",
      "I said target pace, not race pace. Back. Off.",
      "Easy, rookie. Save the sprint for the finish.",
    ],
  },
  speed: {
    Motivational: [
      "Dig deep — you can push a little more!",
      "Come on, there's more in the tank! Pick it up.",
      "You're fading — let's bring it back up. Push!",
      "Don't let the pace slip away. Drive the knees.",
      "Feeling heavy? Push through — it gets easier in 20 seconds.",
      "Anyway, back to the run — let's get that pace back.",
      "This is your moment to show what you've got. Pick it up.",
      "I know it's tough, but dig in. One step at a time.",
      "Find your form — shoulders back, arms pumping.",
      "Run yourself out of this rut. You've got this.",
    ],
    Professional: [
      "Pace below target. Increase cadence.",
      "Falling behind goal pace. Apply more effort.",
      "Pace deficit detected. Accelerate to close the gap.",
      "Under target. Increase stride rate.",
      "Effort insufficient. Elevate heart rate by 5 to 8 percent.",
      "Pace gap widening. Correct now before you fall too far behind.",
      "Output declining. Increase work rate to return to target.",
      "Running below threshold. Close the gap to target pace.",
    ],
    Tough: [
      "Pick it up! Stop coasting.",
      "That's not good enough. Push harder.",
      "You're slacking — move faster.",
      "What's happening? Get moving.",
      "This isn't a walk. Accelerate.",
      "Come on — that pace is embarrassing. Lift it.",
      "If it doesn't hurt a little, you're not trying. Push.",
      "You didn't come here to coast. Pick it up now.",
      "Speed up or go home.",
    ],
  },
  km: {
    Motivational: [
      (km: number, pace: string) =>
        `${km} km done — last split ${pace}! Keep that energy going!`,
      (km: number, pace: string) =>
        `Nice! ${km} kilometres in the bag. Last km was ${pace}.`,
      (km: number, pace: string) =>
        `${km} down! Ran that one in ${pace}. Feeling good?`,
      (km: number, pace: string) =>
        `${km} km! Split was ${pace}. You're building something here.`,
      (km: number, pace: string) =>
        `Kilometre ${km} — ${pace} last split. Every one counts!`,
      (km: number, pace: string) =>
        `${km} km complete. Last km in ${pace} — love it. Keep going!`,
    ],
    Professional: [
      (km: number, pace: string) => `${km} kilometre split: ${pace} per km.`,
      (km: number, pace: string) =>
        `Kilometre ${km} complete. Last pace: ${pace}.`,
      (km: number, pace: string) => `${km} km marker. Split time: ${pace}.`,
      (km: number, pace: string) =>
        `${km} km logged. Last split: ${pace}. Maintain.`,
    ],
    Tough: [
      (km: number, pace: string) =>
        `${km} km. Last km ${pace}. Don't slow down now.`,
      (km: number, pace: string) =>
        `${km} kilometres. Split: ${pace}. Stay on it.`,
      (km: number, pace: string) => `${km} km — ${pace}. Keep the pressure on.`,
      (km: number, pace: string) =>
        `${km} down, split ${pace}. No excuses from here.`,
    ],
  },
  trend_accel: {
    Motivational: [
      "I see that pickup — love the energy! Stay controlled.",
      "Nice surge! Channel it — keep it smooth.",
      "You're on fire! Hold that rhythm, don't peak too early.",
      "Positive trend! Let's keep building — controlled and deliberate.",
      "That's the acceleration I like to see. Just don't blow up.",
      "I notice you're picking it up. Smart move — keep it dialled in.",
      "You found another gear. Stay in it — but don't burn it out.",
      "Great momentum shift! Ride it sensibly.",
      "The pace is improving — this is what training is for. Stay smooth.",
      "Anyway, whatever clicked — keep that feeling going.",
    ],
    Professional: [
      "Acceleration trend detected. Maintain current intensity.",
      "Pace improving consistently. Stay disciplined.",
      "You're speeding up. Check effort — stay in your zone.",
      "Positive pace trend confirmed. Sustain, don't escalate.",
      "Pacing ahead of target. Monitor and self-regulate.",
      "Upward trend noted. Controlled effort — don't overextend.",
      "Pace increasing efficiently. Maintain cadence and form.",
    ],
    Tough: [
      "I see that surge. Don't waste it early.",
      "Good move. Now hold it.",
      "Strong pickup. Stay on it.",
      "I like this pace shift. Keep it honest though.",
      "Fast is good. Smart and fast is better. Hold.",
      "You found a gear. Now don't blow the engine.",
      "Nice. Now sustain it without burning out.",
    ],
  },
  trend_fade: {
    Motivational: [
      "You're losing a bit of rhythm — dig deep! You've got this.",
      "Come on, get that pace back! Don't let it slip.",
      "Fade happens. Fight it — one step at a time.",
      "I see the pace dropping. Refocus — arms, legs, breathe.",
      "Small drift in pace. Let's correct it before it becomes a habit.",
      "Don't let fatigue make the decisions. You're in control — push back.",
      "Speaking of tough moments — this is one. Dig in.",
      "Pace is sliding. Check your form and drive through it.",
      "I know it's getting hard. That's exactly when you push.",
      "Your pace is drifting — don't let the body lie to the mind.",
    ],
    Professional: [
      "Pace declining over the last minute. Increase cadence.",
      "Negative trend detected. Apply more effort.",
      "Pace degradation observed. Correct now.",
      "Downward pace trend confirmed. Increase work rate.",
      "Speed declining. Technique check — cadence, posture, arm drive.",
      "Output falling. Controlled cadence increase required.",
      "Fading trend — intervene now. Small gains correct big drifts.",
    ],
    Tough: [
      "You're fading — fight for every second.",
      "Don't give up that time. Push harder.",
      "This is where champions are made. Push.",
      "You're letting the run beat you. Fight back.",
      "Stop fading. Pick up the feet.",
      "I see it. You see it. Fix it.",
      "Fade is a choice. Choose differently.",
    ],
  },
  tip_beginner: [
    "Breathe in through your nose, out through your mouth — find a rhythm.",
    "Relax your shoulders and unclench your fists. Stay loose.",
    "Shorten your stride and speed up your steps — it's more efficient.",
    "Keep your head up and eyes forward. Good form saves energy.",
    "Land midfoot, not on your heel — it reduces impact on your joints.",
    "Keep your arms at 90 degrees and drive them forward — your legs follow.",
    "Don't hold your breath. Sync your breathing to your steps.",
    "Engage your core slightly — a strong centre powers every stride.",
    "Lean slightly forward from the ankles, not the waist.",
    "If you can't speak a sentence, you're running too fast. Ease off.",
    "Smile — it actually relaxes your face muscles and reduces fatigue.",
  ],
  flow_checkin: {
    Motivational: [
      "You're absolutely nailing this pace — stay in this zone!",
      "This is what it looks like when training pays off. Keep it up!",
      "Perfect execution. You're running like a pro right now.",
      "This rhythm is exactly where I want you. Stay here.",
      "Brilliant work — you're in complete control. Keep flowing.",
      "You've found your stride. This is your race pace — own it.",
    ],
    Professional: [
      "Pace within target range. Efficiency maintained. Continue.",
      "Performance nominal. Maintain this cadence.",
      "Splits on track. Continue at current effort level.",
      "Effort consistent with plan. Stay on current output.",
    ],
    Tough: [
      "Good. Don't get comfortable — stay sharp.",
      "On pace. This is the minimum. Don't back off.",
      "You're doing the work. Don't waste it now.",
      "Solid running. But this is where you need to hold it.",
    ],
  },
  resume: {
    Motivational: [
      "You're back! Find your rhythm — your body remembers. Let's go!",
      "Welcome back! Pick up that pace — you've got this.",
      "Back in action. Breathe, relax, and find your stride again.",
      "That rest is done — now show them what you're made of. Move!",
      "Good — you're back. Don't overthink it. Just run.",
    ],
    Professional: [
      "Session resumed. Re-establish target pace and effort.",
      "Back on course. Return to target cadence.",
      "Resuming. Ease back in, then lock onto pace.",
    ],
    Tough: [
      "Back at it. No more breaks. Go.",
      "Pausing is fine. Staying stopped isn't. Move.",
      "You're back. Now make it count.",
    ],
  },
  form_tips: [
    "Relax your shoulders — drop them away from your ears.",
    "Swing your arms forward, not across your body. Drive the elbows back.",
    "Take three slow, deep breaths. In through the nose, out through the mouth.",
    "Shorten your stride and quicken your steps — it's more efficient.",
    "Keep your gaze 10 metres ahead. Head up, chin level.",
    "Engage your core lightly — it protects your lower back.",
    "Land softly under your hips, not out in front of you.",
    "Unclench your fists. Imagine holding a potato chip without breaking it.",
    "Lean gently forward from your ankles — not from the waist.",
    "Think tall — imagine a string pulling the crown of your head to the sky.",
  ],
  finish: {
    Motivational: [
      (avg: string) =>
        `Amazing run! Average pace ${avg} — you absolutely crushed it!`,
      (avg: string) =>
        `That's a wrap! Average ${avg}. You should be really proud.`,
      (avg: string) => `Run complete! ${avg} average pace. Incredible effort!`,
      (avg: string) =>
        `You did it! ${avg} average. Every step of that was earned.`,
      (avg: string) => `Done! Average pace ${avg}. That took guts — well done.`,
    ],
    Professional: [
      (avg: string) => `Session complete. Average pace: ${avg}.`,
      (avg: string) => `Run finished. Final average: ${avg} per kilometre.`,
      (avg: string) => `Done. Average pace ${avg}. Review your splits.`,
      (avg: string) =>
        `Training session logged. Average: ${avg}. Good execution.`,
    ],
    Tough: [
      (avg: string) => `Done. Average: ${avg}. Next time, faster.`,
      (avg: string) => `Finished. Average ${avg}. Rest up — then go harder.`,
      (avg: string) => `That's it. ${avg} average. Set a new target.`,
      (avg: string) => `Run over. ${avg}. Not bad. Do better.`,
    ],
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCoachEngine(
  runState: RunState,
  /** Optional DEV callback — called on every analysis cycle with the coach's "thought". */
  onThought?: (entry: ThoughtEntry) => void,
): UseCoachEngineResult {
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [isCoachSatisfied, setIsCoachSatisfied] = useState(false);
  const debugScoreRef = useRef(0);

  const lastSpokenAt = useRef<number>(0);
  const lastKmAnnounced = useRef<number>(0);
  const tooFastEnteredAt = useRef<number | null>(null);
  const tooSlowEnteredAt = useRef<number | null>(null);
  const prevIsRunning = useRef<boolean | undefined>(undefined);
  const lastKmTimeRef = useRef<number>(0);
  const lastKmPaceRef = useRef<string | null>(null);
  const prevPaceRef = useRef<number | null>(null);

  const milestoneHalfRef = useRef(false);
  const milestoneFinalRef = useRef(false);
  const milestone500Ref  = useRef(false);
  const milestone200Ref  = useRef(false);
  const milestone100Ref  = useRef(false);
  const goalDistanceRef = useRef<number | null>(null);

  const prevIsPausedRef = useRef<boolean | undefined>(undefined);

  const shortTrendRef = useRef<PaceSample[]>([]);
  const longTrendRef = useRef<PaceSample[]>([]);

  const lastDirectionRef = useRef<CoachDirection>(null);
  const lastInstructionAt = useRef<number>(0);
  const SETTLING_MS = 15_000;

  const phraseCemeteryRef = useRef<Map<string, number>>(new Map());
  const narrativeRef = useRef(new RunNarrative());

  // HR tracking
  const maxHeartRateRef = useRef<number | null>(null);
  const lastHrWarningAt = useRef<number>(0);

  // Dynamic flow check-in tracking
  const flowCheckinPctsRef = useRef(new Set<number>()); // which 20% goal buckets we've spoken at
  const lastFlowCheckinAt = useRef<number>(0);

  // Altitude rolling buffer for hill detection (last 60 s)
  const altSamplesRef = useRef<{ alt: number; ts: number }[]>([]);

  // Peak altitude during run (for RunReport)
  const peakAltitudeRef = useRef<number | null>(null);

  // Stable ref so the interval always reads the latest runState without re-registering.
  const runStateRef = useRef(runState);
  useEffect(() => {
    runStateRef.current = runState;
  });

  // Keep a stable ref to the callback to avoid restarting the effect
  const onThoughtRef = useRef(onThought);
  useEffect(() => {
    onThoughtRef.current = onThought;
  }, [onThought]);

  // Dedup ref: skip log entries that haven't changed within 5 s
  const lastThoughtRef = useRef<{ key: string; ts: number } | null>(null);

  const profileRef = useRef<{
    fitnessLevel?: string;
    easyPace?: string;
    coachStyle?: string;
  } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding");
      if (raw) profileRef.current = JSON.parse(raw);
    } catch {
      profileRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const narrative = narrativeRef.current;
    const cemetery = phraseCemeteryRef.current;

    // ── Voice selection: pick the best available English voice ────────────────
    let selectedVoice: SpeechSynthesisVoice | null = null;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      // Preference order: natural/neural > Google > Microsoft > any en-GB/en-US
      const enVoices = voices.filter(v => /^en[-_]/i.test(v.lang));
      const preferred = [
        enVoices.find(v => /google uk english/i.test(v.name)),
        enVoices.find(v => /google us english/i.test(v.name)),
        enVoices.find(v => /microsoft.*natural/i.test(v.name)),
        enVoices.find(v => /microsoft/i.test(v.name) && v.lang === "en-US"),
        enVoices.find(v => v.lang === "en-GB"),
        enVoices.find(v => v.lang === "en-US"),
        enVoices[0],
      ];
      selectedVoice = preferred.find(Boolean) ?? null;
    };
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);

    // ── Internal helpers ─────────────────────────────────────────────────────

    /** Emit a thought-log entry to the DEV callback — deduped: skips identical entries < 5 s apart. */
    const logThought = (
      score: number,
      inputDesc: string,
      decision: ThoughtEntry["decision"],
      reason: string,
      msgType?: string,
    ) => {
      if (!onThoughtRef.current) return;
      const now = Date.now();
      const key = `${score}|${decision}|${msgType ?? ""}|${reason}`;
      const last = lastThoughtRef.current;
      if (last && last.key === key && now - last.ts < 5_000) return;
      lastThoughtRef.current = { key, ts: now };
      const rs = runStateRef.current;
      const mins = Math.floor(rs.elapsedTime / 60);
      const secs = Math.floor(rs.elapsedTime % 60);
      onThoughtRef.current({
        time: `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`,
        score,
        inputDesc,
        decision,
        reason,
        msgType,
        timestamp: now,
      });
    };

    /** Queue speech; records narrative + emits thought on onstart. */
    const speak = (
      text: string,
      type: MessageType = null,
      forceSpeak = false,
      rateOverride?: number,
    ) => {
      if (!mounted) return;
      const synth = window.speechSynthesis;
      if (!synth || (synth.speaking && !forceSpeak)) return;
      const utter = new SpeechSynthesisUtterance(text);
      if (selectedVoice) utter.voice = selectedVoice;
      utter.rate = rateOverride ?? 0.95;
      utter.pitch = 0.9;
      utter.volume = 1;
      utter.onstart = () => {
        if (!mounted) return;
        setIsSpeaking(true);
        lastSpokenAt.current = Date.now();
        if (type) {
          narrative.recordSpeech(type);
          setMessageType(type);
        } else {
          setMessageType(null);
        }
        try {
          window.navigator?.vibrate?.([100, 50, 100]);
        } catch {
          /* ignore */
        }
      };
      utter.onend = () => {
        if (mounted) setIsSpeaking(false);
      };
      synth.speak(utter);
      setCurrentMessage(text);
    };

    // ── analyze — every 1 s ───────────────────────────────────────────────────
    const analyze = () => {
      // Always read the latest run state from the ref (avoids stale closure values).
      const runState = runStateRef.current;
      const profile = profileRef.current;
      const coachStyle = (profile?.coachStyle as CoachStyle) ?? "Motivational";
      const fitnessLevel =
        (profile?.fitnessLevel as FitnessLevel) ?? "Intermediate";

      const easyPaceVal = parsePaceString(profile?.easyPace) ?? null;
      const currentPace = runState.pace;
      const distanceMeters = runState.distance;
      const isRunning = !!runState.isRunning;
      const isFinished = !!runState.isFinished;
      const now = Date.now();

      const intent = runState.sessionIntent ?? "";
      const { easyMode, targetPaceMinPerKm: intentPace } = parseIntent(intent);
      const targetPace = intentPace ?? easyPaceVal;
      const fastTolerance = easyMode ? 0.85 : 0.9;
      const slowTolerance = easyMode ? 1.3 : 1.2;

      // ── Altitude tracking ────────────────────────────────────────────────────
      const altM = runState.altitudeM ?? null;
      if (altM !== null) {
        altSamplesRef.current = [
          ...altSamplesRef.current,
          { alt: altM, ts: now },
        ].filter((s) => now - s.ts <= 60_000);
        if (
          peakAltitudeRef.current === null ||
          altM > peakAltitudeRef.current
        ) {
          peakAltitudeRef.current = altM;
        }
      }
      // Climbing if altitude gained > 4 m over the last 60 s
      const altitudeGain60s =
        altSamplesRef.current.length >= 2 && altM !== null
          ? altM - altSamplesRef.current[0].alt
          : 0;
      const isClimbing = altitudeGain60s > 4;

      // ── Heart rate tracking ──────────────────────────────────────────────────
      const heartRate = runState.heartRate ?? null;
      if (heartRate && heartRate > 0) {
        if (
          maxHeartRateRef.current === null ||
          heartRate > maxHeartRateRef.current
        ) {
          maxHeartRateRef.current = heartRate;
        }
      }

      if (!goalDistanceRef.current) {
        const gd = parseGoalDistance(intent);
        if (gd) {
          goalDistanceRef.current = gd;
          narrative.setGoalDistance(gd);
        }
      }

      const chapter = narrative.updateChapter(
        distanceMeters,
        runState.elapsedTime,
      );

      // ── Not running ──────────────────────────────────────────────────────────
      if (!isRunning && !isFinished) {
        setIsCoachSatisfied(false);
        logThought(0, "Not running", "SILENT", "Not running");
        prevIsRunning.current = isRunning;
        return;
      }

      // ── Run start intro ──────────────────────────────────────────────────────
      if (isRunning && !prevIsRunning.current) {
        const paceStr = targetPace
          ? formatPaceForMessage(targetPace)
          : "your target pace";
        const msg =
          pickFreshFn(
            MSG.intro[coachStyle],
            `intro_${coachStyle}`,
            cemetery,
            paceStr,
          ) ?? MSG.intro[coachStyle][0](paceStr);
        speak(msg, "intro", true);
        logThought(
          100,
          `Start | Target:${paceStr}`,
          "MILESTONE",
          "Run started — intro",
        );
        prevIsRunning.current = isRunning;
        prevIsPausedRef.current = false;
        return;
      }

      // ── Resume after pause ───────────────────────────────────────────────────
      const isPaused = !!runState.isPaused;
      if (!isPaused && prevIsPausedRef.current === true) {
        const msg =
          pickFreshStr(
            MSG.resume[coachStyle],
            `resume_${coachStyle}`,
            cemetery,
          ) ?? MSG.resume[coachStyle][0];
        speak(msg, "intro", true);
        logThought(100, "Resumed after pause", "MILESTONE", "Resume after pause");
        prevIsPausedRef.current = false;
        return;
      }
      prevIsPausedRef.current = isPaused;

      // ── Finish ───────────────────────────────────────────────────────────────
      if (isFinished && prevIsRunning.current) {
        const avgPace = formatPaceForMessage(runState.pace);
        const msg =
          pickFreshFn(
            MSG.finish[coachStyle],
            `finish_${coachStyle}`,
            cemetery,
            avgPace,
          ) ?? MSG.finish[coachStyle][0](avgPace);
        speak(msg, "finish", true);
        logThought(
          100,
          `Finished | Avg:${avgPace}`,
          "MILESTONE",
          "Run finished",
        );
        prevIsRunning.current = false;
        return;
      }

      prevIsRunning.current = isRunning;
      if (!isRunning || currentPace <= 0) return;

      // ── Chapter transition ───────────────────────────────────────────────────
      if (narrative.didChapterChange() && chapter !== "start") {
        const bank =
          chapter === "finish" ? MSG.chapter_finish : MSG.chapter_grind;
        const msg =
          pickFreshStr(
            bank[coachStyle],
            `chapter_${chapter}_${coachStyle}`,
            cemetery,
          ) ?? bank[coachStyle][0];
        speak(msg, "chapter", true);
        logThought(
          100,
          `Chapter: ${chapter}`,
          "MILESTONE",
          `Chapter transition → ${chapter}`,
        );
        return;
      }

      // ── KM milestone ─────────────────────────────────────────────────────────
      const km = Math.floor(distanceMeters / 1000);
      if (km > 0 && km !== lastKmAnnounced.current) {
        const deltaSec = runState.elapsedTime - (lastKmTimeRef.current || 0);
        const lastKmPace = formatPaceForMessage(
          deltaSec > 0 ? deltaSec / 60 : 0,
        );
        lastKmPaceRef.current = lastKmPace;
        narrative.recordEvent({
          type: "milestone",
          timestamp: now,
          distanceMeters,
          paceMinPerKm: currentPace,
          description: `${km}km in ${lastKmPace}`,
        });
        const msg =
          pickFreshFn(
            MSG.km[coachStyle],
            `km_${coachStyle}`,
            cemetery,
            km,
            lastKmPace,
          ) ?? MSG.km[coachStyle][0](km, lastKmPace);
        speak(msg, "km", true);
        logThought(
          100,
          `KM ${km} | Split:${lastKmPace}`,
          "MILESTONE",
          "Kilometre marker",
        );
        lastKmAnnounced.current = km;
        lastKmTimeRef.current = runState.elapsedTime;
        return;
      }

      // ── Goal milestones ──────────────────────────────────────────────────────
      const goalDist = goalDistanceRef.current;
      if (goalDist && goalDist > 0) {
        const pct = distanceMeters / goalDist;
        if (pct >= 0.5 && !milestoneHalfRef.current) {
          milestoneHalfRef.current = true;
          const msg =
            pickFreshStr(
              MSG.milestone_halfway[coachStyle],
              `half_${coachStyle}`,
              cemetery,
            ) ?? MSG.milestone_halfway[coachStyle][0];
          speak(msg, "milestone", true);
          logThought(
            100,
            "50% of goal reached",
            "MILESTONE",
            "Halfway goal milestone",
          );
          return;
        }
        if (pct >= 0.9 && !milestoneFinalRef.current) {
          milestoneFinalRef.current = true;
          const msg =
            pickFreshStr(
              MSG.milestone_final_push[coachStyle],
              `final_${coachStyle}`,
              cemetery,
            ) ?? MSG.milestone_final_push[coachStyle][0];
          speak(msg, "milestone", true);
          logThought(100, "90% of goal reached", "MILESTONE", "Final push milestone");
          return;
        }

        // Countdown: 500m, 200m, 100m to go
        const remaining = goalDist - distanceMeters;
        const COUNTDOWN: Array<{ threshold: number; ref: { current: boolean }; msgs: Record<CoachStyle, string> }> = [
          {
            threshold: 500,
            ref: milestone500Ref,
            msgs: {
              Motivational: "500 metres to go! You've got this — bring it home!",
              Professional: "500 metres remaining. Maintain your pace.",
              Tough: "500 left. Don't you dare slow down now.",
            },
          },
          {
            threshold: 200,
            ref: milestone200Ref,
            msgs: {
              Motivational: "200 metres! Nearly there — give everything you have!",
              Professional: "200 metres. Final push — stay on form.",
              Tough: "200 metres. Leave it all on the road.",
            },
          },
          {
            threshold: 100,
            ref: milestone100Ref,
            msgs: {
              Motivational: "Last 100 metres! Sprint it out — you've earned this!",
              Professional: "100 metres. Maximum effort. Finish strong.",
              Tough: "100 metres. Empty the tank. GO.",
            },
          },
        ];
        for (const c of COUNTDOWN) {
          if (remaining <= c.threshold && !c.ref.current) {
            c.ref.current = true;
            speak(c.msgs[coachStyle], "milestone", true, 1.05);
            logThought(100, `${c.threshold}m to go`, "MILESTONE", `Countdown ${c.threshold}m`);
            return;
          }
        }
      }

      // ── Trend buffers ────────────────────────────────────────────────────────
      const sample: PaceSample = { pace: currentPace, timestamp: now };
      shortTrendRef.current = [...shortTrendRef.current, sample].filter(
        (s) => now - s.timestamp <= 60_000,
      );
      longTrendRef.current = [...longTrendRef.current, sample].filter(
        (s) => now - s.timestamp <= 180_000,
      );
      const trend60 = computeTrend(shortTrendRef.current);
      const trend3Min = computeTrend(longTrendRef.current, 8, 30_000, 0.05);

      // ── Deviation & flow ─────────────────────────────────────────────────────
      const deviation = targetPace
        ? (currentPace - targetPace) / targetPace
        : 0;
      const absDeviation = Math.abs(deviation);
      const isOnTarget = targetPace !== null && absDeviation < 0.08;
      narrative.updateFlowState(isOnTarget);
      const flowMs = narrative.getFlowDurationMs();
      const satisfied = isRunning && flowMs > 120_000 && absDeviation < 0.08;
      setIsCoachSatisfied(satisfied);

      // Standard input description for thought log
      const inputDesc = `Pace:${formatPaceForMessage(currentPace)} | Trend60:${trend60} | Trend3m:${trend3Min} | Dev:${(deviation * 100).toFixed(1)}%`;

      // Score helper — writes to ref (no state update, avoids re-render spam)
      const scoreFor = (type: string) => {
        const s = narrative.calculateScore({
          paceDeviation: deviation,
          trend3Min,
          messageType: type,
        });
        debugScoreRef.current = s;
        return s;
      };

      const inSettling = now - lastInstructionAt.current < SETTLING_MS;
      const hasActiveDeviation =
        lastDirectionRef.current !== null &&
        now - lastInstructionAt.current < 120_000;
      const isPositiveCoherent =
        !lastDirectionRef.current ||
        isOnTarget ||
        now - lastInstructionAt.current > 300_000;

      // ── P0 HR Fatigue / Overheating (urgent safety — bypasses all cooldowns) ──
      if (
        heartRate &&
        heartRate > 185 &&
        targetPace !== null &&
        deviation > 0.03 &&
        runState.elapsedTime > 120 &&
        now - lastHrWarningAt.current > 180_000 // 3-min repeat guard
      ) {
        speak(
          "Heart rate critical. Ease off or walk — let your body recover.",
          "hr_warning",
          true,
          0.85,
        );
        lastHrWarningAt.current = now;
        logThought(
          100,
          inputDesc,
          "SPEAK",
          `HR fatigue alert — ${heartRate} BPM`,
          "hr_warning",
        );
        prevPaceRef.current = currentPace;
        return;
      }

      // ── Flow protected? (with dynamic positive check-ins) ────────────────────
      if (satisfied) {
        // Dynamic positive reinforcement — check if it's time to check in
        let shouldCheckin = false;
        const goalDist = goalDistanceRef.current;
        if (goalDist && goalDist > 0) {
          // Bucket into 20% increments (0.2, 0.4, 0.6, 0.8) — skip 0 and 1.0+
          const bucket = Math.floor(distanceMeters / goalDist / 0.2) * 0.2;
          if (
            bucket >= 0.2 &&
            bucket < 1.0 &&
            !flowCheckinPctsRef.current.has(bucket)
          ) {
            flowCheckinPctsRef.current.add(bucket);
            shouldCheckin = true;
          }
        } else {
          const intervalMs =
            fitnessLevel === "Beginner"
              ? 240_000
              : fitnessLevel === "Advanced"
                ? 480_000
                : 360_000;
          if (now - lastFlowCheckinAt.current >= intervalMs) {
            shouldCheckin = true;
          }
        }

        if (shouldCheckin && now - lastSpokenAt.current >= 120_000) {
          const msg = pickFreshStr(
            MSG.flow_checkin[coachStyle],
            `checkin_${coachStyle}`,
            cemetery,
          );
          if (msg) {
            speak(msg, "flow_checkin");
            lastFlowCheckinAt.current = now;
            logThought(
              100,
              inputDesc,
              "SPEAK",
              "Flow check-in — positive reinforcement",
              "flow_checkin",
            );
            prevPaceRef.current = currentPace;
            return;
          }
        }

        logThought(0, inputDesc, "SILENT", "Flow protected — on target 2+ min");
        prevPaceRef.current = currentPace;
        return;
      }

      // ── Settling period? ─────────────────────────────────────────────────────
      if (inSettling) {
        const remainS = Math.ceil(
          (SETTLING_MS - (now - lastInstructionAt.current)) / 1000,
        );
        logThought(
          0,
          inputDesc,
          "SILENT",
          `Settling — ${remainS}s remaining after last instruction`,
        );
        prevPaceRef.current = currentPace;
        return;
      }

      // ── P1 Recovery ──────────────────────────────────────────────────────────
      if (isPositiveCoherent && narrative.isRecovering(absDeviation)) {
        const s = scoreFor("recovery");
        if (s > 80) {
          const msg = buildRecoveryMessage(
            narrative.getRecentStruggle(),
            coachStyle,
          );
          speak(msg, "recovery");
          narrative.recordEvent({
            type: "recovered",
            timestamp: now,
            distanceMeters,
            paceMinPerKm: currentPace,
            description: "Returned to target",
          });
          lastDirectionRef.current = null;
          lastInstructionAt.current = now;
          prevPaceRef.current = currentPace;
          logThought(
            s,
            inputDesc,
            "SPEAK",
            "Recovery narrative — struggled then returned",
            "recovery",
          );
          return;
        }
        logThought(
          s,
          inputDesc,
          "SILENT",
          s <= 0 ? "4min cooldown active" : "Score < 80 (recovery)",
        );
      }

      // ── P2 Predictive fade ────────────────────────────────────────────────────
      if (
        !hasActiveDeviation &&
        trend3Min === "fading" &&
        targetPace !== null &&
        absDeviation > 0.04 &&
        absDeviation < slowTolerance - 1
      ) {
        const s = scoreFor("predictive_fade");
        if (s > 80) {
          const msg = pickFreshStr(
            MSG.predictive_fade[coachStyle],
            `pfade_${coachStyle}`,
            cemetery,
          );
          if (msg) {
            speak(msg, "predictive_fade");
            narrative.recordEvent({
              type: "struggled",
              timestamp: now,
              distanceMeters,
              paceMinPerKm: currentPace,
              description: `Gradual fade at ${(distanceMeters / 1000).toFixed(1)}km`,
            });
            lastDirectionRef.current = "speed_up";
            lastInstructionAt.current = now;
            prevPaceRef.current = currentPace;
            logThought(
              s,
              inputDesc,
              "SPEAK",
              "Predictive fade — 3min trend declining",
              "predictive_fade",
            );
            return;
          }
          logThought(
            s,
            inputDesc,
            "SILENT",
            "Cemetery lock — all predictive_fade phrases used",
          );
        } else {
          logThought(
            s,
            inputDesc,
            "SILENT",
            s <= 0 ? "4min cooldown active" : "Score < 80 (predictive_fade)",
          );
        }
      }

      // ── P3 Short trend ────────────────────────────────────────────────────────
      if (!hasActiveDeviation && trend60 !== "stable") {
        const trendType = trend60 === "fading" ? "trend_fade" : "trend_accel";
        const trendPositive = trend60 === "surging";
        if (!trendPositive || isPositiveCoherent) {
          const s = scoreFor(trendType);
          if (s > 80) {
            const bank =
              trend60 === "fading" ? MSG.trend_fade : MSG.trend_accel;
            const msg = pickFreshStr(
              bank[coachStyle],
              `${trendType}_${coachStyle}`,
              cemetery,
            );
            if (msg) {
              speak(msg, trendType as MessageType);
              if (trend60 === "fading") {
                narrative.recordEvent({
                  type: "struggled",
                  timestamp: now,
                  distanceMeters,
                  paceMinPerKm: currentPace,
                  description: `Fading near km ${km}`,
                });
                lastDirectionRef.current = "speed_up";
                lastInstructionAt.current = now;
              }
              prevPaceRef.current = currentPace;
              logThought(
                s,
                inputDesc,
                "SPEAK",
                `60s trend: ${trend60}`,
                trendType,
              );
              return;
            }
            logThought(
              s,
              inputDesc,
              "SILENT",
              `Cemetery lock — all ${trendType} phrases used`,
            );
          } else {
            logThought(
              s,
              inputDesc,
              "SILENT",
              s <= 0
                ? "4min cooldown / same-type block"
                : `Score < 80 (${trendType})`,
            );
          }
        } else {
          logThought(
            0,
            inputDesc,
            "SILENT",
            `Coherence block — last dir was ${lastDirectionRef.current}, pace not corrected`,
          );
        }
      }

      // ── P4 Form tips (all levels — longer cooldown for non-Beginners) ────────
      if (runState.elapsedTime > 60) {
        const tipPool = fitnessLevel === "Beginner" ? MSG.tip_beginner : MSG.form_tips;
        const tipKey  = fitnessLevel === "Beginner" ? "tip" : "form_tip";
        // Beginners: use the standard scoring (~4min gap); non-Beginners: 8min gap
        const s = fitnessLevel === "Beginner" ? scoreFor("tip") : scoreFor(tipKey);
        const threshold = fitnessLevel === "Beginner" ? 80 : 85;
        if (s > threshold) {
          const msg = pickFreshStr(tipPool, tipKey, cemetery);
          if (msg) {
            speak(msg, "tip");
            prevPaceRef.current = currentPace;
            logThought(s, inputDesc, "SPEAK", `${fitnessLevel} form tip`, "tip");
            return;
          }
          logThought(
            s,
            inputDesc,
            "SILENT",
            "Cemetery lock — all beginner tips used",
          );
        } else {
          logThought(
            s,
            inputDesc,
            "SILENT",
            s <= 0 ? "4min cooldown" : "Score < 80 (tip)",
          );
        }
      }

      // ── P5 Sustained deviation ────────────────────────────────────────────────
      if (targetPace !== null) {
        const sustainedMs = absDeviation >= 0.25 ? 10_000 : 30_000;

        if (currentPace <= targetPace * fastTolerance) {
          if (tooFastEnteredAt.current === null) {
            tooFastEnteredAt.current = now;
          } else if (
            prevPaceRef.current !== null &&
            currentPace > prevPaceRef.current
          ) {
            tooFastEnteredAt.current = null;
          } else if (now - tooFastEnteredAt.current >= sustainedMs) {
            const s = scoreFor("slow");
            if (s > 80) {
              const msg = pickFreshStr(
                MSG.slow[coachStyle],
                `slow_${coachStyle}`,
                cemetery,
              );
              if (msg) {
                speak(msg, "slow", false, deviation <= -0.25 ? 1.1 : 0.95);
                narrative.recordEvent({
                  type: "surged",
                  timestamp: now,
                  distanceMeters,
                  paceMinPerKm: currentPace,
                  description: "Running too fast",
                });
                lastDirectionRef.current = "slow_down";
                lastInstructionAt.current = now;
                tooFastEnteredAt.current = null;
                prevPaceRef.current = currentPace;
                logThought(
                  s,
                  inputDesc,
                  "SPEAK",
                  `Sustained too-fast ${sustainedMs / 1000}s`,
                  "slow",
                );
                return;
              }
              logThought(
                s,
                inputDesc,
                "SILENT",
                "Cemetery lock — all slow phrases used",
              );
            } else {
              logThought(
                s,
                inputDesc,
                "SILENT",
                s <= 0 ? "4min cooldown" : "Score < 80 (slow)",
              );
            }
          } else {
            const sustSec = Math.ceil(
              (sustainedMs - (now - tooFastEnteredAt.current)) / 1000,
            );
            logThought(
              0,
              inputDesc,
              "SILENT",
              `Pace deviation detected — sustain timer: ${sustSec}s remaining`,
            );
          }
        } else {
          tooFastEnteredAt.current = null;
          if (lastDirectionRef.current === "slow_down" && isOnTarget)
            lastDirectionRef.current = null;
        }

        if (currentPace > targetPace * slowTolerance) {
          if (tooSlowEnteredAt.current === null) {
            tooSlowEnteredAt.current = now;
          } else if (
            prevPaceRef.current !== null &&
            currentPace < prevPaceRef.current
          ) {
            tooSlowEnteredAt.current = null;
          } else if (now - tooSlowEnteredAt.current >= sustainedMs) {
            if (isClimbing) {
              // Hill effort — slow pace is justified; waive the "speed up" intervention.
              logThought(
                0,
                inputDesc,
                "SILENT",
                `Hill effort — speed penalty waived (+${altitudeGain60s.toFixed(1)}m gain/60s)`,
              );
              tooSlowEnteredAt.current = null;
            } else {
              const s = scoreFor("speed");
              if (s > 80) {
                const msg = pickFreshStr(
                  MSG.speed[coachStyle],
                  `speed_${coachStyle}`,
                  cemetery,
                );
                if (msg) {
                  speak(msg, "speed", false, deviation >= 0.25 ? 0.85 : 0.95);
                  narrative.recordEvent({
                    type: "struggled",
                    timestamp: now,
                    distanceMeters,
                    paceMinPerKm: currentPace,
                    description: "Pace falling behind",
                  });
                  lastDirectionRef.current = "speed_up";
                  lastInstructionAt.current = now;
                  tooSlowEnteredAt.current = null;
                  prevPaceRef.current = currentPace;
                  logThought(
                    s,
                    inputDesc,
                    "SPEAK",
                    `Sustained too-slow ${sustainedMs / 1000}s`,
                    "speed",
                  );
                  return;
                }
                logThought(
                  s,
                  inputDesc,
                  "SILENT",
                  "Cemetery lock — all speed phrases used",
                );
              } else {
                logThought(
                  s,
                  inputDesc,
                  "SILENT",
                  s <= 0 ? "4min cooldown" : "Score < 80 (speed)",
                );
              }
            }
          } else {
            const sustSec = Math.ceil(
              (sustainedMs - (now - tooSlowEnteredAt.current)) / 1000,
            );
            logThought(
              0,
              inputDesc,
              "SILENT",
              `Pace deviation detected — sustain timer: ${sustSec}s remaining`,
            );
          }
        } else {
          tooSlowEnteredAt.current = null;
          if (lastDirectionRef.current === "speed_up" && isOnTarget)
            lastDirectionRef.current = null;
        }

        // Sudden large change
        if (prevPaceRef.current !== null && prevPaceRef.current > 0) {
          const relChange =
            Math.abs(currentPace - prevPaceRef.current) / prevPaceRef.current;
          if (relChange >= 0.3) {
            if (currentPace < prevPaceRef.current) {
              speak("Whoa — big move! Stay steady.", "intro", true, 1.1);
              narrative.recordEvent({
                type: "surged",
                timestamp: now,
                distanceMeters,
                paceMinPerKm: currentPace,
                description: "Sudden surge",
              });
              lastDirectionRef.current = "slow_down";
              lastInstructionAt.current = now;
              logThought(
                100,
                inputDesc,
                "SPEAK",
                "Sudden pace spike ≥30%",
                "intro",
              );
            } else {
              speak("Back to a walk? Take a breath.", "intro", true, 0.85);
              narrative.recordEvent({
                type: "hill_effort",
                timestamp: now,
                distanceMeters,
                paceMinPerKm: currentPace,
                description: "Sudden drop",
              });
              lastDirectionRef.current = "speed_up";
              lastInstructionAt.current = now;
              logThought(
                100,
                inputDesc,
                "SPEAK",
                "Sudden pace drop ≥30%",
                "intro",
              );
            }
          }
        }

        if (
          !tooFastEnteredAt.current &&
          !tooSlowEnteredAt.current &&
          trend60 === "stable"
        ) {
          logThought(
            scoreFor("idle"),
            inputDesc,
            "SILENT",
            "All checks passed — no intervention needed",
          );
        }
      }

      prevPaceRef.current = currentPace;
    };

    analyze();
    const id = window.setInterval(analyze, 1_000);
    return () => {
      mounted = false;
      window.clearInterval(id);
      window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
    };
  }, []);

  const easyPaceVal = parsePaceString(
    profileRef.current?.easyPace ?? undefined,
  );
  const cooldownRemainingMs = Math.max(
    0,
    240_000 - Math.max(0, Date.now() - lastSpokenAt.current),
  );
  const latestPace = runStateRef.current.pace;

  /** Stable function — call at run finish to get the AI-ready summary report. */
  const getRunReport = useCallback((): RunReport => {
    const rs = runStateRef.current;
    const narr = narrativeRef.current;
    const profile = profileRef.current;
    const goalDist = goalDistanceRef.current;
    return {
      distanceMeters: rs.distance,
      elapsedSeconds: rs.elapsedTime,
      averagePaceMinPerKm: rs.pace,
      intent: rs.sessionIntent ?? "",
      events: narr.getEvents(),
      chapter: narr.getChapter(),
      goalDistanceMeters: goalDist,
      goalCompletionPct: goalDist ? Math.min(1, rs.distance / goalDist) : null,
      peakAltitudeM: peakAltitudeRef.current,
      coachStyle: (profile?.coachStyle ?? "Motivational") as string,
      fitnessLevel: (profile?.fitnessLevel ?? "Intermediate") as string,
      maxHeartRate: maxHeartRateRef.current,
    };
  }, []);

  return {
    currentMessage,
    isSpeaking,
    messageType,
    isCoachSatisfied,
    getRunReport,
    debug: {
      lastSpokenAt: lastSpokenAt.current || null,
      lastMessage: currentMessage,
      tooFastEnteredAt: tooFastEnteredAt.current,
      tooSlowEnteredAt: tooSlowEnteredAt.current,
      lastKmPaceStr: lastKmPaceRef.current,
      lastKmAnnounced: lastKmAnnounced.current,
      cooldownRemainingMs,
      deviation:
        easyPaceVal && easyPaceVal > 0
          ? (latestPace - easyPaceVal) / easyPaceVal
          : 0,
      prevPace: prevPaceRef.current,
      chapter: narrativeRef.current.getChapter(),
      needToSpeakScore: debugScoreRef.current,
      lastDirection: lastDirectionRef.current,
      settlingRemainMs: Math.max(
        0,
        SETTLING_MS - (Date.now() - lastInstructionAt.current),
      ),
      phraseCemeterySize: phraseCemeteryRef.current.size,
    },
  };
}

export default useCoachEngine;
