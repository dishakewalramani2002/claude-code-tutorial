import { useState } from "react";
import axios from "axios";
import LoginPage from "./components/LoginPage";
import ModeSelector from "./components/ModeSelector";
import ChatWindow from "./components/ChatWindow";
import ReportPage from "./components/ReportPage";
import ProfilePage from "./components/ProfilePage";
import NavBar from "./components/NavBar";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [username, setUsername] = useState(() => localStorage.getItem("username"));
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("displayName"));
  const [view, setView] = useState("landing"); // "landing" | "mode-select" | "chat" | "report" | "profile"
  const [sessionConfig, setSessionConfig] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  function handleLogin(accessToken, user, name) {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("username", user);
    localStorage.setItem("displayName", name);
    setToken(accessToken);
    setUsername(user);
    setDisplayName(name);
    setView("landing");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("displayName");
    setToken(null);
    setUsername(null);
    setDisplayName(null);
    setView("landing");
    setSessionConfig(null);
    setReport(null);
  }

  function handleModeSelect(config) {
    setSessionConfig(config);
    setView("chat");
  }

  async function handleEndSession(messages, sessionId) {
    setReportLoading(true);
    setReportError(null);
    setView("report");
    try {
      const response = await axios.post(
        "http://localhost:8000/report",
        {
          scenario: sessionConfig.scenario,
          persona: sessionConfig.persona,
          training: sessionConfig.training,
          history: messages,
          session_id: sessionId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReport(response.data);
    } catch {
      setReportError("Failed to generate report. Please try again.");
    } finally {
      setReportLoading(false);
    }
  }

  function handleNewSession() {
    setSessionConfig(null);
    setReport(null);
    setReportError(null);
    setView("landing");
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const navProps = {
    displayName: displayName || username,
    onProfile: () => setView("profile"),
    onLogout: handleLogout,
  };

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="font-semibold text-gray-800">CSR Simulator</span>
          <NavBar {...navProps} />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
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
      </div>
    );
  }

  if (view === "mode-select") {
    return <ModeSelector onSelect={handleModeSelect} navProps={navProps} />;
  }

  if (view === "profile") {
    return <ProfilePage token={token} navProps={navProps} onBack={() => setView("landing")} />;
  }

  if (view === "report") {
    if (reportLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <span className="font-semibold text-gray-800">CSR Simulator</span>
            <NavBar {...navProps} />
          </header>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">Generating your performance report...</p>
            <p className="text-sm text-gray-400">This may take 15–20 seconds</p>
          </div>
        </div>
      );
    }
    if (reportError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <span className="font-semibold text-gray-800">CSR Simulator</span>
            <NavBar {...navProps} />
          </header>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-red-500">{reportError}</p>
            <button
              onClick={handleNewSession}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return (
      <ReportPage
        report={report}
        sessionConfig={sessionConfig}
        navProps={navProps}
        onNewSession={handleNewSession}
      />
    );
  }

  return (
    <ChatWindow
      sessionConfig={sessionConfig}
      token={token}
      navProps={navProps}
      onEndSession={handleEndSession}
    />
  );
}
