import { useEffect, useRef, useState } from "react";

type RunState = {
  distance: number; // meters
  pace: number; // minutes per km
  elapsedTime: number; // seconds
  isRunning?: boolean;
  isFinished?: boolean;
};

type UseCoachEngineResult = {
  currentMessage: string | null;
  isSpeaking: boolean;
  messageType: "slow" | "speed" | "km" | "intro" | "finish" | null;
  debug: {
    lastSpokenAt: number | null;
    lastMessage: string | null;
    tooFastEnteredAt: number | null;
    tooSlowEnteredAt: number | null;
    lastKmPaceStr: string | null;
    lastKmAnnounced: number;
    cooldownRemainingMs: number;
  };
};

function parsePaceString(p: string | undefined): number | null {
  if (!p) return null;
  const m = p.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const minutes = parseInt(m[1], 10);
  const seconds = parseInt(m[2], 10);
  return minutes + seconds / 60;
}

function formatPaceForMessage(paceMinPerKm: number): string {
  if (!paceMinPerKm || paceMinPerKm === 0) return "--:--";
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function useCoachEngine(runState: RunState): UseCoachEngineResult {
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const lastSpokenAt = useRef<number>(0);
  const lastKmAnnounced = useRef<number>(0);
  const tooFastEnteredAt = useRef<number | null>(null);
  const tooSlowEnteredAt = useRef<number | null>(null);
  const prevIsRunning = useRef<boolean | undefined>(undefined);
  const lastKmTimeRef = useRef<number>(0);
  const lastKmPaceRef = useRef<string | null>(null);
  const lastMessageTypeRef = useRef<UseCoachEngineResult["messageType"] | null>(
    null,
  );
  const lastMessageTypeAt = useRef<number | null>(null);
  const prevPaceRef = useRef<number | null>(null);
  const [messageType, setMessageType] =
    useState<UseCoachEngineResult["messageType"]>(null);

  // load user context from localStorage
  const userContextRef = useRef<{
    fitnessLevel?: string;
    easyPace?: string;
  } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding");
      if (raw) {
        userContextRef.current = JSON.parse(raw);
      }
    } catch {
      userContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const speak = (
      text: string,
      type: UseCoachEngineResult["messageType"] | null = null,
      bypassCooldown = false,
      rateOverride?: number,
    ) => {
      if (!mounted) return;
      const now = Date.now();
      const overallCooldownMs = 120000; // 120s global cooldown
      const perTypeCooldownMs = 180000; // 3 minutes per type

      // if not bypassing, enforce cooldowns and repeats
      if (!bypassCooldown) {
        if (now - (lastSpokenAt.current || 0) < overallCooldownMs) return;
        if (type && lastMessageTypeRef.current === type) return;
        if (
          type &&
          lastMessageTypeAt.current &&
          now - lastMessageTypeAt.current < perTypeCooldownMs
        )
          return;
      }

      const synth = window.speechSynthesis;
      if (!synth) return;
      if (synth.speaking && !bypassCooldown) return;

      const utter = new SpeechSynthesisUtterance(text);
      // TODO: implement audio ducking here (lower music volume while speaking)
      // humanized voice; rate can be overridden per message
      if (rateOverride !== undefined) utter.rate = rateOverride;
      else utter.rate = 0.95;
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
        // Haptic
        try {
          if (window.navigator?.vibrate) {
            window.navigator.vibrate([100, 50, 100]);
          }
        } catch (e) {
          // ignore
        }
      };
      utter.onend = () => {
        if (!mounted) return;
        setIsSpeaking(false);
      };
      synth.speak(utter);
      setCurrentMessage(text);
    };

    const analyze = () => {
      const ctx = userContextRef.current;
      const easyPaceStr = ctx?.easyPace;
      const easyPaceVal = parsePaceString(easyPaceStr) ?? null; // minutes per km
      const currentPace = runState.pace; // minutes per km
      const distanceMeters = runState.distance;
      const isRunning = !!runState.isRunning;
      const isFinished = !!runState.isFinished;

      // Pro Coach message variations (shorter, casual)
      const introVariants = [
        (p: string) => `Let's go — aim for ${p}. Warm up easy.`,
        (p: string) => `All right, target ${p}. Start easy.`,
        (p: string) => `Let's get moving — ${p} pace. Ease into it.`,
      ];

      const slowDownVariants = [
        "Easy now, drop the pace a bit.",
        "Breathe in — slow it down.",
        "Take it back a touch, keep it smooth.",
      ];

      const speedUpVariants = [
        "Pick it up a touch.",
        "Nudge the pace, good spot to push.",
        "Let's move it up a bit.",
      ];

      const finishVariants = [
        (avg: string) => `Nice run — avg ${avg}. Good work.`,
        (avg: string) => `Great job. Avg ${avg}. Recover well.`,
        (avg: string) => `That's it — avg ${avg}. Well done.`,
      ];

      // Run start intro: detect transition from not-running -> running
      if (isRunning && !prevIsRunning.current) {
        const p = easyPaceStr ?? "your target";
        const pick =
          introVariants[Math.floor(Math.random() * introVariants.length)];
        speak(pick(p), "intro");
      }

      // Encourage every full km
      const km = Math.floor(distanceMeters / 1000);
      if (km > 0 && km !== lastKmAnnounced.current) {
        // compute last kilometer pace using elapsed time delta
        const prevTime = lastKmTimeRef.current || 0;
        const deltaSec = runState.elapsedTime - prevTime || 0;
        const lastKmPaceMinPerKm = deltaSec > 0 ? deltaSec / 60 : 0;
        const lastKmPaceStr = formatPaceForMessage(lastKmPaceMinPerKm);
        const variants = [
          `${km} km — last km ${lastKmPaceStr}.`,
          `Nice — ${km} km done. Last km ${lastKmPaceStr}.`,
          `${km} kilometers, last was ${lastKmPaceStr}.`,
        ];
        const text = variants[Math.floor(Math.random() * variants.length)];
        lastKmPaceRef.current = lastKmPaceStr;
        // km announcements override pace advice and bypass cooldowns
        speak(text, "km", true);
        lastKmAnnounced.current = km;
        lastKmTimeRef.current = runState.elapsedTime;
        return;
      }

      if (easyPaceVal !== null && currentPace > 0 && isRunning) {
        const tooFastThreshold = easyPaceVal * 0.9; // 10% faster
        const now = Date.now();
        // deviation: (current - easy)/easy; negative => faster than target
        const deviation = (currentPace - easyPaceVal) / easyPaceVal;
        const absDev = Math.abs(deviation);
        // variable sustained threshold: big deviations react faster
        const sustainedMs = absDev >= 0.25 ? 10000 : 30000;

        // Slow down detection (runner too fast -> lower pace value)
        if (currentPace <= tooFastThreshold) {
          if (tooFastEnteredAt.current === null) {
            tooFastEnteredAt.current = now;
          } else {
            // I See You: if runner shows effort to move back towards target, reset
            if (
              prevPaceRef.current !== null &&
              currentPace > prevPaceRef.current
            ) {
              tooFastEnteredAt.current = null;
            } else if (now - tooFastEnteredAt.current >= sustainedMs) {
              // sustained long enough -> 50% chance to speak
              if (Math.random() < 0.5) {
                const rate = deviation <= -0.25 ? 1.1 : 0.95;
                const msg =
                  slowDownVariants[
                    Math.floor(Math.random() * slowDownVariants.length)
                  ];
                speak(msg, "slow", false, rate);
                tooFastEnteredAt.current = null;
                return;
              } else {
                return;
              }
            }
          }
        } else {
          tooFastEnteredAt.current = null;
        }

        // Speed up detection (runner too slow -> higher pace value)
        if (currentPace > easyPaceVal * 1.2) {
          if (tooSlowEnteredAt.current === null)
            tooSlowEnteredAt.current = Date.now();
          else {
            if (
              prevPaceRef.current !== null &&
              currentPace < prevPaceRef.current
            ) {
              tooSlowEnteredAt.current = null;
            } else if (
              Date.now() - (tooSlowEnteredAt.current || 0) >=
              sustainedMs
            ) {
              if (Math.random() < 0.5) {
                const rate = deviation >= 0.25 ? 0.85 : 0.95;
                const msg =
                  speedUpVariants[
                    Math.floor(Math.random() * speedUpVariants.length)
                  ];
                speak(msg, "speed", false, rate);
                return;
              } else {
                return;
              }
            }
          }
        } else {
          tooSlowEnteredAt.current = null;
        }

        // Smart interruptions: sudden large change in pace
        if (prevPaceRef.current !== null && prevPaceRef.current > 0) {
          const relChange =
            Math.abs(currentPace - prevPaceRef.current) / prevPaceRef.current;
          if (relChange >= 0.3) {
            if (currentPace < prevPaceRef.current) {
              speak("Whoa, big move! Stay steady.", "intro", true, 1.1);
            } else {
              speak("Back to a walk? Take a breath.", "intro", true, 0.85);
            }
          }
        }
      }

      // Finish detection: when run ends (isFinished true)
      if (isFinished && prevIsRunning.current) {
        const avgPace = formatPaceForMessage(runState.pace);
        const pick =
          finishVariants[Math.floor(Math.random() * finishVariants.length)];
        speak(pick(avgPace), "finish");
        return;
      }

      // update previous running flag
      prevIsRunning.current = isRunning;
    };

    // initial quick analyze and periodic checks
    analyze();
    const id = window.setInterval(analyze, 5000);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [runState]);

  const now = Date.now();
  const cooldownRemainingMs = Math.max(
    0,
    120000 - Math.max(0, now - (lastSpokenAt.current || 0)),
  );

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
        prevPaceRef.current !== null && prevPaceRef.current > 0
          ? (runState.pace -
              (parsePaceString(userContextRef.current?.easyPace ?? undefined) ??
                runState.pace)) /
            (parsePaceString(userContextRef.current?.easyPace ?? undefined) ??
              runState.pace)
          : 0,
      prevPace: prevPaceRef.current,
      lastMessageType: lastMessageTypeRef.current,
      lastMessageTypeAt: lastMessageTypeAt.current,
    },
  };
}

export default useCoachEngine;
