import os
import re
import json
from dotenv import load_dotenv
from config import build_client, MODEL_NAME

LLM_TIMEOUT = 15  # seconds

load_dotenv()

client = build_client()

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "prompts")

RESPONSE_FORMAT_PLAIN = """

RESPONSE FORMAT: You must respond with a valid JSON object and nothing else. No text before or after the JSON. No markdown. Use this exact structure:
{
  "customer_response": "Your in-character reply here (2-4 sentences).",
  "feedback": null
}"""

RESPONSE_FORMAT_STREAM = """

Respond naturally in character. Plain conversational text only — no JSON, no formatting. 2–4 sentences."""

RESPONSE_FORMAT_TRAINING = """

RESPONSE FORMAT: You must respond with a valid JSON object and nothing else. No text before or after the JSON. No markdown. Use this exact structure:
The "analysis" field is REQUIRED in every response. You MUST always include it. Do not omit it under any circumstances.
{
  "customer_response": "Your in-character reply here (2-4 sentences).",
  "feedback": {
    "signals": {
      "empathyFirst": "Strong | Developing | Needs Work",
      "activeListening": "Strong | Developing | Needs Work"
    },
    "nextStep": "",
    "analysis": {
      "empathy_score": {
        "score": 0,
        "reason": "One sentence explaining the score."
      },
      "active_listening_score": {
        "score": 0,
        "reason": "One sentence explaining the score."
      },
      "learn_from_this_practice": {
        "area": "Short area name",
        "focus": "One sentence on what the CSR should focus on or avoid doing in the future.",
        "why_it_improves_deescalation": "One sentence explaining why this helps de-escalation using a real communication principle."
      }
    }
  }
}"""

