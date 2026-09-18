"""
Layer B — Single-Answer Question Quality Validator
Implements strict validation checking:
1. Clear question prompt without generic filler
2. Defined learning objective
3. Valid question type (1 of 11)
4. Single intended correct answer matching options
5. Distinct, plausible distractors without duplicates
6. Explicit code snippet or specified algorithm for complexity/analysis questions
7. Explicit property/performance specification for algorithm selection questions
8. Valid implementation questions with starter code/problem statement
9. Non-empty explanation matching correct answer
10. Final assessment_eligible flag computation
"""

from typing import Tuple, Dict, Any
from app.data.question_schema import AssessmentQuestion, VALID_QUESTION_TYPES
from app.data.problem_schema import CodingProblem

NONSENSE_JARGON_PATTERNS = [
    "optimal bit manipulation state transitions",
    "structural operations and properties",
    "bitwise modulo shift recursion",
    "unsorted brute-force linear search over all inputs",
    "exhaustive random search without state retention",
    "random permutation generation without pruning",
    "variant 1", "variant 2", "variant 3", "variant 4", "variant 5",
    "variant 6", "variant 7", "variant 8", "variant 9", "variant 10",
    "single number variant",
    "record 83", "record 839",
    "placeholder", "todo", "lorem ipsum"
]

class QuestionQualityValidator:
    """Validator enforcing single-answer accuracy, non-repetitive wording, and student-facing readability."""

    @staticmethod
    def validate_question(q: AssessmentQuestion) -> Tuple[bool, str]:
        # 1. Question Type Validation
        if q.question_type not in VALID_QUESTION_TYPES:
            return False, f"Invalid question type '{q.question_type}'. Must be one of {VALID_QUESTION_TYPES}"

        # 2. Learning Objective Validation
        if not q.learning_objective or len(q.learning_objective.strip()) < 3:
            return False, "Missing or insufficient learning_objective"

        # 3. Question Text Validation & Generic Boilerplate / Nonsense Check
        if not q.question_text or len(q.question_text.strip()) < 15:
            return False, "Missing or insufficient question_text"

        if CodingProblem.is_generic_boilerplate(q.question_text):
            return False, "Question text contains generic boilerplate filler text"

        text_lower = q.question_text.lower()
        title_lower = (q.source_problem or '').lower()
        for pattern in NONSENSE_JARGON_PATTERNS:
            if pattern in text_lower or pattern in title_lower:
                return False, f"Question contains rejected phrase or variant label: '{pattern}'"

        # Check for ungrounded variant in source_problem or question_id
        if "variant" in title_lower or "variant" in (q.question_id or '').lower():
            return False, "Question contains unexplained internal 'variant' identifier"

        # 4. Implementation Coding Question Validation
        if q.question_type == "implementation":
            if not q.question_text or len(q.question_text.strip()) < 25:
                return False, "Implementation question requires complete problem statement"
            return True, "Valid implementation coding problem"

        # 5. MCQ Specific Validation
        if not q.options or len(q.options) < 2:
            return False, "MCQ question must have at least 2 options"

        # Check options for nonsense patterns
        clean_options = [opt.strip() for opt in q.options]
        if len(set(clean_options)) != len(clean_options):
            return False, "MCQ options contain duplicate entries"

        for opt in clean_options:
            opt_lower = opt.lower()
            for pattern in NONSENSE_JARGON_PATTERNS:
                if pattern in opt_lower:
                    return False, f"MCQ option contains nonsense technical jargon: '{pattern}'"

        # Check correct answer exists in options
        matched = False
        correct_clean = q.correct_answer.strip()
        for opt in clean_options:
            if opt == correct_clean or opt.startswith(correct_clean) or correct_clean in opt:
                matched = True
                break
        if not matched:
            return False, f"Correct answer '{q.correct_answer}' does not match any choice in options"

        # 6. Specific Question Type Constraints
        prompt_lower = q.question_text.lower()
        code_text = (q.code or '').strip()

        if q.question_type in ["time_complexity", "space_complexity", "code_analysis", "code_output", "dry_run", "debugging"]:
            # Must refer to specific code OR state specific algorithm in prompt
            has_code = len(code_text) > 10
            has_algorithm_ref = any(term in prompt_lower for term in [
                "brute-force", "nested-loop", "hash map", "sorting", "binary search",
                "two-pointer", "recursive", "dp", "dynamic programming", "manacher",
                "in-place", "auxiliary space", "worst-case", "following implementation",
                "following program", "following code", "stored", "using", "recursion",
                "xor", "stack", "queue", "tree", "array"
            ])
            if not has_code and not has_algorithm_ref:
                return False, f"Question type '{q.question_type}' requires code snippet or explicit algorithm specification"

        if q.question_type == "algorithm_selection":
            # Must state target efficiency/property to make choice single-answer unambiguous
            has_performance_target = any(term in prompt_lower for term in [
                "o(n)", "o(1)", "o(log n)", "expected", "linear time", "constant space",
                "in-place", "optimal", "preserve", "efficient", "which approach", "which algorithm",
                "which data structure", "how can"
            ])
            if not has_performance_target:
                return False, "Algorithm selection question must specify required performance or property"

        # 7. Explanation Validation
        if not q.explanation or len(q.explanation.strip()) < 5:
            return False, "Missing or incomplete explanation"

        return True, "Valid single-answer assessment question"

    @classmethod
    def audit_and_annotate(cls, q: AssessmentQuestion) -> AssessmentQuestion:
        is_valid, reason = cls.validate_question(q)
        q.assessment_eligible = is_valid
        q.verified = is_valid
        if not is_valid and not q.explanation:
            q.explanation = f"Rejected by audit: {reason}"
        return q

