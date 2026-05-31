import os
import json
import time
from dotenv import load_dotenv
from config import build_client, MODEL_NAME
from llm_settings import CUSTOMER_SETTINGS, FEEDBACK_SETTINGS, REPORT_SETTINGS

# --- Client Setup ---

LLM_TIMEOUT = 15
DEBUG_PROMPTS = os.getenv("DEBUG_PROMPTS", "false").lower() == "true"
DEBUG_LATENCY = os.getenv("DEBUG_LATENCY", "false").lower() == "true"

load_dotenv()

client = build_client()

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")

SCENARIOS = {
    "flight_cancellation": {
        "file": "flight_cancellation",
        "opener": "flight_cancellation",
    },
    "baggage_delay": {
        "file": "baggage_delay",
        "opener": "baggage_delay",
    },
    "loan_delay": {
        "file": "loan_delay",
        "opener": "loan_delay",
    },
    "refund_request": {
        "file": "refund_request",
        "opener": "refund_request",
    },
}


# --- Latency Logging ---

def _log_latency(fn_name: str, fields: dict) -> None:
    if not DEBUG_LATENCY:
        return
    lines = [f"[LATENCY] {fn_name}"]
    for key, value in fields.items():
        lines.append(f"{key}={value}")
    print("\n".join(lines))


def _log_pipeline_error(layer: str, exc: Exception) -> None:
    print(f"[PIPELINE ERROR]\nlayer={layer}\nerror={type(exc).__name__}: {exc}")


def _extract_usage(response) -> dict:
    usage = getattr(response, "usage", None)
    if usage is None:
        return {}
    return {
        "input_tokens": getattr(usage, "prompt_tokens", "N/A"),
        "output_tokens": getattr(usage, "completion_tokens", "N/A"),
        "total_tokens": getattr(usage, "total_tokens", "N/A"),
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
    from services.prompt_metadata import strip_portal_data
    raw = load_prompt(f"scenarios/{SCENARIOS[scenario]['file']}.txt")
    return strip_portal_data(raw)


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

    print(f"DEBUG _enforce_feedback_consistency PRE-REPAIR analysis: {json.dumps(analysis)}")

    # --- Flat-reason migration ---
    # The model sometimes returns a single analysis.reason string instead of
    # nesting it inside empathy_score and active_listening_score.  Migrate it
    # into both skill dicts before the coercion loop runs, so the explanation
    # is not lost when the scalar score fields are promoted to dicts.
    flat_reason = analysis.pop("reason", None)
    if flat_reason:
        # Only write into skill dicts if they don't already carry their own reason.
        # At this point the skill fields may be scalars (e.g. 0) or dicts or absent.
        for key in ("empathy_score", "active_listening_score"):
            existing = analysis.get(key)
            if not isinstance(existing, dict):
                # Will be coerced to {} below; seed it now so the reason survives.
                analysis[key] = {"reason": flat_reason}
            else:
                existing.setdefault("reason", flat_reason)

    # --- Minimal message rule ---
    if len(csr_message.strip().split()) <= 4:
        signals["empathyFirst"] = "Needs Work"
        signals["activeListening"] = "Needs Work"

    empathy = signals.get("empathyFirst", "Needs Work")
    al = signals.get("activeListening", "Needs Work")

    # --- Scalar coercion ---
    # The model occasionally returns "empathy_score": 0 instead of a dict,
    # which causes TypeError on subscript assignment.  Any non-dict value that
    # wasn't already replaced above becomes {}.
    for key in ("empathy_score", "active_listening_score", "learn_from_this_practice"):
        if not isinstance(analysis.get(key), dict):
            analysis[key] = {}

    # Numeric scores must exactly match signal labels (always overwrite — enforcement)
    analysis["empathy_score"]["score"] = _LABEL_TO_SCORE.get(empathy, 0)
    analysis["active_listening_score"]["score"] = _LABEL_TO_SCORE.get(al, 0)

    # Fill in required sub-fields only when absent — never overwrite valid model content
    analysis["empathy_score"].setdefault("reason", "")
    analysis["active_listening_score"].setdefault("reason", "")
    lp = analysis["learn_from_this_practice"]
    lp.setdefault("area", "")
    lp.setdefault("focus", "")
    lp.setdefault("why_it_improves_deescalation", "")

    print(f"DEBUG _enforce_feedback_consistency POST-REPAIR analysis: {json.dumps(analysis)}")


# --- Conversation Generation ---

def start_conversation(scenario: str, persona: str, training: bool) -> dict:
    t_start = time.perf_counter()

    system_prompt = build_system_prompt(scenario, persona, training)
    opener = load_opener(scenario)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": opener},
    ]

    system_prompt_chars = len(system_prompt)
    payload_chars = sum(len(m["content"]) for m in messages)

    t_llm_start = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            **CUSTOMER_SETTINGS,
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        print(f"ERROR start_conversation LLM call failed: {e}")
        return {"customer_response": "I'm having trouble responding right now. Please try again.", "feedback": None}
    t_llm_end = time.perf_counter()

    raw_text = response.choices[0].message.content.strip()
    if "###FEEDBACK###" in raw_text:
        raw_text = raw_text.split("###FEEDBACK###")[0].strip()

    try:
        parsed = json.loads(raw_text)
        raw_text = parsed.get("customer_response", raw_text)
    except (json.JSONDecodeError, AttributeError):
        pass

    _log_latency("start_conversation", {
        "model": MODEL_NAME,
        "scenario": scenario,
        "persona": persona,
        "training": str(training).lower(),
        "messages": len(messages),
        "history_turns": 0,
        "system_prompt_chars": system_prompt_chars,
        "payload_chars": payload_chars,
        "llm_time": f"{t_llm_end - t_llm_start:.2f}s",
        "total_time": f"{time.perf_counter() - t_start:.2f}s",
    })

    return {"customer_response": raw_text, "feedback": None}


