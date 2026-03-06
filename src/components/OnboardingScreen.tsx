import { useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingProps {
  onFinish: () => void;
}

type StepKey = "gender" | "fitness" | "goal" | "weeklyGoal" | "coachStyle" | "easyPace";

const STEP_IMAGES: Record<StepKey, string> = {
  gender:      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200",
  fitness:     "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200",
  goal:        "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?w=1200",
  weeklyGoal:  "https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?w=1200",
  coachStyle:  "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1200",
  easyPace:    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200",
};

const STEPS: StepKey[] = ["gender", "fitness", "goal", "weeklyGoal", "coachStyle", "easyPace"];

const slideVariants = {
  enter: { x: "60%", opacity: 0 },
  center: { x: "0%", opacity: 1 },
  exit: { x: "-60%", opacity: 0 },
};

function timeToSeconds(t: string) {
  const parts = t.split(":");
  if (parts.length !== 2) return 390;
  return (parseInt(parts[0], 10) || 6) * 60 + (parseInt(parts[1], 10) || 30);
}

function secondsToTime(v: number) {
  const m = Math.floor(v / 60);
  const s = Math.floor(v % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function OnboardingScreen({ onFinish }: OnboardingProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const [gender, setGender] = useState("male");
  const [fitnessLevel, setFitnessLevel] = useState("Beginner");
  const [goal, setGoal] = useState("Speed");
  const [weeklyGoal, setWeeklyGoal] = useState("4-5");
  const [coachStyle, setCoachStyle] = useState("Motivational");
  const [easyPace, setEasyPace] = useState("6:30");
  const [error, setError] = useState<string | null>(null);

  const currentStep = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const handleNext = () => {
    setError(null);
    if (isLast) {
      if (!/^\d{1,2}:\d{2}$/.test(easyPace.trim())) {
        setError("Enter pace as MM:SS (e.g. 6:30)");
        return;
      }
      try {
        localStorage.setItem(
          "onboarding",
          JSON.stringify({ gender, fitnessLevel, goal, weeklyGoal, coachStyle, easyPace }),
        );
      } catch {
        // localStorage unavailable — continue anyway
      }
      onFinish();
      return;
    }
    setDirection(1);
    setStepIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    setDirection(-1);
    setStepIndex((i) => i - 1);
  };

  return (
    <div className="onboarding-root">
      {/* Background image — fades between steps */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep + "-bg"}
          className="onboarding-bg"
          style={{ backgroundImage: `url(${STEP_IMAGES[currentStep]})` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      </AnimatePresence>
      <div className="onboarding-overlay" />

      <div className="onboarding-content">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === stepIndex ? "24px" : "8px",
                background: i <= stepIndex ? "var(--brand-primary)" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>

        <div className="onboarding-card">
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="onboarding-title">Get Started</div>
                <div className="onboarding-subtle text-sm mt-1">
                  Tell us about you
                </div>
              </div>
              <div className="text-xs font-bold onboarding-subtle uppercase tracking-widest pt-1">
                {stepIndex + 1} / {STEPS.length}
              </div>
            </div>

            {/* Step content — slides in/out */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
              >
                {currentStep === "gender" && (
                  <StepSection label="Gender">
                    <div role="radiogroup" className="onboarding-grid">
                      {[
                        { v: "male",   label: "Male",   icon: "♂" },
                        { v: "female", label: "Female", icon: "♀" },
                        { v: "other",  label: "Other",  icon: "◇" },
                      ].map((opt) => (
                        <OptionCard
                          key={opt.v}
                          selected={gender === opt.v}
                          onClick={() => setGender(opt.v)}
                          icon={opt.icon}
                          label={opt.label}
                        />
                      ))}
                    </div>
                  </StepSection>
                )}

                {currentStep === "fitness" && (
                  <StepSection label="Current Level">
                    <div className="onboarding-grid">
                      {[
                        { v: "Beginner",     icon: "🐣", sub: "Just starting out" },
                        { v: "Intermediate", icon: "🏃", sub: "Regular runner" },
                        { v: "Advanced",     icon: "🔥", sub: "Competitive training" },
                      ].map((opt) => (
                        <OptionCard
                          key={opt.v}
                          selected={fitnessLevel === opt.v}
                          onClick={() => setFitnessLevel(opt.v)}
                          icon={opt.icon}
                          label={opt.v}
                          sub={opt.sub}
                        />
                      ))}
                    </div>
                  </StepSection>
                )}

                {currentStep === "goal" && (
                  <StepSection label="Primary Goal">
                    <div className="onboarding-grid">
                      {[
                        { v: "Weight loss", icon: "🏋️", sub: "Burn calories, stay lean" },
                        { v: "Speed",       icon: "⚡", sub: "Run faster, set PRs" },
                        { v: "Distance",    icon: "🗺️", sub: "Go farther, build base" },
                      ].map((opt) => (
                        <OptionCard
                          key={opt.v}
                          selected={goal === opt.v}
                          onClick={() => setGoal(opt.v)}
                          icon={opt.icon}
                          label={opt.v}
                          sub={opt.sub}
                        />
                      ))}
                    </div>
                  </StepSection>
                )}

                {currentStep === "weeklyGoal" && (
                  <StepSection label="Weekly Training Days">
                    <div className="onboarding-grid">
                      {[
                        { v: "2-3", icon: "🌱", label: "2–3 days",  sub: "Casual — build the habit" },
                        { v: "4-5", icon: "💪", label: "4–5 days",  sub: "Regular — solid training load" },
                        { v: "6+",  icon: "🏆", label: "6+ days",   sub: "Elite — high commitment" },
                      ].map((opt) => (
                        <OptionCard
                          key={opt.v}
                          selected={weeklyGoal === opt.v}
                          onClick={() => setWeeklyGoal(opt.v)}
                          icon={opt.icon}
                          label={opt.label}
                          sub={opt.sub}
                        />
                      ))}
                    </div>
                  </StepSection>
                )}

                {currentStep === "coachStyle" && (
                  <StepSection label="Coach Style">
                    <div className="onboarding-grid">
                      {[
                        { v: "Motivational", icon: "🙌", sub: "Uplifting, positive reinforcement" },
                        { v: "Professional", icon: "📊", sub: "Data-driven, precise feedback" },
                        { v: "Tough",        icon: "⚔️", sub: "Push your limits, no excuses" },
                      ].map((opt) => (
                        <OptionCard
                          key={opt.v}
                          selected={coachStyle === opt.v}
                          onClick={() => setCoachStyle(opt.v)}
                          icon={opt.icon}
                          label={opt.v}
                          sub={opt.sub}
                        />
                      ))}
                    </div>
                  </StepSection>
                )}

                {currentStep === "easyPace" && (
                  <StepSection label="Easy Pace (min/km)">
                    <div className="flex flex-col gap-3">
                      {/* Big pace display */}
                      <div
                        className="text-center text-5xl font-black font-mono tracking-tight"
                        style={{ color: "var(--brand-primary)" }}
                      >
                        {easyPace}
                        <span className="text-base font-normal ml-2 opacity-60">min/km</span>
                      </div>

                      <input
                        type="range"
                        min={180}
                        max={720}
                        value={timeToSeconds(easyPace)}
                        onChange={(e) => setEasyPace(secondsToTime(Number(e.target.value)))}
                        className="w-full accent-[var(--brand-primary)]"
                        aria-label="Easy pace slider"
                        style={{ accentColor: "var(--brand-primary)" }}
                      />

                      <div className="flex justify-between text-xs onboarding-subtle">
                        <span>3:00 fast</span>
                        <span>12:00 easy</span>
                      </div>

                      {error && (
                        <div className="text-sm text-red-400">{error}</div>
                      )}
                    </div>
                  </StepSection>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="flex items-center justify-between gap-3 mt-12">
              <button
                type="button"
                onClick={handleBack}
                disabled={stepIndex === 0}
                className="onboarding-next"
                style={{
                  background: "transparent",
                  color: "var(--brand-primary)",
                  border: "2px solid var(--brand-primary)",
                  boxShadow: "none",
                  opacity: stepIndex === 0 ? 0.3 : 1,
                  cursor: stepIndex === 0 ? "not-allowed" : "pointer",
                }}
              >
                Back
              </button>
              <button type="button" onClick={handleNext} className="onboarding-next flex-1">
                {isLast ? "Let's Go" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---------------------------------------- */

function StepSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-black uppercase tracking-widest onboarding-subtle">
        {label}
      </div>
      {children}
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  icon,
  label,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className="onboarding-option"
      style={
        selected
          ? {
              borderColor: "var(--brand-primary)",
              borderWidth: "3px",
              background: "color-mix(in srgb, var(--brand-primary) 16%, rgba(0,0,0,0.55))",
              boxShadow: "0 0 24px var(--brand-glow), inset 0 0 20px color-mix(in srgb, var(--brand-primary) 10%, transparent)",
            }
          : { borderWidth: "2px" }
      }
    >
      <span className="text-2xl leading-none">{icon}</span>
      <div className="flex flex-col items-start text-left flex-1">
        <span className="font-black text-white text-sm">{label}</span>
        {sub && <span className="text-xs onboarding-subtle mt-0.5">{sub}</span>}
      </div>
      {selected && (
        <span
          className="ml-auto text-xl font-black leading-none flex-shrink-0"
          style={{ color: "var(--brand-primary)", textShadow: "0 0 10px var(--brand-glow)" }}
        >
          ✓
        </span>
      )}
    </button>
  );
}
