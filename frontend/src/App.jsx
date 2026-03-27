import { useState } from "react";
import axios from "axios";
import ModeSelector from "./components/ModeSelector";
import ChatWindow from "./components/ChatWindow";
import ReportPage from "./components/ReportPage";

export default function App() {
  const [view, setView] = useState("landing"); // "landing" | "mode-select" | "chat" | "report"
  const [mode, setMode] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  function handleModeSelect(selectedMode) {
    setMode(selectedMode);
    setView("chat");
  }

  async function handleEndSession(messages) {
    setReportLoading(true);
    setReportError(null);
    setView("report"); // show loading state immediately
    try {
      const response = await axios.post("http://localhost:8000/report", {
        mode,
        history: messages,
      });
      setReport(response.data);
    } catch {
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  }

  function handleNewSession() {
    setMode(null);
    setReport(null);
    setReportError(null);
    setView("landing");
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

  if (view === "report") {
    if (reportLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Generating your performance report...</p>
          <p className="text-sm text-gray-400">This may take 15–20 seconds</p>
        </div>
      );
    }
    if (reportError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
          <p className="text-red-500">{reportError}</p>
          <button
            onClick={handleNewSession}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      );
    }
    return <ReportPage report={report} mode={mode} onNewSession={handleNewSession} />;
  }

  return (
    <ChatWindow
      mode={mode}
      onEndSession={handleEndSession}
    />
  );
}
