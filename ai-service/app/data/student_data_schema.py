"""
First-Party CodeBuddy Anonymized Student Interaction Schema
Defines privacy-safe, anonymized data logging structures for future model retraining on actual student interactions.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import time
import hashlib

class StudentInteractionRecord(BaseModel):
    student_id_hash: str
    session_id: str
    question_id: str
    topic: str
    difficulty: str
    is_correct: bool
    user_answer: str
    attempt_count: int = 1
    time_seconds: Optional[float] = 0.0
    hints_used: int = 0
    test_cases_passed: int = 0
    total_test_cases: int = 0
    understanding_score: float = 0.0
    mistake_type: Optional[str] = None
    timestamp: float = time.time()

    @staticmethod
    def hash_student_id(raw_student_id: str) -> str:
        """Computes privacy-preserving SHA-256 hash of student user ID."""
        return hashlib.sha256(raw_student_id.encode('utf-8')).hexdigest()[:16]

    def to_dict(self) -> Dict[str, Any]:
        return self.dict()