# --- Evaluation Pipeline ---

def _extract_latest_customer_utterance(history: list[dict]) -> tuple[str, list[dict]]:
    for i in range(len(history) - 1, -1, -1):
        if history[i]["role"] == "assistant":
            return history[i]["content"], history[:i]
    return "", []


def _build_history_text(history: list[dict]) -> str:
    turns = []
    i = 0
    turn_num = 1
    while i < len(history):
        customer_msg = None
        csr_msg = None
        if i < len(history) and history[i]["role"] == "assistant":
            customer_msg = history[i]["content"]
            i += 1
        if i < len(history) and history[i]["role"] == "user":
            csr_msg = history[i]["content"]
            i += 1
        if customer_msg or csr_msg:
            parts = [f"[Turn {turn_num}]"]
            if customer_msg:
                parts.append(f"Customer: {customer_msg}")
            if csr_msg:
                parts.append(f"CSR: {csr_msg}")
            turns.append("\n".join(parts))
            turn_num += 1
    return "\n\n".join(turns)


def _run_evaluation_pipeline(customer_msg: str, csr_msg: str, prior_history: list[dict]) -> dict:
    history_text = _build_history_text(prior_history)
    t_pipeline = time.perf_counter()

    l1_parts = [
        f'Latest customer utterance: "{customer_msg}"',
        f'CSR\'s current utterance: "{csr_msg}"',
    ]
    if history_text:
        l1_parts.append(f"\nRecent prior turns:\n{history_text}")
    l1_input = "\n".join(l1_parts)

    l1_system = load_evaluation_prompt("layer1_stage_identifier")
    _log_latency("layer1_context", {
        "customer_msg_chars": len(customer_msg),
        "csr_msg_chars": len(csr_msg),
        "history_chars": len(history_text),
    })
    t_l1_api = time.perf_counter()
    try:
        l1_resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": l1_system}, {"role": "user", "content": l1_input}],
            **FEEDBACK_SETTINGS,
            response_format={"type": "json_object"},
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        _log_pipeline_error("layer1", e)
        raise
    t_l1_api_end = time.perf_counter()
    t_l1_parse = time.perf_counter()
    l1_raw = l1_resp.choices[0].message.content
    l1_output = json.loads(l1_raw)
    t_l1_parse_end = time.perf_counter()
    l1_usage = _extract_usage(l1_resp)
    _log_latency("layer1", {
        "input_chars": len(l1_system) + len(l1_input),
        "output_chars": len(l1_raw),
        **l1_usage,
        "api_time": f"{t_l1_api_end - t_l1_api:.2f}s",
        "json_parse_time": f"{t_l1_parse_end - t_l1_parse:.2f}s",
        "time": f"{t_l1_parse_end - t_l1_api:.2f}s",
    })

    if DEBUG_PROMPTS:
        print("=== LAYER 1 OUTPUT ===")
        print(json.dumps(l1_output, indent=2))

    l2_input = l1_input + f"\n\nLayer 1 output:\n{json.dumps(l1_output, indent=2)}"
    l2_system = load_evaluation_prompt("layer2_skill_evaluator")
    _log_latency("layer2_context", {
        "customer_msg_chars": len(customer_msg),
        "csr_msg_chars": len(csr_msg),
        "history_chars": len(history_text),
    })
    t_l2_api = time.perf_counter()
    try:
        l2_resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": l2_system}, {"role": "user", "content": l2_input}],
            **FEEDBACK_SETTINGS,
            response_format={"type": "json_object"},
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        _log_pipeline_error("layer2", e)
        raise
    t_l2_api_end = time.perf_counter()
    t_l2_parse = time.perf_counter()
    l2_raw = l2_resp.choices[0].message.content
    l2_output = json.loads(l2_raw)
    t_l2_parse_end = time.perf_counter()
    l2_usage = _extract_usage(l2_resp)
    _log_latency("layer2", {
        "input_chars": len(l2_system) + len(l2_input),
        "output_chars": len(l2_raw),
        **l2_usage,
        "api_time": f"{t_l2_api_end - t_l2_api:.2f}s",
        "json_parse_time": f"{t_l2_parse_end - t_l2_parse:.2f}s",
        "time": f"{t_l2_parse_end - t_l2_api:.2f}s",
    })

    if DEBUG_PROMPTS:
        print("=== LAYER 2 OUTPUT ===")
        print(json.dumps(l2_output, indent=2))

    l3_input = l2_input + f"\n\nLayer 2 output:\n{json.dumps(l2_output, indent=2)}"
    l3_system = load_evaluation_prompt("layer3_feedback_generator")
    _log_latency("layer3_context", {
        "customer_msg_chars": len(customer_msg),
        "csr_msg_chars": len(csr_msg),
        "history_chars": len(history_text),
    })
    t_l3_api = time.perf_counter()
    try:
        l3_resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "system", "content": l3_system}, {"role": "user", "content": l3_input}],
            **FEEDBACK_SETTINGS,
            response_format={"type": "json_object"},
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        _log_pipeline_error("layer3", e)
        raise
    t_l3_api_end = time.perf_counter()
    t_l3_parse = time.perf_counter()
    l3_raw = l3_resp.choices[0].message.content
    l3_output = json.loads(l3_raw)
    t_l3_parse_end = time.perf_counter()
    l3_usage = _extract_usage(l3_resp)
    _log_latency("layer3", {
        "input_chars": len(l3_system) + len(l3_input),
        "output_chars": len(l3_raw),
        **l3_usage,
        "api_time": f"{t_l3_api_end - t_l3_api:.2f}s",
        "json_parse_time": f"{t_l3_parse_end - t_l3_parse:.2f}s",
        "time": f"{t_l3_parse_end - t_l3_api:.2f}s",
    })

    if DEBUG_PROMPTS:
        print("=== LAYER 3 OUTPUT ===")
        print(json.dumps(l3_output, indent=2))

    _log_latency("evaluation_pipeline", {
        "input_tokens": (l1_usage.get("input_tokens") or 0) + (l2_usage.get("input_tokens") or 0) + (l3_usage.get("input_tokens") or 0),
        "output_tokens": (l1_usage.get("output_tokens") or 0) + (l2_usage.get("output_tokens") or 0) + (l3_usage.get("output_tokens") or 0),
        "total_tokens": (l1_usage.get("total_tokens") or 0) + (l2_usage.get("total_tokens") or 0) + (l3_usage.get("total_tokens") or 0),
        "time": f"{time.perf_counter() - t_pipeline:.2f}s",
    })

    return {
        "signals": {
            "empathyFirst": l2_output["empathy_score"]["label"],
            "activeListening": l2_output["active_listening_score"]["label"],
        },
        "nextStep": l3_output["learn_from_this_practice"]["focus"],
        "analysis": {
            "empathy_score": l3_output["empathy_score"],
            "active_listening_score": l3_output["active_listening_score"],
            "learn_from_this_practice": l3_output["learn_from_this_practice"],
        },
    }


