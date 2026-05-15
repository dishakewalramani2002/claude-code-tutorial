import os
import json
from dotenv import load_dotenv
from config import build_client, MODEL_NAME

# --- Client Setup ---

LLM_TIMEOUT = 15
DEBUG_PROMPTS = os.getenv("DEBUG_PROMPTS", "false").lower() == "true"

load_dotenv()

client = build_client()

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")

SCENARIOS = {
    "vc1": {
        "file": "billing_dispute",
        "opener": "vc1",
        "kb": "kb_vc1_prompt.txt",
    },
    "vc2": {
        "file": "flight_cancellation",
        "opener": "vc2",
        "kb": "kb_vc2_prompt.txt",
    },
    "vc3": {
        "file": "baggage_delay",
        "opener": "vc3",
        "kb": "kb_vc3_prompt.txt",
    },
    "loan_delay": {
        "file": "loan_delay",
        "opener": "loan_delay",
        "kb": "kb_loan_delay_prompt.txt",
    },
    "refund_request": {
        "file": "refund_request",
        "opener": "refund_request",
        "kb": "kb_refund_request_prompt.txt",
    },
}


# --- Prompt Loading ---

def load_prompt(filename: str) -> str:
    path = os.path.join(PROMPTS_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Prompt file not found: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def load_scenario_prompt(scenario: str) -> str:
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: '{scenario}'. Valid options: {list(SCENARIOS)}")
    return load_prompt(f"scenarios/{SCENARIOS[scenario]['file']}.txt")


def load_emotion_prompt(persona: str) -> str:
    path = os.path.join(PROMPTS_DIR, f"emotions/{persona}.txt")
    if not os.path.exists(path):
        raise ValueError(f"Unknown persona: '{persona}'. No emotion file found at: {path}")
    return load_prompt(f"emotions/{persona}.txt")


def load_shared(filename: str) -> str:
    return load_prompt(f"shared/{filename}.txt")


def load_format_prompt(mode: str) -> str:
    return load_prompt(f"formats/{mode}.txt")


def load_evaluation_prompt(name: str) -> str:
    return load_prompt(f"evaluation/{name}.txt")


def load_opener(scenario: str) -> str:
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: '{scenario}'. Valid options: {list(SCENARIOS)}")
    return load_prompt(f"openers/{SCENARIOS[scenario]['opener']}.txt")


# --- Prompt Assembly ---

def build_system_prompt(scenario: str, persona: str, training: bool, stream: bool = False) -> str:
    system_rules = load_shared("system_rules")
    scenario_text = load_scenario_prompt(scenario)
    emotion_text = load_emotion_prompt(persona)
    behavior_rules = load_shared("behavior_rules")
    output_format_text = load_shared("output_format")

    if stream:
        mode = "stream"
    elif training:
        mode = "training"
    else:
        mode = "plain"

    response_rules = load_format_prompt(mode)

    full_prompt = "\n\n".join([
        system_rules,
        scenario_text,
        emotion_text,
        behavior_rules,
        output_format_text,
        response_rules,
    ])

    if training:
        full_prompt += "\n\n" + load_evaluation_prompt("coaching")

    if DEBUG_PROMPTS:
        print("=== FINAL SYSTEM PROMPT ===")
        print(full_prompt)

    return full_prompt


# --- Message Utilities ---

def build_messages(history: list[dict], system_prompt: str, user_message: str) -> list[dict]:
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


# --- Coaching Utilities ---

def append_coaching_signal(system_prompt: str, history: list[dict]) -> str:
    last_next_step = None
    for turn in reversed(history):
        if turn.get("role") == "user" and isinstance(turn.get("feedback"), dict):
            next_step = turn["feedback"].get("nextStep", "").strip()
            if next_step:
                last_next_step = next_step
                break

    if last_next_step:
        system_prompt += f"""

COACHING SIGNAL (CRITICAL):
You MUST apply this in your next response:
{last_next_step}

Do not repeat previous behavior.
Your response will be evaluated based on whether you apply this instruction."""

    return system_prompt


# --- Feedback Utilities ---

_LABEL_TO_SCORE = {"Strong": 2, "Developing": 1, "Needs Work": 0}


def _enforce_feedback_consistency(feedback: dict, csr_message: str) -> None:
    """Post-processing safety net — enforces hard scoring rules the LLM may violate."""
    signals = feedback.setdefault("signals", {})
    analysis = feedback.setdefault("analysis", {})

    # Minimal message (≤4 words) → both skills must be Needs Work
    if len(csr_message.strip().split()) <= 4:
        signals["empathyFirst"] = "Needs Work"
        signals["activeListening"] = "Needs Work"

    empathy = signals.get("empathyFirst", "Needs Work")
    al = signals.get("activeListening", "Needs Work")

    # Numeric scores must exactly match signal labels — skills are independent
    analysis.setdefault("empathy_score", {})["score"] = _LABEL_TO_SCORE.get(empathy, 0)
    analysis.setdefault("active_listening_score", {})["score"] = _LABEL_TO_SCORE.get(al, 0)


# --- Conversation Generation ---

def start_conversation(scenario: str, persona: str, training: bool) -> dict:
    system_prompt = build_system_prompt(scenario, persona, training)
    opener = load_opener(scenario)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": opener},
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            max_tokens=512,
            temperature=0.7,
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        print(f"ERROR start_conversation LLM call failed: {e}")
        return {"customer_response": "I'm having trouble responding right now. Please try again.", "feedback": None}

    raw_text = response.choices[0].message.content.strip()
    if "###FEEDBACK###" in raw_text:
        raw_text = raw_text.split("###FEEDBACK###")[0].strip()

    try:
        parsed = json.loads(raw_text)
        raw_text = parsed.get("customer_response", raw_text)
    except (json.JSONDecodeError, AttributeError):
        pass

    return {"customer_response": raw_text, "feedback": None}


def lookup_knowledge_base(scenario: str, query: str) -> str:
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: '{scenario}'. Valid options: {list(SCENARIOS)}")

    system_prompt = load_prompt(SCENARIOS[scenario]["kb"])

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query},
            ],
            max_tokens=512,
            temperature=0.3,
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        print(f"ERROR lookup_knowledge_base LLM call failed: {e}")
        return "I'm having trouble responding right now. Please try again."

    return response.choices[0].message.content.strip()


