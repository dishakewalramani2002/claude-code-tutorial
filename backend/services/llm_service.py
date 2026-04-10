import os
import re
import json
from dotenv import load_dotenv
from config import build_client, MODEL_NAME

load_dotenv()

client = build_client()

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")

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

FEEDBACK EVALUATION — assess the CSR's most recent message using these STRICT rules:

SCOPE: You MUST evaluate the ENTIRE CSR message — every sentence, every paragraph. Do NOT stop after the first sentence or paragraph. Scan the full text before assigning any boolean. If an action, apology, or explanation appears ANYWHERE in the message, it counts.

STEP 1 — DETECT PRESENCE (binary). Assign true/false based solely on whether the behavior EXISTS anywhere in the full message, not its quality.

- empathy: true if the message contains ANY apology or emotional acknowledgment.
  Counts as true: "I'm sorry", "I am really sorry", "I apologize", "I understand how frustrating this is".
  Do NOT require personalization, detail, or strong language. Presence alone = true.

- transparency: true if the message contains ANY information, explanation, timeline, status update, or next step — even partial or vague.

- ownership: true ONLY if the CSR explicitly states an action or next step they will take — search the ENTIRE message.
  Counts as true: "I'll check this for you", "Let me look into that", "I'm pulling up your case now", "I'll follow up", "I'm sending this now", "I've authorized...", "I've pulled up...", "I've escalated...".
  If ANY such action appears anywhere in the message, ownership MUST be true — even if buried in a later paragraph.
  Counts as FALSE only if the ENTIRE message contains no action or next step at all.
  CRITICAL: An apology alone, no matter how sincere, MUST NEVER be counted as ownership. Ownership requires an action verb directed at resolving the issue.

STEP 2 — GENERATE COACHING (separate from classification). The suggestion must refine what exists, never deny it.
  - If empathy = true → suggestion may say "make the apology more specific" but MUST NOT say "add an apology" or "show empathy"
  - If transparency = true → suggestion may say "provide more detail" but MUST NOT say "give more information" as if none was given
  - If ownership = true → suggestion may say "be more concrete about next steps" but MUST NOT say "take ownership"

CONSISTENCY RULE: You are NEVER allowed to mark a behavior false and then suggest adding that same behavior. That is a contradiction and is forbidden.

All four feedback fields are required. customer_response must always be your in-character dialogue only."""


def load_prompt(filename: str) -> str:
    path = os.path.join(PROMPTS_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def build_system_prompt(scenario: str, persona: str, training: bool) -> str:
    """
    Build the final system prompt by:
    1. Loading the base scenario persona prompt (character, scenario, resolution criteria)
    2. Stripping any existing feedback block (so we control it dynamically)
    3. Appending the emotion prompt (behavioral dynamics, escalation/de-escalation patterns)
    4. Appending feedback instructions if training=True
    """
    base = load_prompt(f"{scenario}_prompt.txt")

    base = re.sub(
        r"\nAfter each of your responses.*###END###\s*",
        "",
        base,
        flags=re.DOTALL,
    ).strip()

    customer_name = "Avery Collins" if scenario == "loan_delay" and persona == "demanding" else "Alex"
    base = base.replace("{customer_name}", customer_name)

    if scenario == "refund_request" and persona == "angry":
        base = """You are a frustrated customer named George Pan who received a defective premium coffee machine and is demanding a refund.

Context:
- Product: BaristaPro 350 Espresso Machine ($349.99)
- Order #: 59214
- Issue: leaking water and broken steam wand
- Purchased last week via credit card
- Customer has receipt, confirmation, and photos

Behavior:
- You are direct, impatient, and escalate quickly if mishandled
- You push for a FULL refund to the original payment method
- You reject vague responses, store credit, or incorrect info
- You will challenge incorrect details and demand clarity

Conversation rules:
- Start vague: "I received a broken coffee machine"
- Only reveal details when CSR asks
- Responses must be 2–4 sentences max

Escalation:
- If CSR is vague → demand specifics
- If CSR delays → threaten dispute or complaint

