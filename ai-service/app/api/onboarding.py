"""
FastAPI Onboarding & Assessment Router
Endpoints:
  POST /api/ai/onboarding/analyze-experience
  POST /api/ai/onboarding/assessment/start  (and /api/onboarding/start)
  POST /api/ai/onboarding/assessment/{session_id}/answer (and /api/onboarding/answer)
  POST /api/ai/onboarding/assessment/{session_id}/finish (and /api/onboarding/finish)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.ml.topic_classifier import predict_topics_from_text
from app.ml.model_registry import registry
from app.agents.onboarding_agent import onboarding_agent
from app.services.assessment_engine import (
    start_assessment_session,
    record_answer_and_adapt,
    finish_assessment_session,
    get_session
)

router = APIRouter(prefix="/api/ai/onboarding", tags=["onboarding"])

class ExperiencePayload(BaseModel):
    experienceText: Optional[str] = ""
    selfReportedLevel: Optional[str] = "Beginner"
    externalPlatformId: Optional[str] = ""
    selectedTopics: Optional[List[str]] = []

class StartAssessmentPayload(BaseModel):
    userId: Optional[str] = "test_user_id"
    experienceText: Optional[str] = ""
    selfReportedLevel: Optional[str] = "Beginner"
    selectedTopics: Optional[List[str]] = []

class AnswerPayload(BaseModel):
    session_id: Optional[str] = ""
    questionId: str
    userAnswer: str
    execution_result: Optional[Dict[str, Any]] = None

@router.post("/analyze-experience")
def analyze_experience(payload: ExperiencePayload):
    text = payload.experienceText or ''
    detected_topics, unknown_topics, initial_estimate = predict_topics_from_text(text, payload.selectedTopics, payload.selfReportedLevel)
    summary_data = onboarding_agent.analyze_experience(text, detected_topics, initial_estimate['initial_level'])

    return {
        "topics": detected_topics,
        "unknownTopics": unknown_topics,
        "initialSkill": initial_estimate,
        "selfReportedLevel": payload.selfReportedLevel or "Beginner",
        "matchStatus": "MATCHED" if initial_estimate['initial_level'] == (payload.selfReportedLevel or 'Beginner') else "ALIGNING",
        "recommendedAssessmentLength": 12,
        "summary": summary_data.get("summary", "ML TF-IDF Model analyzed your experience text."),
        "modelMetadata": registry.metadata or {"topic_classification": "TF-IDF + ML", "version": "v3.0.0"}
    }

@router.post("/assessment/start")
def start_assessment(payload: StartAssessmentPayload):
    return start_assessment_session(
        user_id=payload.userId or "anon",
        experience_text=payload.experienceText or "",
        self_reported_level=payload.selfReportedLevel or "Beginner",
        selected_topics=payload.selectedTopics
    )

@router.get("/assessment/{session_id}")
def get_assessment_status(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Assessment session not found")

    return {
        "sessionId": session["sessionId"],
        "status": session["status"],
        "currentQuestionIndex": session["currentQuestionIndex"],
        "totalQuestions": session["totalQuestions"],
        "currentQuestion": session["currentQuestion"],
        "adaptationExplanation": session.get("adaptationExplanation", []),
        "finalProfile": session.get("finalProfile")
    }

@router.post("/assessment/{session_id}/answer")
def submit_assessment_answer(session_id: str, payload: AnswerPayload):
    res = record_answer_and_adapt(
        session_id=session_id,
        question_id=payload.questionId,
        user_answer=payload.userAnswer,
        execution_result=payload.execution_result
    )
    if not res:
        raise HTTPException(status_code=404, detail="Assessment session not found")
    return res

@router.post("/assessment/{session_id}/complete")
@router.post("/assessment/{session_id}/finish")
def complete_assessment(session_id: str):
    res = finish_assessment_session(session_id)
    if "error" in res:
        raise HTTPException(status_code=404, detail=res["error"])
    return res
