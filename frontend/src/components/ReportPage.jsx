import NavBar from "./NavBar";

const SCENARIO_LABELS = {
  vc1: "Health Insurance Billing",
  vc2: "Flight Cancellation",
  vc3: "Lost Baggage",
};

const SIGNAL_COLORS = {
  "Strong":       "bg-green-100 text-green-700",
  "Developing":   "bg-yellow-100 text-yellow-700",
  "Needs Work":   "bg-red-100 text-red-600",
};

function CoachingField({ label, value, colorClass = "bg-gray-50" }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm text-gray-700 rounded-lg px-3 py-2 ${colorClass}`}>{value}</p>
    </div>
  );
}

function SignalBadge({ label, value }) {
  const colorClass = SIGNAL_COLORS[value] ?? "bg-gray-100 text-gray-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function TurnCard({ turn }) {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="bg-blue-50 px-4 py-3">
        <p className="text-xs font-semibold text-blue-600 mb-1">CSR — Turn {turn.turn}</p>
        <p className="text-sm text-gray-800">{turn.csr_message}</p>
      </div>
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 space-y-2">
        <SignalBadge label="Empathy First"    value={turn.empathyFirst} />
        <SignalBadge label="Active Listening" value={turn.activeListening} />
        {turn.nextStep && (
          <p className="text-xs text-gray-600 italic pt-1">Next step: {turn.nextStep}</p>
        )}
      </div>
    </div>
  );
}

export default function ReportPage({ report, sessionConfig, navProps, onNewSession }) {
  const { scenario, persona, training, personaEmoji, personaLabel } = sessionConfig ?? {};
  const modeLabel = training ? "Training" : "Evaluation";
  const sessionLabel = `${modeLabel} — ${SCENARIO_LABELS[scenario] ?? scenario} · ${personaEmoji ?? ""} ${personaLabel ?? ""}`.trim();

  const coaching = report?.session_coaching;
  const turns = report?.turn_by_turn ?? [];

  return (
    <>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="font-semibold text-gray-800">Session Report</span>
          <span className="ml-3 text-sm text-gray-400">{sessionLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNewSession}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            New Session
          </button>
          <NavBar {...navProps} />
        </div>
      </div>

      {/* Report body */}
      <div className="bg-gray-50 min-h-screen py-8 px-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Title */}
          <div className="text-center pb-2">
            <h1 className="text-3xl font-bold text-gray-900">Performance Report</h1>
            <p className="text-gray-500 mt-1">{sessionLabel}</p>
          </div>

          {/* Session Coaching */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b-2 border-gray-800">
              <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Session Coaching</h2>
            </div>
            {!coaching ? (
              <p className="text-sm text-gray-400">No session feedback available.</p>
            ) : (
              <div className="space-y-4">
                <CoachingField label="Overall Performance"     value={coaching.overallPerformance} colorClass="bg-gray-50" />
                <CoachingField label="Keep Doing"              value={coaching.keepDoing}           colorClass="bg-green-50" />
                <CoachingField label="Key Pattern to Improve" value={coaching.keyPatternToImprove} colorClass="bg-yellow-50" />
                <CoachingField label="Actionable Improvement"  value={coaching.actionableImprovement} colorClass="bg-blue-50" />
                <CoachingField label="Encouragement"           value={coaching.encouragement}       colorClass="bg-gray-50" />
              </div>
            )}
          </div>

          {/* Turn-by-Turn Feedback */}
          {turns.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-2 border-b-2 border-gray-800">
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Turn-by-Turn Feedback</h2>
              </div>
              <div className="space-y-4">
                {turns.map((turn) => (
                  <TurnCard key={turn.turn} turn={turn} />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
