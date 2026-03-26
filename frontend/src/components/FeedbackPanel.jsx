function SkillBadge({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          value
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-600"
        }`}
      >
        {value ? "Yes" : "No"}
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

  return (
    <div className="p-5 space-y-4">
      <h3 className="text-base font-semibold text-gray-800">Turn Feedback</h3>
      <p className="text-xs text-gray-400 -mt-3">Click any blue message to view its feedback.</p>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
        <SkillBadge label="Empathy" value={feedback.empathy} />
        <SkillBadge label="Transparency" value={feedback.transparency} />
        <SkillBadge label="Ownership" value={feedback.ownership} />
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Suggestion
        </p>
        <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3 leading-relaxed">
          {feedback.suggestion}
        </p>
      </div>
    </div>
  );
}
