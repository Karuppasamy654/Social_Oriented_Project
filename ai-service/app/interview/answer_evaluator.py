import math
from typing import Dict, Any, List, Tuple

class AnswerEvaluator:
    def __init__(self):
        # Default rubric weights
        self.weights = {
            "correctness": 0.40,
            "reasoning": 0.25,
            "completeness": 0.15,
            "clarity": 0.10,
            "process": 0.10
        }

    def evaluate_answer(
        self,
        question: Dict[str, Any],
        student_transcript: str,
        speech_metrics: Dict[str, Any] = None,
        user_code: str = None
    ) -> Dict[str, Any]:
        student_transcript = (student_transcript or "").strip()
        word_count = len(student_transcript.split())

        # Diagnostic scoring heuristics
        if word_count < 5:
            correctness = 0.2
            reasoning = 0.2
            completeness = 0.1
            clarity = 0.4
            feedback = "The answer was extremely brief. Provide a thorough explanation covering approach, trade-offs, and edge cases."
            weak_concepts = question.get("topics", ["general_concept"])
        elif word_count < 25:
            correctness = 0.65
            reasoning = 0.60
            completeness = 0.50
            clarity = 0.75
            feedback = "Good start, but missing detailed reasoning on time/space complexities and boundary conditions."
            weak_concepts = [question.get("topics", ["general_concept"])[0]] if question.get("topics") else []
        else:
            correctness = 0.88
            reasoning = 0.85
            completeness = 0.82
            clarity = 0.90
            feedback = "Strong technical explanation demonstrating solid conceptual understanding and clear logical progression."
            weak_concepts = []

        total_score = (
            correctness * self.weights["correctness"] +
            reasoning * self.weights["reasoning"] +
            completeness * self.weights["completeness"] +
            clarity * self.weights["clarity"] +
            0.85 * self.weights["process"]
        )

        return {
            "technical_score": round(correctness * 100, 1),
            "reasoning_score": round(reasoning * 100, 1),
            "completeness_score": round(completeness * 100, 1),
            "clarity_score": round(clarity * 100, 1),
            "total_score_pct": round(total_score * 100, 1),
            "feedback": feedback,
            "weak_concepts": weak_concepts
        }

    def update_irt_ability(self, current_theta: float, question_difficulty: str, score_pct: float) -> float:
        """IRT-inspired ability update rule."""
        diff_map = {"easy": -1.0, "medium": 0.0, "hard": 1.0}
        b = diff_map.get(question_difficulty.lower(), 0.0)

        # Expected probability of success P(correct) = 1 / (1 + exp(-(theta - b)))
        p_correct = 1.0 / (1.0 + math.exp(-(current_theta - b)))
        actual_score = score_pct / 100.0

        # Learning rate K
        k = 0.4
        new_theta = current_theta + k * (actual_score - p_correct)
        return round(max(-3.0, min(3.0, new_theta)), 3)
