import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RunState = {
  distance: number;        // meters
  pace: number;            // minutes per km
  elapsedTime: number;     // seconds
  isRunning?: boolean;
  isFinished?: boolean;
  sessionIntent?: string;  // free-text goal from HomeScreen
};

type MessageType =
  | "slow" | "speed" | "km" | "intro" | "finish"
  | "trend_accel" | "trend_fade" | "tip"
  | null;

type CoachStyle = "Motivational" | "Professional" | "Tough";
type FitnessLevel = "Beginner" | "Intermediate" | "Advanced";

type UseCoachEngineResult = {
  currentMessage: string | null;
  isSpeaking: boolean;
  messageType: MessageType;
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
    lastMessageType: MessageType;
    lastMessageTypeAt: number | null;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function parsePaceString(p: string | undefined): number | null {
  if (!p) return null;
  const m = p.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function formatPaceForMessage(paceMinPerKm: number): string {
  if (!paceMinPerKm || paceMinPerKm === 0) return "--:--";
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Parse session intent: detect easy-mode flag and an explicit target pace (e.g. "beat 5:30") */
function parseIntent(intent: string): { easyMode: boolean; targetPaceMinPerKm: number | null } {
  const lower = intent.toLowerCase();
  const easyMode = /\b(easy|recovery|slow|light|jog|relax)\b/.test(lower);
  const m = lower.match(/(\d{1,2}):(\d{2})/);
  const targetPaceMinPerKm = m ? parseInt(m[1], 10) + parseInt(m[2], 10) / 60 : null;
  return { easyMode, targetPaceMinPerKm };
}

// ─── Message bank — keyed by coach style ──────────────────────────────────────

const MSG = {
  intro: {
    Motivational: [
      (p: string) => `Let's go! Target pace ${p}. You've got this — ease into it!`,
      (p: string) => `Here we go — aim for ${p}. Start easy and build strong!`,
      (p: string) => `Run time! ${p} is your pace. Breathe and find your rhythm.`,
    ],
    Professional: [
      (p: string) => `Session started. Target pace ${p}. Ease in for the first kilometre.`,
      (p: string) => `Running initiated. Aiming for ${p} per kilometre.`,
      (p: string) => `All systems go. Target ${p}. Begin at 60% effort.`,
    ],
    Tough: [
      (p: string) => `Move it. ${p} is the target. No excuses — let's go.`,
      (p: string) => `Lock in ${p}. Start now, think later.`,
      (p: string) => `Clock's running. ${p} pace — hit it.`,
    ],
  },

  slow: {
    Motivational: [
      "Easy there — you're flying! Reel it back in.",
      "Love the energy! Bring the pace back a touch.",
      "Breathe — slow it down a little. You'll thank yourself later.",
    ],
    Professional: [
      "Pace exceeds target. Reduce effort by roughly 5 to 8 percent.",
      "Running too fast. Back off to stay in your aerobic zone.",
      "Current pace outside target range. Ease up.",
    ],
    Tough: [
      "Back off! You'll blow up before the finish.",
      "Slow down. Race strategy matters — stick to the plan.",
      "That's too fast. Control yourself.",
    ],
  },

  speed: {
    Motivational: [
      "Dig deep — you can push a little more!",
      "Come on, there's more in the tank! Pick it up.",
      "You're losing a bit of rhythm — let's bring it back up. Push!",
    ],
    Professional: [
      "Pace below target. Increase cadence.",
      "Falling behind goal pace. Apply more effort.",
      "Pace deficit detected. Accelerate to close the gap.",
    ],
    Tough: [
      "Pick it up! Stop coasting.",
      "That's not good enough. Push harder.",
      "You're slacking — move faster.",
    ],
  },

  km: {
    Motivational: [
      (km: number, pace: string) => `${km} km done — last split ${pace}! Keep that energy going!`,
      (km: number, pace: string) => `Nice! ${km} kilometres in the bag. Last km was ${pace}.`,
      (km: number, pace: string) => `${km} down! Ran that one in ${pace}. Feeling good?`,
    ],
    Professional: [
      (km: number, pace: string) => `${km} kilometre split: ${pace} per km.`,
      (km: number, pace: string) => `Kilometre ${km} complete. Last pace: ${pace}.`,
      (km: number, pace: string) => `${km} km marker. Split time: ${pace}.`,
    ],
    Tough: [
      (km: number, pace: string) => `${km} km. Last km ${pace}. Don't slow down now.`,
      (km: number, pace: string) => `${km} kilometres. Split: ${pace}. Stay on it.`,
      (km: number, pace: string) => `${km} km — ${pace}. Keep the pressure on.`,
    ],
  },

  trend_accel: {
    Motivational: [
      "I see that pickup — love the energy! Stay controlled.",
      "Nice surge! Channel it — keep it smooth.",
      "You're on fire! Hold that rhythm, don't peak too early.",
    ],
    Professional: [
      "Acceleration trend detected. Maintain current intensity.",
      "Pace improving consistently. Stay disciplined.",
      "You're speeding up. Check effort — stay in your zone.",
    ],
    Tough: [
      "I see that surge. Don't waste it early.",
      "Good move. Now hold it.",
      "Strong pickup. Stay on it.",
    ],
  },

  trend_fade: {
    Motivational: [
      "You're losing a bit of rhythm — dig deep! You've got this.",
      "Come on, get that pace back! Don't let it slip.",
      "Fade happens. Fight it — one step at a time.",
    ],
    Professional: [
      "Pace declining over the last minute. Increase cadence.",
      "Negative trend detected. Apply more effort.",
      "Pace degradation observed. Correct now.",
    ],
    Tough: [
      "You're fading — fight for every second.",
      "Don't give up that time. Push harder.",
      "This is where champions are made. Push.",
    ],
  },

  tip_beginner: [
    "Breathe in through your nose, out through your mouth — find a rhythm.",
    "Relax your shoulders and unclench your fists. Stay loose.",
    "Shorten your stride and speed up your steps — it's more efficient.",
    "Keep your head up and eyes forward. Good form saves energy.",
    "Land midfoot, not on your heel — it reduces impact on your joints.",
  ],

  finish: {
    Motivational: [
      (avg: string) => `Amazing run! Average pace ${avg} — you absolutely crushed it!`,
      (avg: string) => `That's a wrap! Average ${avg}. You should be really proud.`,
      (avg: string) => `Run complete! ${avg} average pace. Incredible effort!`,
    ],
    Professional: [
      (avg: string) => `Session complete. Average pace: ${avg}.`,
      (avg: string) => `Run finished. Final average: ${avg} per kilometre.`,
      (avg: string) => `Done. Average pace ${avg}. Review your splits.`,
    ],
    Tough: [
      (avg: string) => `Done. Average: ${avg}. Next time, faster.`,
      (avg: string) => `Finished. Average ${avg}. Rest up — then go harder.`,
      (avg: string) => `That's it. ${avg} average. Set a new target.`,
    ],
  },
};

// ─── Trend detection constants ────────────────────────────────────────────────

type PaceSample = { pace: number; timestamp: number };
const TREND_WINDOW_MS = 60_000;
const TREND_MIN_SAMPLES = 6;
const TREND_MIN_WINDOW_MS = 20_000;
const TREND_THRESHOLD = 0.08; // 8% relative change triggers trend message

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCoachEngine(runState: RunState): UseCoachEngineResult {
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messageType, setMessageType] = useState<MessageType>(null);

  const lastSpokenAt = useRef<number>(0);
  const lastKmAnnounced = useRef<number>(0);
  const tooFastEnteredAt = useRef<number | null>(null);
  const tooSlowEnteredAt = useRef<number | null>(null);
  const prevIsRunning = useRef<boolean | undefined>(undefined);
  const lastKmTimeRef = useRef<number>(0);
  const lastKmPaceRef = useRef<string | null>(null);
  const lastMessageTypeRef = useRef<MessageType>(null);
  const lastMessageTypeAt = useRef<number | null>(null);
  const prevPaceRef = useRef<number | null>(null);
  const lastTrendMessageAt = useRef<number>(0);
  const lastBeginnerTipAt = useRef<number>(0);

  // Rolling 60-second pace history for trend detection
  const paceHistoryRef = useRef<PaceSample[]>([]);

  // User profile — loaded once on mount
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

    const speak = (
      text: string,
      type: MessageType = null,
      bypassCooldown = false,
      rateOverride?: number,
    ) => {
      if (!mounted) return;
      const now = Date.now();
      const overallCooldownMs = 120_000;   // 2 min global cooldown
      const perTypeCooldownMs = 180_000;   // 3 min per message type

      if (!bypassCooldown) {
        if (now - lastSpokenAt.current < overallCooldownMs) return;
        if (type && lastMessageTypeRef.current === type) return;
        if (type && lastMessageTypeAt.current && now - lastMessageTypeAt.current < perTypeCooldownMs) return;
      }

      const synth = window.speechSynthesis;
      if (!synth) return;
      if (synth.speaking && !bypassCooldown) return;

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = rateOverride ?? 0.95;
      utter.pitch = 0.9;
      utter.volume = 1;

      utter.onstart = () => {
        if (!mounted) return;
        setIsSpeaking(true);
        lastSpokenAt.current = Date.now();
        if (type) {
          lastMessageTypeRef.current = type;
          lastMessageTypeAt.current = Date.now();
          setMessageType(type);
        } else {
          setMessageType(null);
        }
        try { window.navigator?.vibrate?.([100, 50, 100]); } catch { /* ignore */ }
      };
      utter.onend = () => { if (mounted) setIsSpeaking(false); };
      synth.speak(utter);
      setCurrentMessage(text);
    };

    const analyze = () => {
      const profile = profileRef.current;
      const coachStyle: CoachStyle = (profile?.coachStyle as CoachStyle) ?? "Motivational";
      const fitnessLevel: FitnessLevel = (profile?.fitnessLevel as FitnessLevel) ?? "Intermediate";

      const easyPaceVal = parsePaceString(profile?.easyPace) ?? null;
      const currentPace = runState.pace;
      const distanceMeters = runState.distance;
      const isRunning = !!runState.isRunning;
      const isFinished = !!runState.isFinished;
      const now = Date.now();

      // ── Resolve effective target pace ──────────────────────────────────────
      // Priority: explicit pace in intent > onboarding easyPace
      const intent = runState.sessionIntent ?? "";
      const { easyMode, targetPaceMinPerKm: intentPace } = parseIntent(intent);
      const targetPace = intentPace ?? easyPaceVal;

      // Easy mode → wider tolerance (less aggressive coaching)
      const fastTolerance = easyMode ? 0.85 : 0.90;
      const slowTolerance = easyMode ? 1.30 : 1.20;

      // ── Run start intro ────────────────────────────────────────────────────
      if (isRunning && !prevIsRunning.current) {
        const paceStr = targetPace ? formatPaceForMessage(targetPace) : "your target pace";
        speak(pick(MSG.intro[coachStyle])(paceStr), "intro", true);
        prevIsRunning.current = isRunning;
        return;
      }

      // ── Finish ─────────────────────────────────────────────────────────────
      if (isFinished && prevIsRunning.current) {
        const avgPace = formatPaceForMessage(runState.pace);
        speak(pick(MSG.finish[coachStyle])(avgPace), "finish", true);
        prevIsRunning.current = false;
        return;
      }

      prevIsRunning.current = isRunning;

      if (!isRunning || currentPace <= 0) return;

      // ── KM milestone ───────────────────────────────────────────────────────
      const km = Math.floor(distanceMeters / 1000);
      if (km > 0 && km !== lastKmAnnounced.current) {
        const deltaSec = runState.elapsedTime - (lastKmTimeRef.current || 0);
        const lastKmPace = formatPaceForMessage(deltaSec > 0 ? deltaSec / 60 : 0);
        lastKmPaceRef.current = lastKmPace;
        speak(pick(MSG.km[coachStyle])(km, lastKmPace), "km", true);
        lastKmAnnounced.current = km;
        lastKmTimeRef.current = runState.elapsedTime;
        return;
      }

      // ── Rolling pace history (60s window) ─────────────────────────────────
      paceHistoryRef.current.push({ pace: currentPace, timestamp: now });
      paceHistoryRef.current = paceHistoryRef.current.filter(
        (s) => now - s.timestamp <= TREND_WINDOW_MS,
      );

      // ── Trend detection ────────────────────────────────────────────────────
      const trendCooldownMs = 300_000; // 5 min between trend messages
      const history = paceHistoryRef.current;
      if (
        history.length >= TREND_MIN_SAMPLES &&
        now - history[0].timestamp >= TREND_MIN_WINDOW_MS &&
        now - lastTrendMessageAt.current >= trendCooldownMs
      ) {
        const half = Math.floor(history.length / 2);
        const firstHalf = history.slice(0, half);
        const secondHalf = history.slice(half);
        const avg1 = firstHalf.reduce((s, x) => s + x.pace, 0) / firstHalf.length;
        const avg2 = secondHalf.reduce((s, x) => s + x.pace, 0) / secondHalf.length;
        // pace in min/km: lower value = faster
        // trendChange > 0 → second half faster (accelerating)
        // trendChange < 0 → second half slower (fading)
        const trendChange = (avg1 - avg2) / avg1;

        if (trendChange >= TREND_THRESHOLD) {
          speak(pick(MSG.trend_accel[coachStyle]), "trend_accel");
          lastTrendMessageAt.current = now;
          prevPaceRef.current = currentPace;
          return;
        } else if (trendChange <= -TREND_THRESHOLD) {
          speak(pick(MSG.trend_fade[coachStyle]), "trend_fade");
          lastTrendMessageAt.current = now;
          prevPaceRef.current = currentPace;
          return;
        }
      }

      // ── Beginner form tips (every 5 min, first 60s grace period) ──────────
      if (
        fitnessLevel === "Beginner" &&
        runState.elapsedTime > 60 &&
        now - lastBeginnerTipAt.current >= 300_000
      ) {
        speak(pick(MSG.tip_beginner), "tip");
        lastBeginnerTipAt.current = now;
        prevPaceRef.current = currentPace;
        return;
      }

      // ── Pace deviation coaching ────────────────────────────────────────────
      if (targetPace !== null) {
        const deviation = (currentPace - targetPace) / targetPace;
        const absDev = Math.abs(deviation);
        const sustainedMs = absDev >= 0.25 ? 10_000 : 30_000;

        // Too fast
        if (currentPace <= targetPace * fastTolerance) {
          if (tooFastEnteredAt.current === null) {
            tooFastEnteredAt.current = now;
          } else if (prevPaceRef.current !== null && currentPace > prevPaceRef.current) {
            tooFastEnteredAt.current = null; // correcting themselves
          } else if (now - tooFastEnteredAt.current >= sustainedMs) {
            if (Math.random() < 0.5) {
              const rate = deviation <= -0.25 ? 1.1 : 0.95;
              speak(pick(MSG.slow[coachStyle]), "slow", false, rate);
              tooFastEnteredAt.current = null;
              prevPaceRef.current = currentPace;
              return;
            }
          }
        } else {
          tooFastEnteredAt.current = null;
        }

        // Too slow
        if (currentPace > targetPace * slowTolerance) {
          if (tooSlowEnteredAt.current === null) {
            tooSlowEnteredAt.current = now;
          } else if (prevPaceRef.current !== null && currentPace < prevPaceRef.current) {
            tooSlowEnteredAt.current = null; // correcting themselves
          } else if (now - tooSlowEnteredAt.current >= sustainedMs) {
            if (Math.random() < 0.5) {
              const rate = deviation >= 0.25 ? 0.85 : 0.95;
              speak(pick(MSG.speed[coachStyle]), "speed", false, rate);
              tooSlowEnteredAt.current = null;
              prevPaceRef.current = currentPace;
              return;
            }
          }
        } else {
          tooSlowEnteredAt.current = null;
        }

        // Sudden large pace change (≥30% relative)
        if (prevPaceRef.current !== null && prevPaceRef.current > 0) {
          const relChange = Math.abs(currentPace - prevPaceRef.current) / prevPaceRef.current;
          if (relChange >= 0.3) {
            if (currentPace < prevPaceRef.current) {
              speak("Whoa — big move! Stay steady.", "intro", true, 1.1);
            } else {
              speak("Back to a walk? Take a breath.", "intro", true, 0.85);
            }
          }
        }
      }

      prevPaceRef.current = currentPace;
    };

    analyze();
    const id = window.setInterval(analyze, 5_000);
    return () => { mounted = false; window.clearInterval(id); };
  }, [runState]);

  const now = Date.now();
  const cooldownRemainingMs = Math.max(0, 120_000 - Math.max(0, now - lastSpokenAt.current));
  const easyPaceVal = parsePaceString(profileRef.current?.easyPace ?? undefined);

  return {
    currentMessage,
    isSpeaking,
    messageType,
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
          ? (runState.pace - easyPaceVal) / easyPaceVal
          : 0,
      prevPace: prevPaceRef.current,
      lastMessageType: lastMessageTypeRef.current,
      lastMessageTypeAt: lastMessageTypeAt.current,
    },
  };
}

export default useCoachEngine;
