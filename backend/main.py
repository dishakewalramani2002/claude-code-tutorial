from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from services.llm_service import call_llm, start_conversation, lookup_knowledge_base, generate_report
from database import engine, get_db
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CSR Training Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_SCENARIOS = {"vc1", "vc2", "vc3", "loan_delay", "refund_request"}
VALID_PERSONAS = {"angry", "confused", "demanding", "anxious"}


class ChatRequest(BaseModel):
    scenario: str
    persona: str
    training: bool
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
async def start(request: StartRequest, db: Session = Depends(get_db)):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    if request.persona not in VALID_PERSONAS:
        raise HTTPException(status_code=400, detail=f"persona must be one of {VALID_PERSONAS}")

    result = start_conversation(request.scenario, request.persona, request.training)

    session_record = models.SessionRecord(
        scenario=request.scenario,
        persona=request.persona,
        training=request.training,
    )
    db.add(session_record)
    db.commit()

    return ChatResponse(**result)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    if request.persona not in VALID_PERSONAS:
        raise HTTPException(status_code=400, detail=f"persona must be one of {VALID_PERSONAS}")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    db.add(models.MessageRecord(session_id=None, role="user", content=request.message))

    result = call_llm(
        scenario=request.scenario,
        persona=request.persona,
        training=request.training,
        message=request.message,
        history=request.history,
    )

    db.add(models.MessageRecord(session_id=None, role="assistant", content=result["customer_response"]))
    db.commit()

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
async def report(request: ReportRequest, db: Session = Depends(get_db)):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    print(f"\n=== /report called: {len(request.history)} turns, scenario={request.scenario}, persona={request.persona} ===")
    for i, msg in enumerate(request.history):
        role = msg.get("role", "?")
        content = msg.get("content", "")
        preview = content[:120].replace("\n", " ")
        has_feedback = "feedback" in msg and msg["feedback"] is not None
        print(f"  [{i}] {role}: {preview!r}{'  [has_feedback]' if has_feedback else ''}")
    print(f"=== end history ===\n")

    result = generate_report(
        scenario=request.scenario,
        persona=request.persona,
        training=request.training,
        history=request.history,
    )

    perf = result.get("performance", {})
    report_record = models.ReportRecord(
        session_id=None,
        scenario=request.scenario,
        persona=request.persona,
        training=request.training,
        empathy_score=perf.get("empathy_score", 0),
        transparency_score=perf.get("transparency_score", 0),
        ownership_score=perf.get("ownership_score", 0),
        overall_score=perf.get("overall_score", 0),
    )
    db.add(report_record)
    db.commit()

    return result


@app.get("/health")
def health():
    return {"status": "ok"}
