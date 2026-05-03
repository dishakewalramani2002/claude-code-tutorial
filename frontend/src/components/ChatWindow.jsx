import { useState, useRef, useEffect } from "react";
import axios from "axios";
import MessageBubble from "./MessageBubble";
import FeedbackPanel from "./FeedbackPanel";
import WorkflowPortal from "./WorkflowPortal";
import NavBar from "./NavBar";

const BASE_URL = import.meta.env.VITE_API_URL;
console.log("BASE_URL:", BASE_URL);
const API_URL = `${BASE_URL}/chat`;

const SCENARIO_LABELS = {
  vc1: "Health Insurance Billing",
  vc2: "Flight Cancellation",
  vc3: "Lost Baggage",
};

export default function ChatWindow({ sessionConfig, token, navProps, onEndSession, onAuthExpired }) {
  const { scenario, persona, training, scenarioLabel, personaEmoji, personaLabel } = sessionConfig;

  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [portalStep, setPortalStep] = useState(0);
  const [portalCompleted, setPortalCompleted] = useState([]);
  const [error, setError] = useState(null);
  const [portalHeight, setPortalHeight] = useState(280);

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    function onMouseMove(e) {
      if (!isDragging.current) return;
      const delta = e.clientY - dragStartY.current;
      const containerH = containerRef.current?.clientHeight ?? window.innerHeight;
      const newH = Math.min(Math.max(dragStartHeight.current + delta, 80), containerH - 160);
      setPortalHeight(newH);
    }

    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const activeFeedback =
    selectedIdx !== null ? messages[selectedIdx]?.feedback ?? null : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    console.log("📊 CURRENT MESSAGES:", messages);
  }, [messages]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchOpener() {
      setLoading(true);
      try {
        const response = await axios.post(
          `${BASE_URL}/start`,
          { scenario, persona, training },
          { headers: authHeaders, signal: controller.signal }
        );

        setSessionId(response.data.session_id);
        setMessages([
          { role: "assistant", content: response.data.customer_response }
        ]);

      } catch (err) {
        if (axios.isCancel(err)) return;
        if (err.response?.status === 401) {
          onAuthExpired();
          return;
        }
        setError("Failed to start session. Please try again.");
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

    console.log("🚀 Sending message:", trimmed);

    const userMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      console.log("📤 Request payload:", {
        scenario,
        persona,
        training,
        message: trimmed,
        history: updatedMessages,
        session_id: sessionId
      });

      const response = await axios.post(
        API_URL,
        {
          scenario,
          persona,
          training,
          message: trimmed,
          history: updatedMessages,
          session_id: sessionId
        },
        { headers: authHeaders }
      );

      console.log("📥 FULL RESPONSE:", response.data);

      const { customer_response, feedback } = response.data;

      console.log("🧠 FEEDBACK:", feedback);
      console.log("🧠 ANALYSIS:", feedback?.analysis);
      console.log("🧠 PRACTICE:", feedback?.analysis?.learn_from_this_practice);

      const csrIdx = updatedMessages.length - 1;

      setMessages(prev => {
        const next = prev.map((m, i) =>
          i === csrIdx ? { ...m, feedback } : m
        );

        const assistantMsg = { role: "assistant", content: customer_response };

        console.log("📝 Attaching feedback to USER message at idx:", csrIdx);
        console.log("🤖 Adding ASSISTANT message:", assistantMsg);
        console.log("📦 FINAL MESSAGES STATE:", [...next, assistantMsg]);

        return [...next, assistantMsg];
      });

      if (feedback) {
        console.log("🎯 Setting selectedIdx to:", csrIdx);
        setSelectedIdx(csrIdx);
      }

    } catch (err) {
      console.error("❌ ERROR:", err);
      if (err.response?.status === 401) {
        onAuthExpired();
        return;
      }
      setError("Failed to reach the server. Please try again.");
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
      <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-800">CSR Simulator</span>
          <span className="text-sm text-gray-400">{headerLabel}</span>
          <span className="text-sm text-gray-400">· {personaEmoji} {personaLabel}</span>
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

      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">

        <div style={{ height: portalHeight }} className="flex flex-col overflow-hidden flex-shrink-0">
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-1.5 flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Internal Portal
            </span>
            {portalStep > 0 && (
              <span className="text-xs text-gray-400">
                · Step {portalStep + 1}/6
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <WorkflowPortal
              scenario={scenario}
              persona={persona}
              step={portalStep}
              completed={portalCompleted}
              onAdvance={(stepId) => {
                setPortalCompleted(prev => [...prev, stepId]);
                setPortalStep(s => s + 1);
              }}
              onReset={() => {
                setPortalStep(0);
                setPortalCompleted([]);
              }}
            />
          </div>
        </div>

        <div
          onMouseDown={(e) => {
            isDragging.current = true;
            dragStartY.current = e.clientY;
            dragStartHeight.current = portalHeight;
            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
          }}
          className="h-2 flex-shrink-0 bg-gray-200 hover:bg-blue-400 cursor-row-resize flex items-center justify-center transition-colors group"
        >
          <div className="w-8 h-0.5 rounded-full bg-gray-400 group-hover:bg-white transition-colors" />
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-1.5">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Chat
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-100">
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
                <div className="text-gray-400 text-sm">Customer is typing...</div>
              )}

              {error && (
                <div className="text-center text-red-500 text-sm">{error}</div>
              )}

              <div ref={bottomRef} />
            </div>

            <div className="bg-white border-t border-gray-200 px-6 py-3">
              <div className="flex gap-3 items-end">
                <textarea
                  ref={inputRef}
                  className="flex-1 border rounded-xl px-4 py-3 text-sm"
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-blue-600 text-white px-5 py-3 rounded-xl"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {training && (
            <div className="w-72 bg-white border-l overflow-y-auto">
              <FeedbackPanel feedback={activeFeedback} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
