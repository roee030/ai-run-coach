import React, { useState } from "react";
import { motion } from "framer-motion";
import { Input, Button } from "@nextui-org/react";

interface OnboardingProps {
  onFinish: () => void;
}

type StepKey = "gender" | "fitness" | "goal" | "easyPace";

const STEP_IMAGES: Record<StepKey, string> = {
  gender: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438",
  fitness: "https://images.unsplash.com/photo-1526403224747-9d3b7d0b5b8a",
  goal: "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf",
  easyPace: "https://images.unsplash.com/photo-1514512364185-1d86b4f4b9f9",
};

export function OnboardingScreen({ onFinish }: OnboardingProps) {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const steps: StepKey[] = ["gender", "fitness", "goal", "easyPace"];

  const [gender, setGender] = useState<string>("male");
  const [fitnessLevel, setFitnessLevel] = useState<string>("Beginner");
  const [goal, setGoal] = useState<string>("Speed");
  const [easyPace, setEasyPace] = useState<string>("6:30");
  const [error, setError] = useState<string | null>(null);

  const validatePace = (val: string) => /^\d{1,2}:\d{2}$/.test(val.trim());

  function timeToSeconds(t: string) {
    const parts = t.split(":");
    if (parts.length !== 2) return 390; // default 6:30
    const m = parseInt(parts[0], 10) || 6;
    const s = parseInt(parts[1], 10) || 30;
    return m * 60 + s;
  }

  function secondsToTime(v: number) {
    const m = Math.floor(v / 60);
    const s = Math.floor(v % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  const handleNext = () => {
    setError(null);
    if (steps[stepIndex] === "easyPace") {
      if (!validatePace(easyPace)) {
        setError("Easy pace must be minutes:seconds (e.g. 6:30)");
        return;
      }
      // Persist and finish
      try {
        localStorage.setItem(
          "onboarding",
          JSON.stringify({ gender, fitnessLevel, goal, easyPace }),
        );
      } catch {}
      onFinish();
      return;
    }
    setStepIndex(Math.min(stepIndex + 1, steps.length - 1));
  };

  const handleBack = () => setStepIndex(Math.max(0, stepIndex - 1));

  const container = {
    enter: { x: "100%", opacity: 0 },
    center: { x: "0%", opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  };

  return (
    <div className="onboarding-root">
      <div
        className="onboarding-bg"
        style={{ backgroundImage: `url(${STEP_IMAGES[steps[stepIndex]]})` }}
      />
      <div className="onboarding-overlay" />

      <div className="onboarding-content">
        <div className="onboarding-card">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="onboarding-title">Get Started</div>
                <div className="onboarding-subtle text-sm">
                  Tell us a bit about you
                </div>
              </div>
              <div className="text-sm onboarding-subtle">
                Step {stepIndex + 1} / {steps.length}
              </div>
            </div>

            <motion.div
              key={steps[stepIndex]}
              initial="enter"
              animate="center"
              exit="exit"
              variants={container}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              {steps[stepIndex] === "gender" && (
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-semibold uppercase onboarding-subtle">
                    Gender
                  </div>
                  <div role="radiogroup" className="onboarding-grid">
                    {[
                      { v: "male", label: "Male" },
                      { v: "female", label: "Female" },
                      { v: "other", label: "Other" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        role="radio"
                        aria-checked={gender === opt.v}
                        onClick={() => setGender(opt.v)}
                        className="onboarding-option"
                      >
                        <div className="text-lg font-bold">{opt.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {steps[stepIndex] === "fitness" && (
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-semibold uppercase onboarding-subtle">
                    Fitness Level
                  </div>
                  <div className="onboarding-grid">
                    {["Beginner", "Intermediate", "Advanced"].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        role="radio"
                        aria-checked={fitnessLevel === lvl}
                        onClick={() => setFitnessLevel(lvl)}
                        className="onboarding-option"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {lvl === "Beginner"
                              ? "🐣"
                              : lvl === "Intermediate"
                                ? "🏃"
                                : "🔥"}
                          </div>
                          <div>
                            <div className="font-bold">{lvl}</div>
                            <div className="text-sm onboarding-subtle">
                              {lvl === "Beginner"
                                ? "Start easy"
                                : lvl === "Intermediate"
                                  ? "Regular running"
                                  : "High intensity"}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {steps[stepIndex] === "goal" && (
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-semibold uppercase onboarding-subtle">
                    Goal
                  </div>
                  <div className="onboarding-grid">
                    {["Weight loss", "Speed", "Distance"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        role="radio"
                        aria-checked={goal === g}
                        onClick={() => setGoal(g)}
                        className="onboarding-option"
                      >
                        <div className="font-bold">{g}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {steps[stepIndex] === "easyPace" && (
                <div className="flex flex-col gap-4">
                  <div className="text-sm font-semibold uppercase onboarding-subtle">
                    Easy Pace
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="range"
                      min={180}
                      max={720}
                      value={timeToSeconds(easyPace)}
                      onChange={(e) =>
                        setEasyPace(secondsToTime(Number(e.target.value)))
                      }
                      className="w-full"
                      aria-label="Easy pace slider"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-sm onboarding-subtle">
                        {easyPace}
                      </div>
                      <div className="text-sm onboarding-subtle">
                        3:00 — 12:00
                      </div>
                    </div>
                    {error && (
                      <div className="text-sm text-red-400 mt-2">{error}</div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>

            <div className="flex items-center gap-4 justify-between mt-2">
              <Button
                onClick={handleBack}
                flat
                color="default"
                className="brand-btn-outline"
                disabled={stepIndex === 0}
              >
                Back
              </Button>

              <div className="flex-1" />

              <button onClick={handleNext} className="onboarding-next">
                {steps[stepIndex] === "easyPace" ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
