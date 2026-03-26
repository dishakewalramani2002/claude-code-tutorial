import { useState } from "react";
import axios from "axios";

const SUGGESTIONS = {
  vc1: [
    "Why would a covered procedure still be billed to the patient?",
    "How do I initiate a claim dispute?",
    "What documents are needed for a billing appeal?",
    "What is the timeline for resolving a billing dispute?",
    "How do I check if a procedure needed prior authorization?",
  ],
  vc2: [
    "What compensation is owed for an airline-caused cancellation?",
    "How do I rebook a passenger on the next available flight?",
    "When does the airline provide hotel and meal vouchers?",
    "What are DOT rules for cancelled flight refunds?",
    "How do I handle a missed connecting flight due to cancellation?",
  ],
};

export default function KnowledgeBase({ mode }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function search(q) {
    const trimmed = (q ?? query).trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await axios.post("http://localhost:8000/lookup", {
        mode,
        query: trimmed,
      });
      setResult({ query: trimmed, answer: response.data.answer });
    } catch {
      setError("Failed to fetch. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestion(s) {
    setQuery(s);
    search(s);
  }

  const domainLabel = mode === "vc1" ? "Health Insurance" : "Airline";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Search bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {domainLabel} Internal Knowledge Base
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search policies, procedures, billing codes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button
            onClick={() => search()}
            disabled={loading || !query.trim()}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Result */}
        {result && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Result</p>
            <p className="text-sm font-medium text-gray-800">{result.query}</p>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border-t border-gray-100 pt-3">
              {result.answer}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {/* Suggested queries */}
        {!result && !loading && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Common Lookups
            </p>
            <div className="space-y-2">
              {SUGGESTIONS[mode].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-700 hover:border-blue-400 hover:text-blue-700 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* New search after result */}
        {result && !loading && (
          <button
            onClick={() => { setResult(null); setQuery(""); }}
            className="text-sm text-blue-600 hover:underline"
          >
            ← New search
          </button>
        )}
      </div>
    </div>
  );
}
