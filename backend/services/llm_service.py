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

RESPONSE_FORMAT_PLAIN = """

RESPONSE FORMAT: You must respond with a valid JSON object and nothing else. No text before or after the JSON. No markdown. Use this exact structure:
{
  "customer_response": "Your in-character reply here (2-4 sentences).",
  "feedback": null
}"""

RESPONSE_FORMAT_TRAINING = """

RESPONSE FORMAT: You must respond with a valid JSON object and nothing else. No text before or after the JSON. No markdown. Use this exact structure:
{
  "customer_response": "Your in-character reply here (2-4 sentences).",
  "feedback": {
    "empathy": true,
    "transparency": false,
    "ownership": true,
    "suggestion": "One concrete sentence on what the trainee could do better or did well."
  }
}

Feedback evaluation rules — assess the CSR's most recent message:
- empathy: Did the trainee acknowledge the customer's feelings, even briefly? Give credit for genuine-sounding concern.
- transparency: Did the trainee give any explanation or hint at next steps, even if incomplete?
- ownership: Did the trainee express any willingness to help or follow up, even without a full commitment?
All four feedback fields are required. customer_response must always be your in-character dialogue only."""


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

    # Append JSON response format instructions (with or without feedback fields)
    prompt += RESPONSE_FORMAT_TRAINING if training else RESPONSE_FORMAT_PLAIN

    return prompt


def build_messages(history: list[dict], system_prompt: str, user_message: str) -> list[dict]:
    """Build chat messages with system prompt prepended."""
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages



def start_conversation(scenario: str, persona: str, training: bool) -> dict:
    """Generate the customer's opening message with no CSR turn yet."""
    system_prompt = build_system_prompt(scenario, persona, training)

    openers = {
        "vc1": "Begin the call. Introduce yourself and state your complaint about the billing issue.",
        "vc2": "Begin the conversation. Introduce yourself and explain that your flight was just cancelled.",
        "vc3": "Begin the conversation. Introduce yourself and explain that your bag has been missing for two days and you need an update.",
        "loan_delay": "Begin the call. Introduce yourself and explain that your loan approval or disbursement has been delayed and you need to know what is happening.",
        "refund_request": "Begin the call. Introduce yourself and explain that you need a refund for a failed or incorrect financial transaction.",
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
        "loan_delay": "kb_loan_delay_prompt.txt",
        "refund_request": "kb_refund_request_prompt.txt",
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
    if not history:
        return {
            "customer_profile": {"name": "Unknown", "emotional_state": "N/A", "core_issue": "Not enough conversation data to generate report", "context": ""},
            "success_criteria": [],
            "performance": {"empathy_score": 0, "transparency_score": 0, "ownership_score": 0, "overall_score": 0, "strengths": [], "critical_mistakes": []},
            "turn_feedback": [],
            "key_learnings": [],
            "recommendations": ["Complete at least one full exchange before ending the session."],
        }

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
        "loan_delay": "Loan Delay",
        "refund_request": "Refund Request",
    }
    domain = domain_labels.get(scenario, scenario.upper())
    mode_label = "Training" if training else "Evaluation"

    user_content = (
        f"Scenario: {scenario.upper()} | Domain: {domain} | Persona: {persona.capitalize()} | Mode: {mode_label}\n\n"
        f"CONVERSATION TRANSCRIPT:\n{transcript}\n\n"
        "Generate the performance report JSON now."
    )

    print(f"\n--- REPORT INPUT ---")
    print(f"History turns received: {len(history)}")
    print(f"Transcript being sent:\n{transcript}")
    print(f"---\n")

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        max_tokens=4096,
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    print(f"\n--- RAW REPORT OUTPUT (length={len(raw)}) ---\n{raw}\n---\n")

    try:
        parsed = json.loads(raw)
        print(f"\n--- PARSED REPORT ---")
        print(f"  customer_profile.name:    {parsed.get('customer_profile', {}).get('name')}")
        print(f"  performance.overall_score:{parsed.get('performance', {}).get('overall_score')}")
        print(f"  turn_feedback count:       {len(parsed.get('turn_feedback', []))}")
        print(f"---\n")
    except json.JSONDecodeError as e:
        print(f"JSON parse error in generate_report: {e}\nRaw output was:\n{raw}")
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

    # Validate required fields are present and warn if missing
    required_checks = [
        ("customer_profile.name", parsed.get("customer_profile", {}).get("name")),
        ("performance.overall_score", parsed.get("performance", {}).get("overall_score")),
        ("turn_feedback", parsed.get("turn_feedback")),
    ]
    for field, value in required_checks:
        if not value and value != 0:
            print(f"WARNING: report field '{field}' is missing or empty")

    return parsed


def call_llm(scenario: str, persona: str, training: bool, message: str, history: list[dict]) -> dict:
    system_prompt = build_system_prompt(scenario, persona, training)
    messages = build_messages(history, system_prompt, message)

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    raw_text = response.choices[0].message.content
    print("\n--- RAW MODEL OUTPUT ---\n", raw_text, "\n---\n")

    try:
        parsed = json.loads(raw_text)
        customer_response = parsed["customer_response"]
        feedback = parsed.get("feedback") if training else None
        print(f"  customer_response: {customer_response[:80]!r}")
        if training:
            print(f"  feedback: {feedback}")
    except (json.JSONDecodeError, KeyError) as e:
        print(f"JSON parse error in call_llm: {e}\nRaw output was:\n{raw_text}")
        customer_response = raw_text.strip()
        feedback = {
            "empathy": False,
            "transparency": False,
            "ownership": False,
            "suggestion": "Could not parse structured response. Review manually.",
        } if training else None

    return {"customer_response": customer_response, "feedback": feedback}
