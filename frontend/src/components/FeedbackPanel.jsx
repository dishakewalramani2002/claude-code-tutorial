const SIGNAL_COLORS = {
  "Strong":        "bg-green-100 text-green-700",
  "Developing":    "bg-yellow-100 text-yellow-700",
  "Needs Work":    "bg-red-100 text-red-600",
};

function SkillBadge({ label, value }) {
  const colorClass = SIGNAL_COLORS[value] ?? "bg-gray-100 text-gray-500";
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export default function FeedbackPanel({ feedback }) {
  if (!feedback) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm text-center p-6">
        Feedback will appear here after the customer responds.
      </div>
    );
  }

  const signals = feedback.signals ?? {};
  const practice = feedback?.analysis?.learn_from_this_practice;

  return (
    <div className="p-5 space-y-4">
      <h3 className="text-base font-semibold text-gray-800">Turn Feedback</h3>
      <p className="text-xs text-gray-400 -mt-3">Click any blue message to view its feedback.</p>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
        <SkillBadge label="Empathy First" value={signals.empathyFirst} />
        <SkillBadge label="Active Listening" value={signals.activeListening} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Next Step
        </p>
        <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3 leading-relaxed">
          {feedback.nextStep ?? "—"}
        </p>
      </div>
      {practice && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Area
            </p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">
              {practice.area ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Next step
            </p>
            <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3 leading-relaxed">
              {practice.focus ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Why this helps
            </p>
            <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3 leading-relaxed">
              {practice.why_it_improves_deescalation ?? "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