# --- Evaluation ---

def call_llm(scenario: str, persona: str, training: bool, message: str, history: list[dict]) -> dict:
    if DEBUG_PROMPTS:
        print("🚀 VERSION: ANALYSIS_FIX_V2")

    system_prompt = build_system_prompt(scenario, persona, training)
    system_prompt = append_coaching_signal(system_prompt, history)

    if training:
        system_prompt += f"""

CSR_MESSAGE_TO_EVALUATE (EVALUATE THIS AND ONLY THIS):
\"{message}\"

Your feedback MUST be based exclusively on the text above.
Do NOT reference, draw from, or compare against any other CSR turn in the conversation history."""

    messages = build_messages(history, system_prompt, message)

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
            response_format={"type": "json_object"},
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        print(f"ERROR call_llm LLM call failed: {e}")
        return {"customer_response": "I'm having trouble responding right now. Please try again.", "feedback": None}

    raw_text = response.choices[0].message.content

    _default_analysis = {
        "empathy_score": {"score": 0, "reason": "Fallback applied."},
        "active_listening_score": {"score": 0, "reason": "Fallback applied."},
        "learn_from_this_practice": {
            "area": "Fallback",
            "focus": "Fallback applied due to missing analysis.",
            "why_it_improves_deescalation": "Ensures UI consistency.",
        },
    }

    try:
        parsed = json.loads(raw_text)
        feedback = parsed.get("feedback") if training else None
        if training:
            if not isinstance(feedback, dict):
                feedback = {}
            if "analysis" not in feedback:
                feedback["analysis"] = _default_analysis

        if training and "analysis" not in feedback:
            raise ValueError("ANALYSIS MISSING — SHOULD NEVER HAPPEN")

        if training and isinstance(feedback, dict):
            _enforce_feedback_consistency(feedback, message)

        if DEBUG_PROMPTS:
            print("=== FINAL FEEDBACK ===")
            print(json.dumps(feedback, indent=2))

        return {
            "customer_response": parsed["customer_response"],
            "feedback": feedback,
        }
    except ValueError:
        raise
    except Exception:
        fallback_feedback = {
            "signals": {"empathyFirst": "", "activeListening": ""},
            "nextStep": "",
            "analysis": _default_analysis,
        } if training else None

        if DEBUG_PROMPTS:
            print("=== FINAL FEEDBACK (exception fallback) ===")
            print(json.dumps(fallback_feedback, indent=2))

        return {"customer_response": raw_text.strip(), "feedback": fallback_feedback}


