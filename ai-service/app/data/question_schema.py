"""
Layer B — Assessment Question Schema Module
Defines explicit assessment question structures generated from Layer A problems.
Supports 11 question types, mandatory learning objectives, single-answer MCQ validation, and coding implementation metadata.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

VALID_QUESTION_TYPES = [
    "concept",
    "algorithm_selection",
    "time_complexity",
    "space_complexity",
    "code_analysis",
    "code_output",
    "dry_run",
    "debugging",
    "implementation",
    "optimization",
    "data_structure_selection"
]

class AssessmentQuestion(BaseModel):
    question_id: str
    problem_id: str
    question_type: str
    learning_objective: str
    question_text: str
    code: Optional[str] = ""
    options: List[str] = Field(default_factory=list)
    correct_answer: str
    explanation: str = ""
    topic: str
    topics: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    difficulty: str = "Medium"
    source_problem: str = ""
    generated_from_source: bool = True
    verified: bool = True
    assessment_eligible: bool = True

    # Coding / Implementation specific attributes
    starter_code: Optional[str] = ""
    expected_language: Optional[str] = "python"
    test_cases: List[Dict[str, Any]] = Field(default_factory=list)
    execution_enabled: bool = False

    def is_mcq(self) -> bool:
        return self.question_type != "implementation" and len(self.options) > 0

    def to_dict(self) -> Dict[str, Any]:
        d = self.model_dump() if hasattr(self, 'model_dump') else self.dict()
        lines = (self.question_text or '').split('\n\n', 1)
        title = lines[0] if lines else (self.source_problem or 'Assessment Question')
        statement = lines[1] if len(lines) > 1 else (self.question_text or title)
        d['id'] = self.question_id
        d['title'] = title
        d['problemStatement'] = statement
        d['problem_statement'] = statement
        d['questionText'] = self.question_text
        d['correctAnswer'] = self.correct_answer
        return d