# --- Evaluation ---

def call_llm(scenario: str, persona: str, training: bool, message: str, history: list[dict]) -> dict:
    t_start = time.perf_counter()

    if DEBUG_PROMPTS:
        print("🚀 VERSION: 3LAYER_PIPELINE_V1")

    system_prompt = build_system_prompt(scenario, persona, training)
    system_prompt = append_coaching_signal(system_prompt, history)

    messages = build_messages(history, system_prompt, message)

    payload_chars = sum(len(m["content"]) for m in messages)

    _log_latency("history", {
        "turns": sum(1 for m in history if m["role"] == "assistant"),
        "messages": len(history),
        "chars": sum(len(m.get("content", "")) for m in history),
    })

    t_llm_start = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            **CUSTOMER_SETTINGS,
            response_format={"type": "json_object"},
            timeout=LLM_TIMEOUT,
        )
    except Exception as e:
        print(f"ERROR call_llm customer call failed: {type(e).__name__}: {e}")
        return {"customer_response": "I'm having trouble responding right now. Please try again.", "feedback": None}
    t_llm_end = time.perf_counter()

    raw_text = response.choices[0].message.content.strip()
    _customer_usage = _extract_usage(response)
    _log_latency("customer_response", {
        "input_chars": payload_chars,
        "output_chars": len(raw_text),
        **_customer_usage,
        "time": f"{t_llm_end - t_llm_start:.2f}s",
    })

    try:
        parsed = json.loads(raw_text)
        customer_response = parsed.get("customer_response", raw_text)
    except (json.JSONDecodeError, AttributeError):
        customer_response = raw_text

    if not training:
        _log_latency("request_total", {"time": f"{time.perf_counter() - t_start:.2f}s"})
        return {"customer_response": customer_response, "feedback": None}

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
        customer_msg, prior_history = _extract_latest_customer_utterance(history)
        t_pipeline_start = time.perf_counter()
        feedback = _run_evaluation_pipeline(customer_msg, message, prior_history)
        t_enforce_start = time.perf_counter()
        _enforce_feedback_consistency(feedback, message)
        t_enforce_end = time.perf_counter()

        _log_latency("enforcement", {"time": f"{t_enforce_end - t_enforce_start:.2f}s"})
        _log_latency("evaluation_pipeline_total", {"time": f"{t_enforce_end - t_pipeline_start:.2f}s"})

        if DEBUG_PROMPTS:
            print("=== FINAL FEEDBACK ===")
            print(json.dumps(feedback, indent=2))
    except Exception as e:
        print(f"ERROR call_llm evaluation pipeline failed: {type(e).__name__}: {e}")
        feedback = {
            "signals": {"empathyFirst": "Needs Work", "activeListening": "Needs Work"},
            "nextStep": "",
            "analysis": _default_analysis,
        }

    _log_latency("request_total", {"time": f"{time.perf_counter() - t_start:.2f}s"})
    return {"customer_response": customer_response, "feedback": feedback}


