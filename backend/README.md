# CSR Simulator — Backend

FastAPI backend for the AI-Driven CSR Conflict Resolution Training Simulator. Handles LLM calls via Groq, manages conversation history, and returns structured feedback for training mode.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | FastAPI |
| LLM Provider | Groq (`llama-3.1-8b-instant`) |
| Server | Uvicorn |
| Config | python-dotenv |

---

## Project Structure

```
backend/
├── main.py               # FastAPI app and API endpoints
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variable template
├── services/
│   └── llm_service.py    # Groq API calls and response parsing
└── prompts/
    ├── vc1_prompt.txt    # System prompt: health insurance virtual customer (training)
    ├── vc2_prompt.txt    # System prompt: flight cancellation virtual customer (evaluation)
    ├── kb_vc1_prompt.txt # System prompt: internal knowledge base for VC1
    └── kb_vc2_prompt.txt # System prompt: internal knowledge base for VC2
```

---

## Setup

### 1. Create and activate virtual environment

```bash
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
# or
venv\Scripts\activate             # Windows (CMD/PowerShell)
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and add your Groq API key (free at [console.groq.com](https://console.groq.com)):

```
GROQ_API_KEY=your_key_here
```

### 4. Run the server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

---

## API Endpoints

### `GET /start/{mode}`
Generates the customer's opening message to kick off the conversation.

- **mode**: `vc1` (health insurance) or `vc2` (flight cancellation)

**Response:**
```json
{
  "customer_response": "Hello, I'm calling about a $1,200 bill I received..."
}
```

---

### `POST /chat`
Sends a CSR message and returns the customer's reply. In training mode (`vc1`), also returns structured skill feedback.

**Request:**
```json
{
  "mode": "vc1",
  "message": "I understand your frustration. Can I get your member ID?",
  "history": [
    { "role": "assistant", "content": "Hello, I received a bill..." }
  ]
}
```

**Response:**
```json
{
  "customer_response": "My member ID is 123456...",
  "feedback": {
    "empathy": true,
    "transparency": false,
    "ownership": false,
    "suggestion": "Good empathy shown. Next, explain what steps you'll take."
  }
}
```

> In `vc2` mode, `feedback` is always `null`.

---

### `POST /lookup`
Answers an internal knowledge base query (used by the CSR from the portal).

**Request:**
```json
{
  "mode": "vc1",
  "query": "What does procedure code 99213 cover?"
}
```

**Response:**
```json
{
  "answer": "Procedure 99213 is an office visit billed at the established patient rate..."
}
```

---

### `GET /health`
Returns `{ "status": "ok" }`. Useful for confirming the server is running.

---

## Modes

| Mode | Domain | Feedback |
|------|--------|----------|
| `vc1` | Health Insurance Billing | Yes — empathy, transparency, ownership scores + suggestion |
| `vc2` | Flight Cancellation | No — evaluation only, feedback hidden |

---

## Feedback Schema (VC1 only)

The LLM is instructed to append a structured block after each customer reply:

```
###FEEDBACK###
{
  "empathy": true,
  "transparency": false,
  "ownership": false,
  "suggestion": "..."
}
###END###
```

`llm_service.py` parses this block out of the raw response and strips it from the displayed customer message. If the model omits the block, a fallback feedback object is returned so the UI always has something to show.

---

## Swapping the LLM

The model is set in `services/llm_service.py`. To change it, update the `model` parameter in any `client.chat.completions.create(...)` call:

```python
model="llama-3.1-8b-instant"   # current — fast, free tier
model="llama-3.3-70b-versatile" # better quality, slower
model="mixtral-8x7b-32768"      # alternative
```

All models above are available on the Groq free tier.
