import os
import re
import json
from dotenv import load_dotenv
from config import build_client, MODEL_NAME

load_dotenv()

client = build_client()

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")

PERSONA_STYLES = {
    "angry": (
        "EMOTIONAL STYLE FOR THIS CALL: You are intensely frustrated and angry. "
        "You may be curt, make accusations, and demand immediate action. "
        "You are at the edge of your patience. However, you will calm down if the agent genuinely helps you."
    ),
    "confused": (
        "EMOTIONAL STYLE FOR THIS CALL: You are overwhelmed and confused by the whole situation. "
        "You frequently ask for clarification, struggle with technical terms, and need things explained simply. "
        "You are not hostile — just lost and in need of clear, step-by-step guidance."
    ),
    "demanding": (
        "EMOTIONAL STYLE FOR THIS CALL: You are composed but extremely demanding. "
        "You know exactly what outcome you want and you push firmly for it. "
        "You are impatient with process or delays and escalate quickly if the agent cannot deliver results."
    ),
    "anxious": (
        "EMOTIONAL STYLE FOR THIS CALL: You are anxious and worried, prone to catastrophizing. "
        "You ask many 'what if' questions and need frequent reassurance. "
        "You are polite but clearly distressed and need the agent to be calm, reassuring, and specific."
    ),
}

FEEDBACK_BLOCK_INSTRUCTIONS = """

After each of your responses, you MUST append a JSON block on a new line that evaluates the CSR trainee's most recent message. Use this exact format:

###FEEDBACK###
{
  "empathy": true or false,
  "transparency": true or false,
  "ownership": true or false,
  "suggestion": "One concrete sentence on what the trainee could do better or did well."
}
###END###

Empathy: Did the trainee acknowledge your feelings or frustration in any way, even briefly? Give credit for genuine-sounding concern.
Transparency: Did the trainee give some explanation or hint at next steps, even if incomplete? Give credit for partial clarity.
Ownership: Did the trainee express any willingness to help or follow up, even without a full commitment? Give credit for effort.

Keep your in-character customer dialogue to 2-4 sentences. Begin each reply with your in-character customer dialogue, then the feedback block."""


def load_prompt(filename: str) -> str:
    path = os.path.join(PROMPTS_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def build_system_prompt(scenario: str, persona: str, training: bool) -> str:
    """
    Build the final system prompt by:
    1. Loading the base scenario prompt
    2. Stripping any existing feedback block (so we control it dynamically)
    3. Appending the persona emotional style
    4. Appending feedback instructions if training=True
    """
    base = load_prompt(f"{scenario}_prompt.txt")

    # Strip any existing feedback block instructions so we control them dynamically
    # (vc1_prompt.txt has them baked in; we remove and re-add conditionally)
    base = re.sub(
        r"\nAfter each of your responses.*###END###\s*",
        "",
        base,
        flags=re.DOTALL,
    ).strip()

    # Append persona emotional style
    prompt = base + "\n\n" + PERSONA_STYLES[persona]

    # Append training feedback instructions if needed
    if training:
        prompt += FEEDBACK_BLOCK_INSTRUCTIONS

    return prompt


def build_messages(history: list[dict], system_prompt: str, user_message: str) -> list[dict]:
    """Build chat messages with system prompt prepended."""
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


def parse_feedback_response(raw: str) -> tuple[str, dict | None]:
    """
    Split a response into customer_response and feedback dict.
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


def start_conversation(scenario: str, persona: str, training: bool) -> dict:
    """Generate the customer's opening message with no CSR turn yet."""
    system_prompt = build_system_prompt(scenario, persona, training)

    openers = {
        "vc1": "Begin the call. Introduce yourself and state your complaint about the billing issue.",
        "vc2": "Begin the conversation. Introduce yourself and explain that your flight was just cancelled.",
        "vc3": "Begin the conversation. Introduce yourself and explain that your bag has been missing for two days and you need an update.",
    }
    opener = openers[scenario]

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


def lookup_knowledge_base(scenario: str, query: str) -> str:
    """Answer a CSR's internal knowledge base query."""
    kb_prompts = {
        "vc1": "kb_vc1_prompt.txt",
        "vc2": "kb_vc2_prompt.txt",
        "vc3": "kb_vc3_prompt.txt",
    }
    system_prompt = load_prompt(kb_prompts[scenario])

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


def generate_report(scenario: str, persona: str, training: bool, history: list[dict]) -> dict:
    """Generate a full session performance report from the conversation history."""
    system_prompt = load_prompt("report_prompt.txt")

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

    domain_labels = {
        "vc1": "Health Insurance Billing",
        "vc2": "Flight Cancellation",
        "vc3": "Lost Baggage",
    }
    domain = domain_labels.get(scenario, scenario.upper())
    mode_label = "Training" if training else "Evaluation"

    user_content = (
        f"Scenario: {scenario.upper()} | Domain: {domain} | Persona: {persona.capitalize()} | Mode: {mode_label}\n\n"
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
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "customer_profile": {"name": "Unknown", "emotional_state": "N/A", "core_issue": "N/A", "context": ""},
            "success_criteria": [],
            "performance": {
                "empathy_score": 0, "transparency_score": 0, "ownership_score": 0,
                "overall_score": 0, "strengths": [], "critical_mistakes": [],
            },
            "turn_feedback": [],
            "key_learnings": [],
            "recommendations": ["Report generation failed. Please review the conversation manually."],
        }


def call_llm(scenario: str, persona: str, training: bool, message: str, history: list[dict]) -> dict:
    system_prompt = build_system_prompt(scenario, persona, training)
    messages = build_messages(history, system_prompt, message)

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )

    raw_text = response.choices[0].message.content
    print("\n--- RAW MODEL OUTPUT ---\n", raw_text, "\n---\n")

    if training:
        customer_response, feedback = parse_feedback_response(raw_text)
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