De-escalation ONLY if:
- Refund amount exact ($349.99)
- Timeline specific
- Refund method confirmed (original payment)"""

    emotion = load_prompt(f"emotions/{persona}.txt")
    prompt = base + "\n\n" + emotion
    prompt += RESPONSE_FORMAT_TRAINING if training else RESPONSE_FORMAT_PLAIN

    return prompt


def build_messages(history: list[dict], system_prompt: str, user_message: str) -> list[dict]:
    messages = [{"role": "system", "content": system_prompt}]
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


def start_conversation(scenario: str, persona: str, training: bool) -> dict:
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
        max_completion_tokens=512,
        temperature=0.7,
    )

    raw_text = response.choices[0].message.content.strip()
    raw_text = re.sub(r"###FEEDBACK###.*", "", raw_text, flags=re.DOTALL).strip()

    # LLM may return JSON even for the opener (system prompt instructs it to)
    try:
        parsed = json.loads(raw_text)
        raw_text = parsed.get("customer_response", raw_text)
    except (json.JSONDecodeError, AttributeError):
        pass

    return {"customer_response": raw_text, "feedback": None}


def lookup_knowledge_base(scenario: str, query: str) -> str:
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
        max_completion_tokens=512,
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()


def call_llm(scenario: str, persona: str, training: bool, message: str, history: list[dict]) -> dict:
    system_prompt = build_system_prompt(scenario, persona, training)
    messages = build_messages(history, system_prompt, message)

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        max_completion_tokens=1024,
        temperature=0.7,
        response_format={"type": "json_object"},
    )

    raw_text = response.choices[0].message.content

    try:
        parsed = json.loads(raw_text)
        return {
            "customer_response": parsed["customer_response"],
            "feedback": parsed.get("feedback") if training else None,
        }
    except:
        return {"customer_response": raw_text.strip(), "feedback": None}


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

    # Build authoritative turn data and full transcript for context
    turn_data = []
    transcript_lines = []
    for msg in history:
        role_label = "Customer" if msg["role"] == "assistant" else "CSR"
        transcript_lines.append(f"[{role_label}]: {msg['content']}")
        if msg["role"] == "user" and msg.get("feedback"):
            fb = msg["feedback"]
            turn_data.append({
                "csr_message": msg["content"],
                "empathy": fb.get("empathy"),
                "transparency": fb.get("transparency"),
                "ownership": fb.get("ownership"),
            })

    transcript = "\n".join(transcript_lines)

    # Compute scores deterministically in Python — never delegated to the LLM
    n = len(turn_data)
    if n > 0:
        empathy_score      = int(sum(1 for f in turn_data if f.get("empathy"))      / n * 100)
        transparency_score = int(sum(1 for f in turn_data if f.get("transparency")) / n * 100)
        ownership_score    = int(sum(1 for f in turn_data if f.get("ownership"))    / n * 100)
    else:
        empathy_score = transparency_score = ownership_score = 0
    overall_score = int((empathy_score + transparency_score + ownership_score) / 3)

    computed_scores = {
        "empathy_score": empathy_score,
        "transparency_score": transparency_score,
        "ownership_score": ownership_score,
        "overall_score": overall_score,
    }

    # Strip booleans from what the LLM sees — it only needs message text to write coaching notes
    turn_data_for_llm = [{"index": i, "csr_message": td["csr_message"]} for i, td in enumerate(turn_data)]

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
        f"TURN_DATA:\n{json.dumps(turn_data_for_llm, indent=2)}\n\n"
        f"PRE-COMPUTED SCORES (use these exact values — do NOT recalculate):\n{json.dumps(computed_scores, indent=2)}\n\n"
        f"CONVERSATION TRANSCRIPT (for qualitative context only):\n{transcript}\n\n"
        "Generate the performance report JSON now."
    )

    print(f"\n--- REPORT INPUT ---")
    print(f"History turns: {len(history)} | Scored CSR turns: {n}")
    print(f"Computed scores: {json.dumps(computed_scores)}")
    print(f"---\n")

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        max_completion_tokens=4096,
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"JSON parse error in generate_report: {e}")
        return {
            "customer_profile": {"name": "Unknown", "emotional_state": "N/A", "core_issue": "N/A", "context": ""},
            "success_criteria": [],
            "performance": {"empathy_score": 0, "transparency_score": 0, "ownership_score": 0, "overall_score": 0, "strengths": [], "critical_mistakes": []},
            "turn_feedback": [],
            "key_learnings": [],
            "recommendations": ["Report generation failed. Please review the conversation manually."],
        }

    # Enforce computed scores — overwrite whatever the LLM produced
    if "performance" not in parsed:
        parsed["performance"] = {}
    parsed["performance"].update(computed_scores)

    # Build turn_feedback entirely from backend truth — LLM only contributes coaching_notes
    coaching_notes = parsed.get("coaching_notes", [])
    fallback_note = "Focus on making the response more specific and aligned with the customer's needs."
    assembled_turns = []
    for i, td in enumerate(turn_data):
        assembled_turns.append({
            "csr_message": td["csr_message"],
            "empathy":      td["empathy"],
            "transparency": td["transparency"],
            "ownership":    td["ownership"],
            "coaching_note": coaching_notes[i] if i < len(coaching_notes) else fallback_note,
        })
    parsed["turn_feedback"] = assembled_turns

    print(f"\n--- ENFORCED REPORT ---")
    print(f"  scores: {json.dumps(computed_scores)}")
    print(f"  turn_feedback count: {len(assembled_turns)}")
    print(f"---\n")

    return parsed