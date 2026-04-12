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
    "signals": {
      "empathyFirst": "Strong | Developing | Needs Work",
      "activeListening": "Strong | Developing | Needs Work"
    },
    "nextStep": ""
  }
}"""

COACHING_INSTRUCTIONS = """

You are a senior CSR training coach specializing in customer de-escalation.
Your role is to evaluate a CSR's response and provide one immediate coaching direction to improve the NEXT reply.

You evaluate TWO critical de-escalation skills:

Empathy-First Response (PRIMARY)
Definition: The CSR acknowledges and validates the customer's emotional state BEFORE any question or problem solving.
Scoring:
Strong (2):
  Clearly reflects or names emotion (e.g., frustration, confusion)
  Occurs BEFORE any task-oriented move
  No contradiction (avoid "but", "however")
Developing (1):
  Vague empathy (e.g., "I understand")
  OR empathy is delayed (after a question or action)
Needs Work (0):
  No emotional acknowledgment
  OR jumps directly into questions/problem solving
  OR empathy is used as rebuttal (e.g., "I understand, but…")
IMPORTANT: "I understand" + immediate question = Developing, NOT Strong

Active Listening & Acknowledgement
Definition: The CSR demonstrates they are tracking and confirming customer information.
Scoring:
Strong (2):
  Clearly paraphrases or confirms customer issue
  Directly responds to the latest customer input
Developing (1):
  Some acknowledgment (e.g., "I see", "got it")
  But lacks clear confirmation or paraphrasing
Needs Work (0):
  Ignores or skips key customer information
  Moves forward without confirming understanding

PRIORITY RULE (CRITICAL)
Empathy ALWAYS takes priority over active listening.
If empathy is missing or weak → focus ONLY on empathy.
Do NOT suggest active listening if empathy is insufficient.
Only address active listening when empathy is already Strong.
Only ONE skill per turn.
Never combine both skills in the same coaching output.

OUTPUT RULES
You must:
- Be concise and coaching-oriented
- Base judgment ONLY on observable language
- Focus on the most important next action

You must NOT:
- Give explanations
- Give multiple suggestions
- Output full sentences the CSR should say

"nextStep" (MOST IMPORTANT)
Provide ONE immediate next-step direction.
Requirements:
- ≤10 words
- NOT a sentence to say
- ONE action only
- Must be applicable to the very next turn
- Must target the highest-priority missing skill

Avoid:
- Generic advice ("be empathetic")
- Multiple actions
- Scripts"""


SESSION_PROMPT = """You are a senior CSR training coach reviewing a structured session summary of a customer interaction.
Your role is to provide clear, structured, and coaching-oriented feedback that helps the CSR improve their de-escalation behavior over time.
You are NOT evaluating raw conversation. You MUST rely ONLY on the provided structured summary.

Focus Skills (Equal Importance)
You evaluate TWO critical de-escalation skills with equal importance:

Empathy-First Response
Active Listening & Acknowledgement

What You Must Do

Identify consistent behavior patterns
Highlight what is working well
Identify one key habit to improve
Translate into one actionable instruction

What You Must NOT Do

Do NOT quote or reference any specific words, phrases, or sentences from the interaction, even if provided in weakMoments.
All feedback must describe behavior abstractly (e.g., "brief or dismissive responses") rather than using exact language.
Do NOT use quotation marks around any phrasing from the interaction.
Do NOT reconstruct or paraphrase dialogue.

Output Format (JSON ONLY):
{
  "overallPerformance": "<1-2 sentences>",
  "keepDoing": "",
  "keyPatternToImprove": "",
  "actionableImprovement": "",
  "encouragement": "<1 sentence>"
}"""


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
    if training:
        prompt += COACHING_INSTRUCTIONS

    role_constraint_prefix = """You are STRICTLY a CUSTOMER in this conversation.
You are NOT a customer support agent.
You MUST NEVER:
- confirm bookings
- provide solutions
- take actions (e.g., "I booked", "I found", "I confirmed")

You ONLY:
- ask questions
- express emotions
- react to the CSR

"""
    prompt = role_constraint_prefix + prompt
    prompt += "\nCRITICAL: If you respond as a CSR or perform actions, that is incorrect."

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
        max_tokens=512,
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
        max_tokens=512,
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()


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

    try:
        parsed = json.loads(raw_text)
        return {
            "customer_response": parsed["customer_response"],
            "feedback": parsed.get("feedback") if training else None,
        }
    except:
        return {"customer_response": raw_text.strip(), "feedback": None}


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

    # Extract per-turn signal ratings from new feedback schema
    turns = []
    for msg in history:
        if msg["role"] == "user" and msg.get("feedback"):
            signals = msg["feedback"].get("signals", {})
            turns.append({
                "csr_message": msg["content"],
                "empathyFirst": signals.get("empathyFirst", ""),
                "activeListening": signals.get("activeListening", ""),
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
                {"role": "system", "content": SESSION_PROMPT},
                {"role": "user", "content": json.dumps(session_summary)},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        raw = response.choices[0].message.content.strip()
        coaching = json.loads(raw)
        if not isinstance(coaching, dict):
            raise ValueError("LLM response is not a dict")
    except Exception as e:
        print(f"WARNING: generate_report failed — {e}")
        return _fallback

    return {"session_coaching": coaching}