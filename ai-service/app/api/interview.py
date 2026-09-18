from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.interview.interview_engine import get_interview_engine
from app.interview.interview_model_registry import get_interview_registry

router = APIRouter(prefix="/ml/interview", tags=["AI Interview Simulator"])

class StartSessionRequest(BaseModel):
    user_id: str
    company: str
    role: str
    level: str = "intern"
    interview_type: str = "Technical"
    duration_minutes: int = 45
    weak_topics: List[str] = []

class NextQuestionRequest(BaseModel):
    session_id: str

class SubmitAnswerRequest(BaseModel):
    session_id: str
    transcript: str
    duration_seconds: float = 30.0
    user_code: Optional[str] = None

class IntegrityEventRequest(BaseModel):
    session_id: str
    event_type: str
    duration_ms: int = 0
    severity: str = "medium"

class FinishSessionRequest(BaseModel):
    session_id: str

@router.get("/companies")
def get_companies():
    registry = get_interview_registry()
    retriever = registry.retriever
    return {
        "previous_year": retriever.get_previous_year(),
        "total_questions": len(retriever.questions),
        "info": registry.get_info()
    }

@router.post("/session/start")
def start_interview_session(req: StartSessionRequest):
    engine = get_interview_engine()
    session = engine.start_session(
        user_id=req.user_id,
        company=req.company,
        role=req.role,
        level=req.level,
        interview_type=req.interview_type,
        duration_minutes=req.duration_minutes,
        weak_topics=req.weak_topics
    )
    return session.dict()

@router.post("/question/next")
def get_next_question(req: NextQuestionRequest):
    engine = get_interview_engine()
    try:
        res = engine.next_question(req.session_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/answer")
def submit_interview_answer(req: SubmitAnswerRequest):
    engine = get_interview_engine()
    try:
        res = engine.submit_answer(
            session_id=req.session_id,
            transcript=req.transcript,
            duration_seconds=req.duration_seconds,
            user_code=req.user_code
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/integrity-event")
def log_integrity_event(req: IntegrityEventRequest):
    engine = get_interview_engine()
    try:
        res = engine.log_integrity_event(
            session_id=req.session_id,
            event_type=req.event_type,
            duration_ms=req.duration_ms,
            severity=req.severity
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/session/finish")
def finish_interview_session(req: FinishSessionRequest):
    engine = get_interview_engine()
    try:
        res = engine.finish_session(req.session_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
