from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from database import Base


class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    username        = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at      = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SessionRecord(Base):
    __tablename__ = "sessions"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True)
    scenario   = Column(String, nullable=False)
    persona    = Column(String, nullable=False)
    training   = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MessageRecord(Base):
    __tablename__ = "messages"

    id            = Column(Integer, primary_key=True, index=True)
    session_id    = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    role          = Column(String, nullable=False)   # "user" | "assistant"
    content       = Column(Text, nullable=False)
    feedback_json = Column(Text, nullable=True)      # JSON string, only on user messages
    created_at    = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ReportRecord(Base):
    __tablename__ = "reports"

    id                 = Column(Integer, primary_key=True, index=True)
    session_id         = Column(Integer, ForeignKey("sessions.id"), nullable=True)
    scenario           = Column(String, nullable=False)
    persona            = Column(String, nullable=False)
    training           = Column(Boolean, nullable=False)
    empathy_score      = Column(Integer, nullable=False)
    transparency_score = Column(Integer, nullable=False)
    ownership_score    = Column(Integer, nullable=False)
    overall_score      = Column(Integer, nullable=False)
    report_json        = Column(Text, nullable=True)     # full report JSON string
    created_at         = Column(DateTime, default=lambda: datetime.now(timezone.utc))
