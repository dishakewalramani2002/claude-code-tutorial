import { useState, useRef, useEffect } from "react";
import axios from "axios";
import MessageBubble from "./MessageBubble";
import FeedbackPanel from "./FeedbackPanel";
import WorkflowPortal from "./WorkflowPortal";
import NavBar from "./NavBar";

const API_URL = "http://localhost:8000/chat";

const SCENARIO_LABELS = {
  vc1: "Health Insurance Billing",
  vc2: "Flight Cancellation",
  vc3: "Lost Baggage",
};

export default function ChatWindow({ sessionConfig, token, navProps, onEndSession }) {
  const { scenario, persona, training, scenarioLabel, personaEmoji, personaLabel } = sessionConfig;

  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "portal"
  const [portalStep, setPortalStep] = useState(0);
  const [portalCompleted, setPortalCompleted] = useState([]);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const activeFeedback =
    selectedIdx !== null ? messages[selectedIdx]?.feedback ?? null : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchOpener() {
      setLoading(true);
      try {
        const response = await axios.post(
          "http://localhost:8000/start",
          { scenario, persona, training },
          { headers: authHeaders, signal: controller.signal }
        );
        setSessionId(response.data.session_id);
        setMessages([{ role: "assistant", content: response.data.customer_response }]);
      } catch (err) {
        if (axios.isCancel(err)) return;
        setError("Failed to start session. Make sure the backend is running on port 8000.");
      } finally {
        setLoading(false);
      }
    }
    fetchOpener();
    return () => controller.abort();
  }, [scenario, persona, training]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        API_URL,
        { scenario, persona, training, message: trimmed, history: updatedMessages, session_id: sessionId },
        { headers: authHeaders }
      );

      const { customer_response, feedback: newFeedback } = response.data;

      const csrIdx = updatedMessages.length - 1;
      if (newFeedback) setSelectedIdx(csrIdx);
      setMessages([
        ...updatedMessages.map((m, i) =>
          i === csrIdx ? { ...m, feedback: newFeedback } : m
        ),
        { role: "assistant", content: customer_response },
      ]);
    } catch {
      setError("Failed to reach the server. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const modeLabel = training ? "Training" : "Evaluation";
  const headerLabel = `${modeLabel} — ${scenarioLabel || SCENARIO_LABELS[scenario]}`;

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6">
          <div>
            <span className="font-semibold text-gray-800">CSR Simulator</span>
            <span className="ml-3 text-sm text-gray-400">{headerLabel}</span>
            <span className="ml-2 text-sm text-gray-400">
              · {personaEmoji} {personaLabel}
            </span>
          </div>
          {/* Tab switcher */}
          <div className="flex">
            {["chat", "portal"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "chat"
                  ? "Chat"
                  : `Internal Portal${portalStep > 0 ? ` · Step ${portalStep + 1}/6` : ""}`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => onEndSession(messages, sessionId)}
            className="text-sm text-gray-500 hover:text-red-500 transition"
          >
            End Session & Get Report
          </button>
          <NavBar {...navProps} />
        </div>
      </header>

      {/* Portal tab — always mounted, hidden when not active so state persists */}
      <div className={`flex-1 overflow-hidden ${activeTab === "portal" ? "flex flex-col" : "hidden"}`}>
        <WorkflowPortal
          scenario={scenario}
          persona={persona}
          step={portalStep}
          completed={portalCompleted}
          onAdvance={(stepId) => {
            setPortalCompleted(prev => [...prev, stepId]);
            setPortalStep(s => s + 1);
          }}
          onReset={() => { setPortalStep(0); setPortalCompleted([]); }}
        />
      </div>

      {/* Chat tab — always mounted, hidden when not active so state persists */}
      <div className={`flex-1 flex overflow-hidden ${activeTab === "chat" ? "" : "hidden"} ${training ? "flex-row" : ""}`}>
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="text-center text-gray-400 text-sm mt-16">Starting session...</div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                role={msg.role}
                content={msg.content}
                hasFeedback={!!msg.feedback}
                isSelected={selectedIdx === i}
                onClick={msg.feedback ? () => setSelectedIdx(i) : undefined}
              />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 text-gray-400 text-sm">
                  Customer is typing...
                </div>
              </div>
            )}
            {error && (
              <div className="text-center text-red-500 text-sm">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Type your response as the CSR agent..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Press Enter to send, Shift+Enter for new line.
            </p>
          </div>
        </div>

        {/* Feedback Sidebar (training only) */}
        {training && (
          <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            <FeedbackPanel feedback={activeFeedback} />
          </div>
        )}
      </div>
    </div>
  );
}