# --- Streaming ---

def stream_llm_response(scenario: str, persona: str, message: str, history: list[dict]):
    """Generator that streams the customer response as plain text for /chat-stream."""
    system_prompt = build_system_prompt(scenario, persona, training=False, stream=True)
    system_prompt = append_coaching_signal(system_prompt, history)

    messages = build_messages(history, system_prompt, message)

    try:
        stream = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            max_tokens=512,
            temperature=0.7,
            stream=True,
            timeout=LLM_TIMEOUT,
        )
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
    except Exception as e:
        print(f"ERROR stream_llm_response failed: {e}")
        yield "I'm having trouble responding right now. Please try again."


# --- Session Reporting ---

def generate_report(history: list[dict]) -> dict:
    """Generate session coaching from conversation history using empathyFirst/activeListening signals."""
    _fallback = {
        "session_coaching": {
            "overallPerformance": "",
            "keepDoing": "",
            "keyPatternToImprove": "",
            "actionableImprovement": "",
            "encouragement": "",
        }
    }

    if not history:
        return _fallback

    turns = []
    for msg in history:
        if msg["role"] == "user" and msg.get("feedback"):
            signals = msg["feedback"].get("signals", {})
            turns.append({
                "csr_message": msg["content"],
                "empathyFirst": signals.get("empathyFirst", ""),
                "activeListening": signals.get("activeListening", ""),
                "nextStep": msg["feedback"].get("nextStep", ""),
            })

    n = len(turns)

    def pct(key, value):
        if n == 0:
            return 0
        return int(sum(1 for t in turns if t[key] == value) / n * 100)

    def describe_weak_moment(turn: dict) -> str:
        ef = turn["empathyFirst"]
        al = turn["activeListening"]
        if ef == "Needs Work" and al == "Needs Work":
            return "response with no emotional acknowledgment and no confirmation of customer issue"
        if ef == "Needs Work":
            return "response that jumps to action or questions without acknowledging customer emotions"
        if ef == "Developing":
            return "response with vague or delayed empathy before addressing the issue"
        if al == "Needs Work":
            return "response that moves forward without confirming or paraphrasing customer concern"
        return "response with partial acknowledgment but insufficient follow-through"

    weak_turns = [t for t in turns if t["empathyFirst"] in ("Needs Work", "Developing")]

    session_summary = {
        "turnCount": n,
        "empathyFirst": {
            "strong": pct("empathyFirst", "Strong"),
            "developing": pct("empathyFirst", "Developing"),
            "needsWork": pct("empathyFirst", "Needs Work"),
        },
        "activeListening": {
            "strong": pct("activeListening", "Strong"),
            "developing": pct("activeListening", "Developing"),
            "needsWork": pct("activeListening", "Needs Work"),
        },
        "weakMoments": [describe_weak_moment(t) for t in weak_turns[:2]],
    }

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": load_evaluation_prompt("session_report")},
                {"role": "user", "content": json.dumps(session_summary)},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            timeout=LLM_TIMEOUT,
        )
        raw = response.choices[0].message.content.strip()
        coaching = json.loads(raw)
        if not isinstance(coaching, dict):
            raise ValueError("LLM response is not a dict")
    except Exception as e:
        print(f"ERROR generate_report LLM call failed: {e}")
        return _fallback

    turn_by_turn = [
        {
            "turn": i + 1,
            "csr_message": t["csr_message"],
            "empathyFirst": t["empathyFirst"],
            "activeListening": t["activeListening"],
            "nextStep": t["nextStep"],
        }
        for i, t in enumerate(turns)
    ]

    return {"session_coaching": coaching, "turn_by_turn": turn_by_turn}
