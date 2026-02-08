import { useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { RunTracker } from "./components/RunTracker";
import "./App.css";

type Screen = "home" | "running";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  return (
    <div className="min-h-screen w-full bg-bg-primary flex flex-col md:flex-row md:justify-center md:items-center">
      <main className="w-full max-w-app-lg md:h-[90vh] md:min-h-[600px] md:max-h-[900px] md:rounded-3xl md:overflow-hidden md:shadow-2xl md:border md:border-white/10 flex flex-col flex-1 md:flex-initial">
        {currentScreen === "home" ? (
          <HomeScreen onStartRun={() => setCurrentScreen("running")} />
        ) : (
          <RunTracker onBack={() => setCurrentScreen("home")} />
        )}
      </main>
    </div>
  );
}

export default App;
