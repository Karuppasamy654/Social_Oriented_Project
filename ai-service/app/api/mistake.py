import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/ml", tags=["Mistake Pattern Detection"])

class MistakeDetectionRequest(BaseModel):
    user_id: str
    code: str
    language: str = "cpp17"
    problem_topic: str = "Array"
    previous_mistakes: List[Dict[str, Any]] = []
    error_type: Optional[str] = None

class DetectedMistake(BaseModel):
    mistake_type: str
    severity: str
    description: str
    suggestion: str
    is_recurring: bool
    frequency: int

@router.post("/detect-mistakes", response_model=List[DetectedMistake])
def detect_mistakes(req: MistakeDetectionRequest):
    code = req.code or ""
    topic = req.problem_topic or "Array"
    error_type = req.error_type or ""
    code_lower = code.lower()

    detected = []

    # 1. C++ Vector Index Off-by-one check: e.g. i <= nums.size()
    if re.search(r'for\s*\(\s*int\s+\w+\s*=\s*0;\s*\w+\s*<=\s*\w+\.size\(\)', code):
        detected.append(DetectedMistake(
            mistake_type="off_by_one",
            severity="high",
            description="Vector index out-of-bounds pattern detected in loop condition `i <= nums.size()`.",
            suggestion="Use `i < nums.size()` because valid vector indices range from 0 to size() - 1.",
            is_recurring=False,
            frequency=1
        ))

    # 2. C++ Missing Key Guard in Map Lookup
    if ("unordered_map" in code_lower or "map" in code_lower) and not (".count(" in code_lower or ".find(" in code_lower or "contains" in code_lower):
        if "[" in code and "]" in code:
            detected.append(DetectedMistake(
                mistake_type="incorrect_hash_logic",
                severity="medium",
                description="Direct key access `map[key]` without verifying key existence with `.count(key)` or `.find(key)`.",
                suggestion="Check `.count(key)` before accessing `map[key]` to avoid default value creation or runtime error.",
                is_recurring=False,
                frequency=1
            ))

    # 3. Double loop over vector without offset: e.g. j = 0 instead of j = i + 1
    if re.search(r'for\s*\(\s*int\s+i\s*=.*for\s*\(\s*int\s+j\s*=\s*0;', code):
        detected.append(DetectedMistake(
            mistake_type="duplicate_handling",
            severity="medium",
            description="Inner loop resets `j = 0` which causes element pair self-comparison and duplicate checks.",
            suggestion="Start inner loop from `j = i + 1` to compare distinct element pairs.",
            is_recurring=False,
            frequency=1
        ))

    # 4. Compilation or Runtime error classification
    if error_type == "compilation_error":
        detected.append(DetectedMistake(
            mistake_type="compilation_error",
            severity="medium",
            description="C++ syntax or type declaration compilation fault encountered.",
            suggestion="Check variable declarations, include headers (`#include <unordered_map>`), and semicolons.",
            is_recurring=False,
            frequency=1
        ))
    elif error_type == "time_limit_exceeded":
        detected.append(DetectedMistake(
            mistake_type="inefficient_loop",
            severity="high",
            description="Nested loop iteration exceeded the 2.0s execution time limit.",
            suggestion="Optimize your algorithm from O(N^2) to O(N) using std::unordered_map.",
            is_recurring=False,
            frequency=1
        ))

    # Cross-reference with historical mistake records to flag recurrence
    prev_map = {m.get("mistakeType"): m.get("occurrenceCount", m.get("frequency", 1)) for m in req.previous_mistakes}
    for item in detected:
        if item.mistake_type in prev_map:
            item.is_recurring = True
            item.frequency = prev_map[item.mistake_type] + 1
            item.description = f"🚨 RECURRING MISTAKE #{item.frequency}: You have made an '{item.mistake_type.replace('_', ' ')}' error {item.frequency} times recently. " + item.description

    return detected
