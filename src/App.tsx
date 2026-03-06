import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NextUIProvider } from "@nextui-org/react";
import { HomeScreen } from "./components/HomeScreen";
import { RunTracker } from "./components/RunTracker";
import { RunSummary } from "./components/RunSummary";
import CoachDebugPanel from "./components/CoachDebugPanel";
import { OnboardingScreen } from "./components/OnboardingScreen";
import "./index.css";

type Screen = "onboarding" | "home" | "running" | "summary";

export interface RunSummaryData {
  distance: number;
  elapsedTime: number;
  pace: number;
  intent?: string;
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    try {
      const stored = localStorage.getItem("onboarding");
      return stored ? ("home" as Screen) : ("onboarding" as Screen);
    } catch {
      return "onboarding";
    }
  });

  const [runSummary, setRunSummary] = useState<RunSummaryData | null>(null);
  const [sessionIntent, setSessionIntent] = useState("");

  const handleRunFinish = (data: RunSummaryData) => {
    setRunSummary(data);
    setCurrentScreen("summary");
  };

  return (
    <NextUIProvider>
      <div className="min-h-screen w-full bg-black flex flex-col md:flex-row md:justify-center md:items-center">
        <main className="w-full max-w-2xl md:h-[90vh] md:min-h-[600px] md:max-h-[900px] md:rounded-3xl md:overflow-hidden md:shadow-2xl md:border md:border-neutral-800 flex flex-col flex-1 md:flex-initial bg-black">
          <AnimatePresence mode="wait">
            {currentScreen === "onboarding" ? (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1"
              >
                <OnboardingScreen onFinish={() => setCurrentScreen("home")} />
              </motion.div>
            ) : currentScreen === "home" ? (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1"
              >
                <HomeScreen
                  onStartRun={(intent) => {
                    setSessionIntent(intent);
                    setCurrentScreen("running");
                  }}
                />
              </motion.div>
            ) : currentScreen === "running" ? (
              <motion.div
                key="running"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1"
              >
                <RunTracker
                  autoStart
                  sessionIntent={sessionIntent}
                  onBack={() => setCurrentScreen("home")}
                  onFinish={handleRunFinish}
                />
              </motion.div>
            ) : (
              <motion.div
                key="summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex-1"
              >
                <RunSummary
                  distance={runSummary?.distance ?? 0}
                  elapsedTime={runSummary?.elapsedTime ?? 0}
                  pace={runSummary?.pace ?? 0}
                  onHome={() => setCurrentScreen("home")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <CoachDebugPanel />
      </div>
    </NextUIProvider>
  );
}

export default App;
