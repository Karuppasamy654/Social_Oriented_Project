"""
Layer A — Problem Bank Schema & Normalization Module
Authoritative, human-readable coding problems separated from assessment question metadata.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

GENERIC_FILLER_PATTERNS = [
    "given complex structural inputs",
    "design an optimal algorithm",
    "matching constraints",
    "standard memory and time limit bounds",
    "using string / frequency count",
    "process the given data",
    "solve the computational problem",
    "implement an efficient solution",
    "given the following structural input",
    "determine the optimal result",
    "how is this problem optimally solved",
    "given an array or string input",
    "problem cleanly in o(n) time",
    "solve the single number problem",
    "solve the majority element problem",
    "solve the invert binary tree problem",
    "solve the same tree problem",
    "solve the symmetric tree problem",
    "solve the maximum depth of binary tree problem",
    "solve the contains duplicate problem",
    "solve the valid anagram problem",
    "solve the binary search problem",
    "solve the first bad version problem",
    "solve the search insert position problem",
    "solve the move zeroes problem",
    "solve the intersection of two arrays problem",
    "solve the reverse string problem",
    "placeholder text"
]

class CodingProblem(BaseModel):
    problem_id: str
    title: str
    problem_statement: str
    input_format: Optional[str] = ""
    output_format: Optional[str] = ""
    constraints: List[str] = Field(default_factory=list)
    examples: List[Dict[str, Any]] = Field(default_factory=list)
    explanation: Optional[str] = ""
    topics: List[str] = Field(default_factory=list)
    difficulty: str = "Medium"
    source: str = "leetcode"
    source_url: Optional[str] = ""
    source_id: Optional[str] = ""
    assessment_eligible: bool = True

    @classmethod
    def is_generic_boilerplate(cls, text: str) -> bool:
        if not text or len(text.strip()) < 20:
            return True
        text_lower = text.lower()
        for pattern in GENERIC_FILLER_PATTERNS:
            if pattern.lower() in text_lower:
                return True
        return False

    def validate_quality(self) -> tuple[bool, str]:
        """
        Validates problem quality for student readability and completeness.
        Returns (is_valid, rejection_reason).
        """
        if not self.title or len(self.title.strip()) < 2:
            return False, "Missing or invalid problem title"
        
        if not self.problem_statement or len(self.problem_statement.strip()) < 25:
            return False, "Missing or insufficient problem statement description"
        
        if self.is_generic_boilerplate(self.problem_statement):
            return False, "Problem statement contains generic boilerplate AI text"
        
        if not self.topics:
            return False, "Missing topic classification"
        
        return True, "Valid human-readable problem"

    def to_dict(self) -> Dict[str, Any]:
        return self.dict()
