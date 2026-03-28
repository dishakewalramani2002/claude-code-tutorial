from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.llm_service import call_llm, start_conversation, lookup_knowledge_base, generate_report

app = FastAPI(title="CSR Training Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_SCENARIOS = {"vc1", "vc2", "vc3"}
VALID_PERSONAS = {"angry", "confused", "demanding", "anxious"}


class ChatRequest(BaseModel):
    scenario: str        # "vc1" | "vc2" | "vc3"
    persona: str         # "angry" | "confused" | "demanding" | "anxious"
    training: bool       # True = training mode with real-time feedback
    message: str
    history: list[dict]


class FeedbackModel(BaseModel):
    empathy: bool
    transparency: bool
    ownership: bool
    suggestion: str


class ChatResponse(BaseModel):
    customer_response: str
    feedback: FeedbackModel | None = None


class StartRequest(BaseModel):
    scenario: str
    persona: str
    training: bool


@app.post("/start", response_model=ChatResponse)
async def start(request: StartRequest):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    if request.persona not in VALID_PERSONAS:
        raise HTTPException(status_code=400, detail=f"persona must be one of {VALID_PERSONAS}")
    result = start_conversation(request.scenario, request.persona, request.training)
    return ChatResponse(**result)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    if request.persona not in VALID_PERSONAS:
        raise HTTPException(status_code=400, detail=f"persona must be one of {VALID_PERSONAS}")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    result = call_llm(
        scenario=request.scenario,
        persona=request.persona,
        training=request.training,
        message=request.message,
        history=request.history,
    )
    return ChatResponse(**result)


class LookupRequest(BaseModel):
    scenario: str
    query: str


@app.post("/lookup")
async def lookup(request: LookupRequest):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="query cannot be empty")
    answer = lookup_knowledge_base(request.scenario, request.query)
    return {"answer": answer}


class ReportRequest(BaseModel):
    scenario: str
    persona: str
    training: bool
    history: list[dict]


@app.post("/report")
async def report(request: ReportRequest):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    result = generate_report(
        scenario=request.scenario,
        persona=request.persona,
        training=request.training,
        history=request.history,
    )
    return result


@app.get("/health")
def health():
    return {"status": "ok"}
