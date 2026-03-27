import os
import re
import json
from dotenv import load_dotenv
from config import build_client, MODEL_NAME

load_dotenv()

client = build_client()

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")


def load_prompt(filename: str) -> str:
    path = os.path.join(PROMPTS_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def build_messages(history: list[dict], system_prompt: str, user_message: str) -> list[dict]:
    """Build chat messages with system prompt prepended."""
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


def parse_vc1_response(raw: str) -> tuple[str, dict | None]:
    """
    Split the VC1 response into customer_response and feedback dict.
    Expects ###FEEDBACK### ... ###END### block appended by the model.
    """
    feedback = None
    customer_response = raw.strip()

    match = re.search(r"###FEEDBACK###\s*(\{.*?\})\s*(?:###END###)?", raw, re.DOTALL)
    if match:
        customer_response = raw[: match.start()].strip()
        try:
            feedback = json.loads(match.group(1))
        except json.JSONDecodeError:
            feedback = {
                "empathy": False,
                "transparency": False,
                "ownership": False,
                "suggestion": "Could not parse feedback from model response.",
            }

    return customer_response, feedback


def start_conversation(mode: str) -> dict:
    """Generate the customer's opening message with no CSR turn yet."""
    if mode == "vc1":
        system_prompt = load_prompt("vc1_prompt.txt")
        opener = "Begin the call. Introduce yourself and state your complaint."
    else:
        system_prompt = load_prompt("vc2_prompt.txt")
        opener = "Begin the conversation. Introduce yourself and explain the situation."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": opener},
    ]
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        max_tokens=512,
        temperature=0.7,
    )
    raw_text = response.choices[0].message.content

    # Strip any feedback block that leaks into the opener
    raw_text = re.sub(r"###FEEDBACK###.*", "", raw_text, flags=re.DOTALL).strip()

    return {"customer_response": raw_text, "feedback": None}


def lookup_knowledge_base(mode: str, query: str) -> str:
    """Answer a CSR's internal knowledge base query."""
    if mode == "vc1":
        system_prompt = load_prompt("kb_vc1_prompt.txt")
    else:
        system_prompt = load_prompt("kb_vc2_prompt.txt")

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
        max_tokens=512,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


def generate_report(mode: str, history: list[dict]) -> dict:
    """Generate a full session performance report from the conversation history."""
    system_prompt = load_prompt("report_prompt.txt")

    # Build a readable transcript with any existing per-turn feedback
    transcript_lines = []
    for msg in history:
        role = "Customer" if msg["role"] == "assistant" else "CSR"
        transcript_lines.append(f"[{role}]: {msg['content']}")
        if msg.get("feedback") and msg["role"] == "user":
            fb = msg["feedback"]
            transcript_lines.append(
                f"  (Collected feedback — empathy: {fb.get('empathy')}, "
                f"transparency: {fb.get('transparency')}, "
                f"ownership: {fb.get('ownership')})"
            )

    transcript = "\n".join(transcript_lines)
    domain = "Health Insurance Billing" if mode == "vc1" else "Flight Cancellation"
    user_content = (
        f"Mode: {mode.upper()} | Domain: {domain}\n\n"
        f"CONVERSATION TRANSCRIPT:\n{transcript}\n\n"
        "Generate the performance report JSON now."
    )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        max_tokens=2048,
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()
    # Strip markdown code fences if model wraps in them
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Return a minimal fallback so the frontend doesn't crash
        return {
            "customer_profile": {"name": "Unknown", "emotional_state": "N/A", "core_issue": "N/A", "context": ""},
            "success_criteria": [],
            "performance": {"empathy_score": 0, "transparency_score": 0, "ownership_score": 0, "overall_score": 0, "strengths": [], "critical_mistakes": []},
            "turn_feedback": [],
            "key_learnings": [],
            "recommendations": ["Report generation failed. Please review the conversation manually."],
        }


def call_llm(mode: str, message: str, history: list[dict]) -> dict:
    if mode == "vc1":
        system_prompt = load_prompt("vc1_prompt.txt")
    elif mode == "vc2":
        system_prompt = load_prompt("vc2_prompt.txt")
    else:
        raise ValueError(f"Unknown mode: {mode}")

    messages = build_messages(history, system_prompt, message)

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )

    raw_text = response.choices[0].message.content
    print("\n--- RAW MODEL OUTPUT ---\n", raw_text, "\n---\n")

    if mode == "vc1":
        customer_response, feedback = parse_vc1_response(raw_text)
        # If model skipped the feedback block, return a fallback so the UI always shows something
        if feedback is None:
            feedback = {
                "empathy": False,
                "transparency": False,
                "ownership": False,
                "suggestion": "The model did not return structured feedback for this turn. Review the response manually.",
            }
    else:
        customer_response = raw_text.strip()
        feedback = None

    return {"customer_response": customer_response, "feedback": feedback}
