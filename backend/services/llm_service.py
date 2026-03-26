import os
import re
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
        model="llama-3.1-8b-instant",
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
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
        max_tokens=512,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


def call_llm(mode: str, message: str, history: list[dict]) -> dict:
    if mode == "vc1":
        system_prompt = load_prompt("vc1_prompt.txt")
    elif mode == "vc2":
        system_prompt = load_prompt("vc2_prompt.txt")
    else:
        raise ValueError(f"Unknown mode: {mode}")

    messages = build_messages(history, system_prompt, message)

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
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
