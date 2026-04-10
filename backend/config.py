import os
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
MODEL_NAME = os.getenv("MODEL_NAME")

def build_client():
    if LLM_PROVIDER == "groq":
        from groq import Groq
        return Groq(api_key=os.getenv("GROQ_API_KEY"))
    else:
        from openai import OpenAI
        return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

print(f"Using provider: {LLM_PROVIDER}")
print(f"Using model: {MODEL_NAME}")