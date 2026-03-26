import { useState } from "react";
import ModeSelector from "./components/ModeSelector";
import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [view, setView] = useState("landing"); // "landing" | "mode-select" | "chat"
  const [mode, setMode] = useState(null);      // "vc1" | "vc2"

  function handleModeSelect(selectedMode) {
    setMode(selectedMode);
    setView("chat");
  }

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-xl text-center space-y-6">
          <h1 className="text-4xl font-bold text-gray-900">
            CSR Conflict Resolution Simulator
          </h1>
          <p className="text-lg text-gray-600">
            Practice handling difficult customer service scenarios using AI-powered
            role-play. Get real-time feedback on empathy, transparency, and ownership.
          </p>
          <button
            onClick={() => setView("mode-select")}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
          >
            Start Session
          </button>
        </div>
      </div>
    );
  }

  if (view === "mode-select") {
    return <ModeSelector onSelect={handleModeSelect} />;
  }

  return (
    <ChatWindow
      mode={mode}
      onReset={() => {
        setMode(null);
        setView("landing");
      }}
    />
  );
}