COACHING_INSTRUCTIONS = """

You are a senior CSR training coach specializing in customer de-escalation.
Your role is to evaluate a CSR's response and provide one immediate coaching direction to improve the NEXT reply.

CRITICAL FAILURE CASES (HIGHEST PRIORITY — APPLY BEFORE ALL OTHER RULES)
If the CSR response meets ANY of the following conditions:
- Is extremely short (e.g., "ok", "sure", "ok bye")
- Is fewer than 5 words
- Does not reference the customer's issue at all
- Does not acknowledge any emotion or emotional state
- Is dismissive or ends the conversation without resolution
Then you MUST assign "empathyFirst": "Needs Work" and "activeListening": "Needs Work".
This rule OVERRIDES all scoring definitions below. Do NOT proceed to rubric evaluation if this case applies.

You evaluate TWO critical de-escalation skills:

Empathy-First Response (PRIMARY)
Definition: The CSR acknowledges and validates the customer's emotional state BEFORE any question or problem solving.
Scoring:
Strong (2):
  Clearly reflects or names emotion (e.g., frustration, confusion, stress, disappointment)
  Occurs BEFORE any task-oriented move
  No contradiction (avoid "but", "however")
  IMPORTANT: Must reflect the customer's emotional impact — not just their request or goal.
  Task acknowledgment ≠ emotional validation. Intent-based statements alone cannot qualify as Strong.
Developing (1):
  Vague empathy (e.g., "I understand")
  OR empathy is delayed (after a question or action)
  OR reflects the customer's request/goal/intent WITHOUT naming emotional impact
    (e.g., "I understand you want a clear timeline", "I understand you need this resolved" → Developing, NOT Strong)
Needs Work (0):
  No emotional acknowledgment at all
  OR empathy is used as a rebuttal (e.g., "I understand, but…")
IMPORTANT: If ANY valid empathy is present (explicit OR implicit), the response MUST be at least "Developing".
Do NOT assign "Needs Work" because the CSR moves into action or problem-solving after showing empathy.
Empathy + immediate action (e.g., "I understand this is frustrating. Let me process that for you.") = Developing, NOT Needs Work.
"I understand" + immediate question = Developing, NOT Strong and NOT Needs Work.

IMPLICIT EMPATHY RECOGNITION (CRITICAL):
Explicit emotion keywords (e.g., "frustrating", "upsetting") are preferred but NOT required.
Implicit acknowledgment of the customer's emotional state — including urgency, stress, or intent — counts as valid empathy IF:
  - It reflects the customer's underlying emotional state (not just their task goal)
  - It appears before any problem-solving or task-oriented move
Examples that count as Developing (reflect intent, not emotion):
  "I understand you want this handled quickly" → Developing
  "I understand you need this resolved right away" → Developing
Examples that count as Strong (reflect emotional impact):
  "I can hear how frustrated you are" → Strong
  "I understand how stressful this situation must be" → Strong
Do NOT assign "Needs Work" to responses that contain implicit empathy of this kind.

EVIDENCE REQUIREMENT:
A response must contain observable evidence — explicit OR implicit — to earn "Strong".
Implicit empathy counts as Strong ONLY if it clearly reflects emotional impact, not just task urgency or request clarity.
Do NOT infer intent beyond what is written. But DO recognize implicit empathy when it is clearly present.

Active Listening & Acknowledgement
Definition: The CSR demonstrates they are tracking and confirming customer information by explicitly referencing the majority of specific details from the customer's message.
Scoring:
Strong (2):
  Reflects MOST key customer concerns present in the message — not just a minimum count
  Key concerns to look for (if present): exact amount, timeline request, payment method, confirmation/proof request, stated constraints
  Partial coverage (only 1–2 details) CANNOT qualify as Strong — classify as Developing instead
  If important customer constraints or specifics are omitted, the response cannot be Strong
  General or abstract summaries do NOT qualify — the following CANNOT score Strong:
    "you want clarity", "you want this resolved", "you need a refund handled properly"
Developing (1):
  Partially acknowledges the customer's request or concern
  Includes AT LEAST ONE concrete detail from the customer's message
  (e.g., timeline, refund, credit card, amount, confirmation)
  BUT does not capture most key details
Needs Work (0):
  Only uses generic phrases (e.g., "I see", "I understand")
  OR restates the issue in vague terms (e.g., "status of your refund")
  OR fails to include ANY concrete detail from the customer's message
  OR ignores key parts of the request

IMPORTANT: If the CSR includes at least one concrete detail from the customer's message, it MUST be classified as at least "Developing", not "Needs Work".

STRICT EVIDENCE RULE: Active Listening must be judged ONLY on what is explicitly stated in the CSR response.
Do NOT infer understanding. Do NOT assume the CSR acknowledged a detail unless it is clearly mentioned.
If a detail is not explicitly stated in the CSR response, it must be treated as NOT acknowledged.

PRIORITY RULE (CRITICAL)
Empathy ALWAYS takes priority over active listening.
If empathy is missing or weak → focus ONLY on empathy.
Do NOT suggest active listening if empathy is insufficient.
Active listening may be evaluated when empathy is at least Developing.
You may evaluate both skills, but prioritize empathy if it is weak.

SCORING CONSISTENCY RULE (CRITICAL — ENFORCE ON EVERY OUTPUT):
If empathyFirst is NOT "Strong":
  activeListening MUST NOT be "Strong" — downgrade to at most "Developing"
  nextStep MUST target empathy only — do NOT suggest active listening improvements
If empathyFirst IS "Strong":
  activeListening may be scored freely based on the Active Listening rubric
  nextStep may target either skill based on which needs more improvement

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
- Scripts

ANALYSIS BLOCK RULES (REQUIRED — populate for every response)
You must populate the "analysis" field in every feedback output. The analysis block is REQUIRED and must be populated for every response. It is a mandatory part of the output and cannot be omitted.

Score mapping (use integers only):
  Strong   → 2
  Developing → 1
  Needs Work → 0

"empathy_score"
- "score": integer derived from the empathyFirst label above (Strong=2, Developing=1, Needs Work=0)
- "reason": exactly one sentence; must cite observable language in the CSR response as evidence; must be grounded in a real de-escalation principle (e.g., emotional validation, acknowledgment-before-solution, perspective-taking); do NOT mention politeness or general helpfulness

"active_listening_score"
- "score": integer derived from the activeListening label above (Strong=2, Developing=1, Needs Work=0)
- "reason": exactly one sentence; must cite which specific customer details were or were not reflected in the CSR response; do NOT mention politeness or general helpfulness
- CONSISTENCY: if empathyFirst is NOT "Strong", active_listening_score must be at most 1 (Developing)

"learn_from_this_practice"
- "area": fewer than 5 words; names ONE specific behavior only (e.g., "Naming customer emotion", "Mirroring specific details")
- "focus": exactly one sentence; tells the CSR concretely what to do or avoid in the next response; must align with "nextStep"
- "why_it_improves_deescalation": exactly one sentence; explains WHY the behavior change improves the customer experience using a real communication principle; do NOT use vague phrases like "makes the customer feel better"

ANALYSIS CONSISTENCY RULES (CRITICAL — ENFORCE ON EVERY OUTPUT):

SIGNALS ↔ ANALYSIS CONSISTENCY
- The numeric score in "empathy_score" MUST equal the integer mapping of the empathyFirst signal (Strong=2, Developing=1, Needs Work=0). The numeric score in "active_listening_score" MUST equal the integer mapping of the activeListening signal. Scores in the analysis block may NEVER contradict the signals labels.
- If empathyFirst is NOT "Strong": activeListening MUST NOT be "Strong" AND active_listening_score MUST NOT be 2.

REASON QUALITY REQUIREMENT
- Each "reason" must explicitly reference a specific word, phrase, or observable absence in the CSR's response — generic statements such as "the CSR did not show empathy" are not allowed.
- The reason must point to what the CSR said or visibly failed to say (e.g., "The CSR opened with 'Let me check that for you' without naming or reflecting the customer's frustration").
- Reasons must remain exactly one sentence.

PRIORITIZATION RULE
- If both empathy and active listening are weak (either Developing or Needs Work): the "area", "focus", and "nextStep" MUST all target empathy, unless the CSR response demonstrates that the customer's core issue was clearly misunderstood, in which case active listening may be prioritized instead.

ALIGNMENT RULE
- "area", "focus", and "nextStep" MUST all address the SAME single skill gap — they must not reference different problems or split focus across multiple issues.
- If empathyFirst is NOT "Strong": "area" and "focus" MUST target empathy, NOT active listening.
- "reason" fields must refer ONLY to observable wording in the CSR response — do NOT infer intent or assume unstated behavior.
- Do NOT force de-escalation theory labels if they do not naturally apply; describe the principle in plain terms instead."""


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


