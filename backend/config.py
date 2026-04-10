import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# ── OpenAI Config ─────────────────────────────────────────────

MODEL_NAME = os.getenv("MODEL_NAME", "gpt-5.4")

def build_client():
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

print("Using model:", MODEL_NAME)