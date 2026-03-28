import { useRef } from "react";

const SCENARIO_LABELS = {
  vc1: "Health Insurance Billing",
  vc2: "Flight Cancellation",
  vc3: "Lost Baggage",
};

function ScoreBar({ label, score }) {
  const color =
    score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-gray-800">{score}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 print-bar">
        <div
          className={`${color} h-2.5 rounded-full`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ number, title }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-2 border-b-2 border-gray-800">
      <span className="bg-gray-800 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
        {number}
      </span>
      <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function Badge({ value }) {
  return value ? (
    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
      ✓ Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
      ✗ No
    </span>
  );
}

export default function ReportPage({ report, sessionConfig, onNewSession }) {
  const { scenario, persona, training, personaEmoji, personaLabel } = sessionConfig ?? {};
  const modeLabel = training ? "Training" : "Evaluation";
  const sessionLabel = `${modeLabel} — ${SCENARIO_LABELS[scenario] ?? scenario} · ${personaEmoji ?? ""} ${personaLabel ?? ""}`.trim();
  const printRef = useRef();

  function handleDownload() {
    window.print();
  }

  const p = report.performance ?? {};
  const profile = report.customer_profile ?? {};

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { padding: 0 !important; background: white !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          .print-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {/* Top bar — hidden on print */}
      <div className="no-print bg-white border-b border-gray-200 px-8 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <span className="font-semibold text-gray-800">Session Report</span>
          <span className="ml-3 text-sm text-gray-400">{sessionLabel}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
          >
            Download PDF
          </button>
          <button
            onClick={onNewSession}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            New Session
          </button>
        </div>
      </div>

      {/* Report body */}
      <div ref={printRef} className="print-page bg-gray-50 min-h-screen py-8 px-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Title */}
          <div className="text-center pb-4">
            <h1 className="text-3xl font-bold text-gray-900">Performance Report</h1>
            <p className="text-gray-500 mt-1">{sessionLabel}</p>
          </div>

          {/* ── 1. Customer Profile ── */}
          <div className="print-card bg-white rounded-xl p-6 shadow-sm">
            <SectionHeader number="1" title="Customer Profile" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Name</p>
                <p className="text-gray-800">{profile.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Emotional State</p>
                <p className="text-gray-800">{profile.emotional_state || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Core Issue</p>
                <p className="text-gray-800">{profile.core_issue || "—"}</p>
              </div>
              {profile.context && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Context</p>
                  <p className="text-gray-800">{profile.context}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── 2. Success Criteria ── */}
          <div className="print-card bg-white rounded-xl p-6 shadow-sm">
            <SectionHeader number="2" title="Success Criteria" />
            <p className="text-sm text-gray-500 mb-3">What the CSR should have done to resolve this call effectively:</p>
            <ul className="space-y-2">
              {(report.success_criteria ?? []).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 font-bold mt-0.5">▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* ── 3. Performance Analysis ── */}
          <div className="print-card bg-white rounded-xl p-6 shadow-sm">
            <SectionHeader number="3" title="Performance Analysis" />

            {/* Overall score */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-gray-800 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-gray-800">{p.overall_score ?? 0}%</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Overall Score</p>
                <p className="text-sm font-medium text-gray-700 mt-1">
                  {(p.overall_score ?? 0) >= 70
                    ? "Good performance — some areas to sharpen"
                    : (p.overall_score ?? 0) >= 40
                    ? "Developing — key skills need more practice"
                    : "Needs significant improvement across all dimensions"}
                </p>
              </div>
            </div>

            {/* Skill bars */}
            <div className="mb-6">
              <ScoreBar label="Empathy & Emotional Alignment" score={p.empathy_score ?? 0} />
              <ScoreBar label="Procedural Transparency" score={p.transparency_score ?? 0} />
              <ScoreBar label="Ownership & Action Planning" score={p.ownership_score ?? 0} />
            </div>

            {/* Strengths */}
            {(p.strengths ?? []).length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">What You Did Well</h3>
                <ul className="space-y-1.5">
                  {p.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mistakes */}
            {(p.critical_mistakes ?? []).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2">Critical Mistakes</h3>
                <ul className="space-y-1.5">
                  {p.critical_mistakes.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 font-bold mt-0.5">✗</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── 4. Conversation Transcript ── */}
          <div className="print-card bg-white rounded-xl p-6 shadow-sm">
            <SectionHeader number="4" title="Conversation Transcript" />
            <p className="text-sm text-gray-500 mb-4">
              Individual feedback shown for every CSR response.
            </p>

            {/* Build the transcript from turn_feedback interleaved with customer messages */}
            <TranscriptView report={report} />
          </div>

          {/* ── 5. Key Learnings & Recommendations ── */}
          <div className="print-card bg-white rounded-xl p-6 shadow-sm">
            <SectionHeader number="5" title="Key Learnings & Recommendations" />

            {(report.key_learnings ?? []).length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Key Learnings</h3>
                <ul className="space-y-2">
                  {report.key_learnings.map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 font-bold mt-0.5">▸</span>
                      {l}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(report.recommendations ?? []).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Actionable Recommendations</h3>
                <ul className="space-y-2">
                  {report.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// Renders the conversation with per-turn CSR feedback inline
function TranscriptView({ report }) {
  const turns = report.turn_feedback ?? [];
  let csrIdx = 0;

  // We'll render customer messages as plain bubbles and
  // CSR messages matched to their turn_feedback entry
  return (
    <div className="space-y-4">
      {turns.length === 0 && (
        <p className="text-sm text-gray-400">No turn data available.</p>
      )}
      {turns.map((turn, i) => (
        <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
          {/* CSR message */}
          <div className="bg-blue-50 px-4 py-3">
            <p className="text-xs font-semibold text-blue-600 mb-1">CSR — Turn {i + 1}</p>
            <p className="text-sm text-gray-800">{turn.csr_message}</p>
          </div>
          {/* Feedback row */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
            <div className="flex flex-wrap gap-3 mb-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="font-medium">Empathy</span>
                <Badge value={turn.empathy} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="font-medium">Transparency</span>
                <Badge value={turn.transparency} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="font-medium">Ownership</span>
                <Badge value={turn.ownership} />
              </div>
            </div>
            {turn.coaching_note && (
              <p className="text-xs text-gray-600 italic">💬 {turn.coaching_note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