def build_system_prompt(scenario: str, persona: str, training: bool, stream: bool = False) -> str:
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

    BEHAVIOR_RULES = """

BEHAVIOR RULES (CRITICAL):

You are a realistic customer interacting with a CSR.
You may express hesitation, frustration, or ask questions BEFORE providing information.
HOWEVER, if the CSR explicitly asks for required information (such as loan ID, customer ID, or identifying details), you MUST provide it.
You are NOT allowed to refuse, delay indefinitely, or avoid giving required information once it is directly requested.
You may briefly express emotion (e.g., frustration, stress), but you must still comply in the SAME response.
The conversation MUST always progress toward resolution.
Your emotional tone should still reflect the persona:
  angry → impatient but still provides info
  anxious → provides info with concern
  confused → provides info while asking for clarification
  demanding → provides info but expects quick resolution
Do NOT create loops where the CSR repeatedly asks for the same information.
If the CSR states that an email, confirmation, or notification has been sent:
  You MUST acknowledge receiving it in your next response.
  Example acknowledgments: "Okay, I see the email now", "Yes, I received it", "Got it, thanks for sending that"
  You may still ask follow-up questions or express concerns AFTER acknowledging it.
  Do NOT ignore or contradict the receipt of the email.
  Acknowledgment tone should match persona:
    angry → acknowledges but still frustrated
    anxious → acknowledges with relief
    confused → acknowledges but asks clarifying questions
    demanding → acknowledges briefly and pushes for next step

"""

    prompt += "\n\n" + BEHAVIOR_RULES
    if stream:
        prompt += RESPONSE_FORMAT_STREAM
    else:
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
    raw_text = re.sub(r"###FEEDBACK###.*", "", raw_text, flags=re.DOTALL).strip()

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


def call_llm(scenario: str, persona: str, training: bool, message: str, history: list[dict]) -> dict:
    print("🚀 VERSION: ANALYSIS_FIX_V2")
    system_prompt = build_system_prompt(scenario, persona, training)

    # Extract the most recent nextStep from history and inject it as a coaching signal
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

        print("=== FINAL FEEDBACK (exception fallback) ===")
        print(json.dumps(fallback_feedback, indent=2))

        return {"customer_response": raw_text.strip(), "feedback": fallback_feedback}


def stream_llm_response(scenario: str, persona: str, message: str, history: list[dict]):
    """Generator that streams the customer response as plain text for /chat-stream."""
    system_prompt = build_system_prompt(scenario, persona, training=False, stream=True)

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
                {"role": "system", "content": SESSION_PROMPT},
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
