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


class ChatRequest(BaseModel):
    mode: str           # "vc1" or "vc2"
    message: str        # latest CSR message
    history: list[dict] # prior turns: [{role, content}, ...]


class FeedbackModel(BaseModel):
    empathy: bool
    transparency: bool
    ownership: bool
    suggestion: str


class ChatResponse(BaseModel):
    customer_response: str
    feedback: FeedbackModel | None = None


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if request.mode not in ("vc1", "vc2"):
        raise HTTPException(status_code=400, detail="mode must be 'vc1' or 'vc2'")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    result = call_llm(
        mode=request.mode,
        message=request.message,
        history=request.history,
    )
    return ChatResponse(**result)


class LookupRequest(BaseModel):
    mode: str
    query: str


@app.post("/lookup")
async def lookup(request: LookupRequest):
    if request.mode not in ("vc1", "vc2"):
        raise HTTPException(status_code=400, detail="mode must be 'vc1' or 'vc2'")
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="query cannot be empty")
    answer = lookup_knowledge_base(request.mode, request.query)
    return {"answer": answer}


@app.get("/start/{mode}", response_model=ChatResponse)
async def start(mode: str):
    if mode not in ("vc1", "vc2"):
        raise HTTPException(status_code=400, detail="mode must be 'vc1' or 'vc2'")
    result = start_conversation(mode)
    return ChatResponse(**result)


class ReportRequest(BaseModel):
    mode: str
    history: list[dict]  # full conversation including feedback fields


@app.post("/report")
async def report(request: ReportRequest):
    if request.mode not in ("vc1", "vc2"):
        raise HTTPException(status_code=400, detail="mode must be 'vc1' or 'vc2'")
    result = generate_report(mode=request.mode, history=request.history)
    return result


@app.get("/health")
def health():
    return {"status": "ok"}
