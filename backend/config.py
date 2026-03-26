import os
from dotenv import load_dotenv

load_dotenv()

# ── LLM Provider ─────────────────────────────────────────────────────────────
# Switch providers by changing LLM_PROVIDER and MODEL_NAME below,
# then add the matching API key to your .env file.
#
# Groq (current default)
#   LLM_PROVIDER = "groq"
#   MODEL_NAME   = "llama-3.1-8b-instant"  (fast) | "llama-3.3-70b-versatile" (smarter)
#   .env key: GROQ_API_KEY
#
# OpenAI / ChatGPT
#   LLM_PROVIDER = "openai"
#   MODEL_NAME   = "gpt-4o-mini"  (cheap) | "gpt-4o" (best)
#   .env key: OPENAI_API_KEY
# ─────────────────────────────────────────────────────────────────────────────

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq")
MODEL_NAME   = os.getenv("MODEL_NAME",   "llama-3.1-8b-instant")


def build_client():
    if LLM_PROVIDER == "openai":
        from openai import OpenAI
        return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    else:  # groq (default)
        from groq import Groq
        return Groq(api_key=os.getenv("GROQ_API_KEY"))
