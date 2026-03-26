export default function ModeSelector({ onSelect }) {
  const modes = [
    {
      id: "vc1",
      title: "Training Mode",
      subtitle: "Health Insurance Billing",
      description:
        "Practice with a confused, upset customer disputing a surprise medical bill. Receive live feedback on your empathy, transparency, and ownership skills after each response.",
      badge: "Feedback Enabled",
      badgeColor: "bg-green-100 text-green-800",
    },
    {
      id: "vc2",
      title: "Evaluation Mode",
      subtitle: "Flight Cancellation",
      description:
        "Handle a real-time flight cancellation scenario without coaching. Your responses are not scored — this mode tests how you perform independently.",
      badge: "No Feedback",
      badgeColor: "bg-yellow-100 text-yellow-800",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose a Scenario</h2>
      <p className="text-gray-500 mb-10">Select a mode to begin your session.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="bg-white border border-gray-200 rounded-xl p-6 text-left hover:shadow-md hover:border-blue-400 transition space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-semibold text-gray-800">{m.title}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${m.badgeColor}`}>
                {m.badge}
              </span>
            </div>
            <p className="text-sm font-medium text-blue-600">{m.subtitle}</p>
            <p className="text-sm text-gray-500">{m.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
