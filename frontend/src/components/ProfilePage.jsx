import { useState, useEffect } from "react";
import axios from "axios";
import NavBar from "./NavBar";

const PERSONA_EMOJIS = {
  angry: "😡",
  confused: "😕",
  demanding: "😤",
  anxious: "😰",
};

function ScoreBar({ label, score }) {
  if (score === null || score === undefined) return null;
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mb-1">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-700">{score}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

const SIGNAL_COLORS = {
  "Strong":     "bg-green-100 text-green-700",
  "Developing": "bg-yellow-100 text-yellow-700",
  "Needs Work": "bg-red-100 text-red-600",
};

function SignalBadge({ label, value }) {
  const colorClass = SIGNAL_COLORS[value] ?? "bg-gray-100 text-gray-500";
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      {label}
      <span className={`px-2 py-0.5 rounded-full font-semibold ${colorClass}`}>{value || "—"}</span>
    </span>
  );
}

function SessionDetail({ session, onBack }) {
  const { messages = [], report } = session;
  const perf = report?.performance ?? {};

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline">← Back to sessions</button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-1">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{PERSONA_EMOJIS[session.persona]}</span>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{session.scenario_label}</h2>
            <p className="text-sm text-gray-500">
              {session.persona.charAt(0).toUpperCase() + session.persona.slice(1)} · {session.training ? "Training" : "Evaluation"} · {new Date(session.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Scores */}
      {perf.overall_score !== undefined && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Performance</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{perf.overall_score}%</div>
              <div className="text-sm text-gray-500">Overall Score</div>
            </div>
            <div className="space-y-2">
              <ScoreBar label="Empathy" score={perf.empathy_score} />
              <ScoreBar label="Transparency" score={perf.transparency_score} />
              <ScoreBar label="Ownership" score={perf.ownership_score} />
            </div>
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Conversation</h3>
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} flex-col gap-1`}>
              <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm self-end"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm self-start"
              }`}>
                <p className="text-xs font-semibold mb-1 opacity-70">
                  {msg.role === "user" ? "You (CSR)" : "Customer"}
                </p>
                {msg.content}
              </div>
              {msg.feedback && (
                <div className="self-end max-w-xl bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs space-y-2">
                  <div className="flex gap-3">
                    <SignalBadge label="Empathy First"    value={msg.feedback.signals?.empathyFirst} />
                    <SignalBadge label="Active Listening" value={msg.feedback.signals?.activeListening} />
                  </div>
                  {msg.feedback.nextStep && (
                    <p className="text-gray-600 italic">"{msg.feedback.nextStep}"</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key learnings */}
      {report?.key_learnings?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Key Learnings</h3>
          <ul className="space-y-2">
            {report.key_learnings.map((l, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-blue-500 mt-0.5">•</span>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage({ token, navProps, onBack }) {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab] = useState("sessions"); // "sessions" | "password"
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get("http://localhost:8000/me", { headers }).then(r => setUser(r.data));
    axios.get("http://localhost:8000/sessions", { headers }).then(r => setSessions(r.data));
  }, []);

  async function loadSession(id) {
    setLoadingDetail(true);
    setSelectedSession(id);
    try {
      const r = await axios.get(`http://localhost:8000/sessions/${id}`, { headers });
      setSessionDetail(r.data);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    if (pwForm.next.length < 6) { setPwError("Password must be at least 6 characters."); return; }
    setPwLoading(true);
    try {
      await axios.post("http://localhost:8000/change-password", {
        current_password: pwForm.current,
        new_password: pwForm.next,
      }, { headers });
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwError(err.response?.data?.detail || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  }

  if (sessionDetail && selectedSession) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 max-w-3xl mx-auto">
        <SessionDetail session={sessionDetail} onBack={() => { setSelectedSession(null); setSessionDetail(null); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-800 transition">← Back</button>
          <h1 className="font-bold text-gray-900 text-lg">Profile</h1>
        </div>
        <NavBar {...navProps} />
      </header>

      <div className="max-w-3xl mx-auto p-8 space-y-6">
        {/* User info card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">@{user?.username}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {["sessions", "password"].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "sessions" ? "Past Sessions" : "Change Password"}
            </button>
          ))}
        </div>

        {/* Sessions tab */}
        {tab === "sessions" && (
          <div className="space-y-3">
            {sessions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">No sessions yet. Start a session to see your history here.</p>
            )}
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => loadSession(s.id)}
                className="w-full bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-sm transition flex items-center gap-4"
              >
                <span className="text-2xl flex-shrink-0">{PERSONA_EMOJIS[s.persona]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{s.scenario_label}</p>
                  <p className="text-sm text-gray-500">
                    {s.persona.charAt(0).toUpperCase() + s.persona.slice(1)} · {s.training ? "Training" : "Evaluation"} · {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                {s.overall_score !== null ? (
                  <div className="text-right flex-shrink-0">
                    <p className={`text-2xl font-bold ${s.overall_score >= 70 ? "text-green-600" : s.overall_score >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                      {s.overall_score}%
                    </p>
                    <p className="text-xs text-gray-400">Overall</p>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 flex-shrink-0">No report</span>
                )}
                {loadingDetail && selectedSession === s.id && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Change password tab */}
        {tab === "password" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-sm">
            <h3 className="font-semibold text-gray-800 mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {[
                { label: "Current Password", key: "current" },
                { label: "New Password", key: "next" },
                { label: "Confirm New Password", key: "confirm" },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input
                    type="password"
                    value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              {pwError && <p className="text-sm text-red-500">{pwError}</p>}
              {pwSuccess && <p className="text-sm text-green-600">Password updated successfully.</p>}
              <button
                type="submit"
                disabled={pwLoading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {pwLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
