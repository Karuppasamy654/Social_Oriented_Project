from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
import datetime

class QuestionHistoryItem(BaseModel):
    question_id: str
    canonical_question: str
    question_text: str
    question_type: str
    difficulty: str
    verification_status: str
    provenance: str
    topics: List[str] = Field(default_factory=list)
    asked_at: str
    source_url: Optional[str] = None
    coding_problem_slug: Optional[str] = None

class SpeechMetrics(BaseModel):
    wpm: float = 0.0
    filler_word_count: int = 0
    pause_count: int = 0
    response_latency_seconds: float = 0.0
    speaking_duration_seconds: float = 0.0

class AnswerHistoryItem(BaseModel):
    question_id: str
    transcript: str
    answered_at: str
    response_duration_seconds: float = 0.0
    technical_score: float = 0.0
    reasoning_score: float = 0.0
    completeness_score: float = 0.0
    clarity_score: float = 0.0
    speech_metrics: Optional[SpeechMetrics] = None
    feedback: str = ""
    weak_concepts: List[str] = Field(default_factory=list)
    user_code: Optional[str] = None

class IntegrityEvent(BaseModel):
    event_id: str
    type: str  # tab_hidden, fullscreen_exit, window_blur, camera_stopped, mic_stopped, multiple_faces, face_missing, possible_phone
    timestamp: str
    duration_ms: int = 0
    severity: str = "medium" # low, medium, high

class InterviewSessionState(BaseModel):
    session_id: str
    user_id: str
    company: str
    role: str
    level: str = "intern" # intern, entry, experienced
    interview_type: str = "Technical" # Technical, HR / Behavioral, Mixed, Coding
    target_duration_minutes: int = 45
    started_at: str
    current_state: str = "READY" # READY, PRECHECK, STARTING, LISTENING, THINKING, ANSWERING, EVALUATING, FOLLOW_UP, NEXT_QUESTION, COMPLETED, TERMINATED
    current_question_index: int = 0
    ability_theta: float = 0.0  # IRT student ability
    topic_mastery: Dict[str, float] = Field(default_factory=dict)
    weak_topics: List[str] = Field(default_factory=list)
    question_history: List[QuestionHistoryItem] = Field(default_factory=list)
    answer_history: List[AnswerHistoryItem] = Field(default_factory=list)
    proctoring_events: List[IntegrityEvent] = Field(default_factory=list)
    elapsed_time_seconds: float = 0.0
    is_coding_round: bool = False
    active_coding_slug: Optional[str] = None