# --- Streaming ---

def stream_llm_response(scenario: str, persona: str, message: str, history: list[dict]):
    """Generator that streams the customer response as plain text for /chat-stream."""
    t_start = time.perf_counter()

    system_prompt = build_system_prompt(scenario, persona, training=False, stream=True)
    system_prompt = append_coaching_signal(system_prompt, history)

    messages = build_messages(history, system_prompt, message)

    system_prompt_chars = len(system_prompt)
    payload_chars = sum(len(m["content"]) for m in messages)

    try:
        t_api_start = time.perf_counter()
        stream = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            **CUSTOMER_SETTINGS,
            stream=True,
            timeout=LLM_TIMEOUT,
        )

        full_response = ""
        t_first_token = None

        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                if t_first_token is None:
                    t_first_token = time.perf_counter()
                full_response += content
                yield content

        t_end = time.perf_counter()
        _log_latency("stream_llm_response", {
            "model": MODEL_NAME,
            "scenario": scenario,
            "persona": persona,
            "training": "false",
            "messages": len(messages),
            "history_turns": len(history),
            "system_prompt_chars": system_prompt_chars,
            "payload_chars": payload_chars,
            "time_to_first_token": f"{t_first_token - t_api_start:.2f}s" if t_first_token else "N/A",
            "stream_duration": f"{t_end - t_api_start:.2f}s",
            "response_chars": len(full_response),
            "total_time": f"{t_end - t_start:.2f}s",
        })
    except Exception as e:
        print(f"ERROR stream_llm_response failed: {e}")
        yield "I'm having trouble responding right now. Please try again."


# --- Session Reporting ---

def generate_report(history: list[dict]) -> dict:
    """Generate session coaching from conversation history using empathyFirst/activeListening signals."""
    t_start = time.perf_counter()

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

    report_prompt = load_evaluation_prompt("session_report")
    session_payload = json.dumps(session_summary)
    system_prompt_chars = len(report_prompt)
    payload_chars = system_prompt_chars + len(session_payload)

    t_llm_start = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": report_prompt},
                {"role": "user", "content": session_payload},
            ],
            response_format={"type": "json_object"},
            **REPORT_SETTINGS,
            timeout=LLM_TIMEOUT,
        )
        raw = response.choices[0].message.content.strip()
        coaching = json.loads(raw)
        if not isinstance(coaching, dict):
            raise ValueError("LLM response is not a dict")
    except Exception as e:
        print(f"ERROR generate_report LLM call failed: {e}")
        return _fallback
    t_llm_end = time.perf_counter()

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

    _log_latency("generate_report", {
        "model": MODEL_NAME,
        "history_turns": n,
        "messages": 2,
        "system_prompt_chars": system_prompt_chars,
        "payload_chars": payload_chars,
        "llm_time": f"{t_llm_end - t_llm_start:.2f}s",
        "total_time": f"{time.perf_counter() - t_start:.2f}s",
    })

    return {"session_coaching": coaching, "turn_by_turn": turn_by_turn}
