import json as json_lib
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.llm_service import call_llm, start_conversation, lookup_knowledge_base, generate_report, stream_llm_response
from database import engine, get_db, SessionLocal
from auth import hash_password, verify_password, create_access_token, get_current_user
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

SCENARIO_LABELS = {
    "vc1": "Health Insurance Billing",
    "vc2": "Flight Cancellation",
    "vc3": "Lost Baggage",
    "loan_delay": "Loan Delay",
    "refund_request": "Refund Request",
}


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    username: str
    password: str


@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == request.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = models.User(name=request.name, username=request.username, hashed_password=hash_password(request.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(user.id, user.username), "token_type": "bearer", "name": user.name}


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"access_token": create_access_token(user.id, user.username), "token_type": "bearer", "name": user.name}


@app.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "username": current_user.username}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.hashed_password = hash_password(request.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}


# ── Sessions history ──────────────────────────────────────────────────────────

@app.get("/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sessions = (
        db.query(models.SessionRecord)
        .filter(models.SessionRecord.user_id == current_user.id)
        .order_by(models.SessionRecord.created_at.desc())
        .all()
    )
    result = []
    for s in sessions:
        report = db.query(models.ReportRecord).filter(models.ReportRecord.session_id == s.id).first()
        result.append({
            "id": s.id,
            "scenario": s.scenario,
            "scenario_label": SCENARIO_LABELS.get(s.scenario, s.scenario),
            "persona": s.persona,
            "training": s.training,
            "created_at": s.created_at.isoformat(),
            "overall_score": report.overall_score if report else None,
            "empathy_score": report.empathy_score if report else None,
            "transparency_score": report.transparency_score if report else None,
            "ownership_score": report.ownership_score if report else None,
        })
    return result


@app.get("/sessions/{session_id}")
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.SessionRecord).filter(
        models.SessionRecord.id == session_id,
        models.SessionRecord.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(models.MessageRecord)
        .filter(models.MessageRecord.session_id == session_id)
        .order_by(models.MessageRecord.id)
        .all()
    )
    report_record = db.query(models.ReportRecord).filter(models.ReportRecord.session_id == session_id).first()

    return {
        "id": session.id,
        "scenario": session.scenario,
        "scenario_label": SCENARIO_LABELS.get(session.scenario, session.scenario),
        "persona": session.persona,
        "training": session.training,
        "created_at": session.created_at.isoformat(),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "feedback": json_lib.loads(m.feedback_json) if m.feedback_json else None,
            }
            for m in messages
        ],
        "report": json_lib.loads(report_record.report_json) if report_record and report_record.report_json else None,
    }


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    scenario: str
    persona: str
    training: bool
    message: str
    history: list[dict]
    session_id: int | None = None


class SignalsModel(BaseModel):
    empathyFirst: str
    activeListening: str


class FeedbackModel(BaseModel):
    signals: SignalsModel
    nextStep: str
    analysis: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    customer_response: str
    feedback: FeedbackModel | None = None
    session_id: int | None = None


class StartRequest(BaseModel):
    scenario: str
    persona: str
    training: bool


@app.post("/start", response_model=ChatResponse)
async def start(
    request: StartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    if request.persona not in VALID_PERSONAS:
        raise HTTPException(status_code=400, detail=f"persona must be one of {VALID_PERSONAS}")

    result = start_conversation(request.scenario, request.persona, request.training)

    session_record = models.SessionRecord(
        user_id=current_user.id,
        scenario=request.scenario,
        persona=request.persona,
        training=request.training,
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)

    # Store the opening assistant message
    db.add(models.MessageRecord(
        session_id=session_record.id,
        role="assistant",
        content=result["customer_response"],
    ))
    db.commit()

    return ChatResponse(**result, session_id=session_record.id)


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
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

    feedback = result.get("feedback") if request.training else None

    db.add(models.MessageRecord(
        session_id=request.session_id,
        role="user",
        content=request.message,
        feedback_json=json_lib.dumps(feedback) if feedback else None,
    ))
    db.add(models.MessageRecord(
        session_id=request.session_id,
        role="assistant",
        content=result["customer_response"],
    ))
    db.commit()

    return ChatResponse(**result, session_id=request.session_id)


def _stream_with_db_save(base_gen, session_id):
    """Wraps a text generator: yields all chunks, then saves the full response to DB."""
    full_text = ""
    for chunk in base_gen:
        full_text += chunk
        yield chunk
    if session_id is not None:
        bg_db = SessionLocal()
        try:
            bg_db.add(models.MessageRecord(
                session_id=session_id,
                role="assistant",
                content=full_text,
            ))
            bg_db.commit()
        except Exception as e:
            print(f"ERROR saving streamed assistant message: {e}")
        finally:
            bg_db.close()


@app.post("/chat-stream")
async def chat_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")
    if request.persona not in VALID_PERSONAS:
        raise HTTPException(status_code=400, detail=f"persona must be one of {VALID_PERSONAS}")
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty")

    if request.session_id is not None:
        db.add(models.MessageRecord(
            session_id=request.session_id,
            role="user",
            content=request.message,
        ))
        db.commit()

    return StreamingResponse(
        _stream_with_db_save(
            stream_llm_response(
                scenario=request.scenario,
                persona=request.persona,
                message=request.message,
                history=request.history,
            ),
            request.session_id,
        ),
        media_type="text/plain",
    )


class LookupRequest(BaseModel):
    scenario: str
    query: str


@app.post("/lookup")
async def lookup(
    request: LookupRequest,
    current_user: models.User = Depends(get_current_user),
):
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
    session_id: int | None = None


@app.post("/report")
async def report(
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if request.scenario not in VALID_SCENARIOS:
        raise HTTPException(status_code=400, detail=f"scenario must be one of {VALID_SCENARIOS}")

    result = generate_report(history=request.history)

    perf = result.get("performance", {})
    report_record = models.ReportRecord(
        session_id=request.session_id,
        scenario=request.scenario,
        persona=request.persona,
        training=request.training,
        empathy_score=perf.get("empathy_score", 0),
        transparency_score=perf.get("transparency_score", 0),
        ownership_score=perf.get("ownership_score", 0),
        overall_score=perf.get("overall_score", 0),
        report_json=json_lib.dumps(result),
    )
    db.add(report_record)
    db.commit()

    return result


@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"status": "ok"}


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}
