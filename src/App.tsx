import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NextUIProvider } from "@nextui-org/react";
import { HomeScreen }       from "./components/HomeScreen";
import { RunTracker }       from "./components/RunTracker";
import { RunSummary }       from "./components/RunSummary";
import { OnboardingScreen } from "./components/OnboardingScreen";
import { RunHistory }       from "./components/History";
import { SettingsScreen }   from "./components/Settings";
import { WorkoutBuilder }   from "./components/WorkoutBuilder";
import type { RunReport }   from "./hooks/useCoachEngine";
import type { LocationPoint } from "./types";
import type { SavedRun }    from "./types/run";
import type { Workout }     from "./types/workout";
import { useRunHistory }    from "./hooks/useRunHistory";
import { useWorkouts }      from "./hooks/useWorkouts";
import "./index.css";

type Screen = "onboarding" | "home" | "running" | "summary" | "history" | "settings" | "workoutBuilder";

export interface RunSummaryData {
  distance:    number;
  elapsedTime: number;
  pace:        number;
  intent?:     string;
  runReport?:  RunReport | null;
  locations?:  LocationPoint[];
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    try { return localStorage.getItem("onboarding") ? "home" : "onboarding"; }
    catch { return "onboarding"; }
  });

  const [runSummary, setRunSummary]           = useState<RunSummaryData | null>(null);
  const [sessionIntent, setSessionIntent]     = useState("");
  const [sessionWorkout, setSessionWorkout]   = useState<Workout | null>(null);
  const [summaryReturnTo, setSummaryReturnTo] = useState<"home" | "history">("home");

  const { saveRun }     = useRunHistory();
  const { workouts }    = useWorkouts();

  const handleRunFinish = (data: RunSummaryData) => {
    setRunSummary(data);
    setSummaryReturnTo("home");
    window.scrollTo(0, 0);
    setCurrentScreen("summary");
    void saveRun({ id: Date.now().toString(), date: Date.now(), distance: data.distance, elapsedTime: data.elapsedTime, pace: data.pace, intent: data.intent, runReport: data.runReport, locations: data.locations } as SavedRun);
  };

  const handleStartWorkout = (workout: Workout) => {
    setSessionWorkout(workout);
    setSessionIntent(workout.name);
    setCurrentScreen("running");
  };

  const handleViewHistoryRun = (run: SavedRun) => {
    setRunSummary(run); setSummaryReturnTo("history"); setCurrentScreen("summary");
  };

  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 }, className: "flex-1" };

  return (
    <NextUIProvider>
      <div className="min-h-screen w-full bg-black flex flex-col md:flex-row md:justify-center md:items-center">
        <main className="w-full max-w-2xl md:h-[90vh] md:min-h-[600px] md:max-h-[900px] md:rounded-3xl md:overflow-hidden md:shadow-2xl md:border md:border-neutral-800 flex flex-col flex-1 md:flex-initial bg-black">
          <AnimatePresence mode="wait">
            {currentScreen === "onboarding" && (
              <motion.div key="onboarding" {...fade}><OnboardingScreen onFinish={() => setCurrentScreen("home")} /></motion.div>
            )}
            {currentScreen === "home" && (
              <motion.div key="home" {...fade}>
                <HomeScreen
                  onStartRun={intent => { setSessionIntent(intent); setSessionWorkout(null); setCurrentScreen("running"); }}
                  onHistory={() => setCurrentScreen("history")}
                  onSettings={() => setCurrentScreen("settings")}
                  onOpenWorkoutBuilder={() => setCurrentScreen("workoutBuilder")}
                  onStartWorkout={handleStartWorkout}
                  workouts={workouts}
                />
              </motion.div>
            )}
            {currentScreen === "running" && (
              <motion.div key="running" {...fade}>
                <RunTracker autoStart sessionIntent={sessionIntent} activeWorkout={sessionWorkout}
                  onBack={() => setCurrentScreen("home")} onFinish={handleRunFinish} />
              </motion.div>
            )}
            {currentScreen === "history" && (
              <motion.div key="history" {...fade}><RunHistory onBack={() => setCurrentScreen("home")} onViewRun={handleViewHistoryRun} /></motion.div>
            )}
            {currentScreen === "settings" && (
              <motion.div key="settings" {...fade}><SettingsScreen onBack={() => setCurrentScreen("home")} /></motion.div>
            )}
            {currentScreen === "workoutBuilder" && (
              <motion.div key="workoutBuilder" {...fade}>
                <WorkoutBuilder onBack={() => setCurrentScreen("home")} onStartWorkout={handleStartWorkout} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Summary renders as a true full-screen page, outside the constrained main container */}
      <AnimatePresence>
        {currentScreen === "summary" && (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ position: "fixed", inset: 0, zIndex: 500, overflowY: "auto", background: "#050505" }}
          >
            <RunSummary
              distance={runSummary?.distance ?? 0}
              elapsedTime={runSummary?.elapsedTime ?? 0}
              pace={runSummary?.pace ?? 0}
              intent={runSummary?.intent}
              runReport={runSummary?.runReport}
              locations={runSummary?.locations}
              onHome={() => { window.scrollTo(0, 0); setCurrentScreen(summaryReturnTo); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </NextUIProvider>
  );
}

export default App;
