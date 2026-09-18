"""
Layer C — Item Response Theory (IRT 1PL/2PL Rasch Model) Engine
Statistical adaptive model estimating student latent ability theta and item difficulty b.
Formulas:
  P(correct | theta, b, a) = 1 / (1 + exp(-a * (theta - b)))
  error = y - P(correct)
  theta_new = theta + learning_rate * error
  Information Gain I(theta) = a^2 * P * (1 - P)
"""

import math
from typing import Dict, Any, Tuple, List

DIFFICULTY_NUMERIC_MAP = {
    "Easy": -1.2,
    "Medium": 0.0,
    "Hard": 1.4
}

class IRTEngine:
    """Item Response Theory engine implementing 1PL/2PL Rasch estimation."""

    def __init__(self, default_a: float = 1.0, learning_rate: float = 0.40):
        self.default_a = default_a
        self.learning_rate = learning_rate

    @staticmethod
    def difficulty_to_b(difficulty: str) -> float:
        return DIFFICULTY_NUMERIC_MAP.get(difficulty.capitalize(), 0.0)

    def calculate_p_correct(self, theta: float, b: float, a: float = None) -> float:
        """Computes IRT 1PL/2PL probability of a correct response."""
        discrim = a if a is not None else self.default_a
        val = discrim * (theta - b)
        # Numerical stability clamp
        val = max(-15.0, min(15.0, val))
        return 1.0 / (1.0 + math.exp(-val))

    def update_ability(self, current_theta: float, question_difficulty: str, is_correct: bool, a: float = None) -> Tuple[float, float, float]:
        """
        Updates latent student ability theta based on observed correctness vs IRT expected probability.
        Returns (new_theta, p_correct, prediction_error).
        """
        b = self.difficulty_to_b(question_difficulty)
        p_correct = self.calculate_p_correct(current_theta, b, a)
        observed = 1.0 if is_correct else 0.0
        error = observed - p_correct

        # Dynamic learning rate scaling: larger steps when confident, smaller as precision builds
        new_theta = current_theta + self.learning_rate * error
        # Clamp theta to standard IRT range [-3.0, +3.0]
        new_theta = max(-3.0, min(3.0, round(new_theta, 4)))

        return new_theta, round(p_correct, 4), round(error, 4)

    def calculate_information(self, theta: float, b: float, a: float = None) -> float:
        """Calculates Fisher Information I(theta) = a^2 * P * (1 - P) for item selection."""
        discrim = a if a is not None else self.default_a
        p = self.calculate_p_correct(theta, b, discrim)
        return (discrim ** 2) * p * (1.0 - p)

    def calculate_standard_error(self, theta: float, question_history: List[Dict[str, Any]]) -> float:
        """Calculates Standard Error SE(theta) = 1 / sqrt(sum(I_j(theta)))."""
        if not question_history:
            return 1.0
        info_sum = 0.0
        for q in question_history:
            diff = q.get('difficulty', 'Medium')
            b = self.difficulty_to_b(diff)
            info_sum += self.calculate_information(theta, b)
        if info_sum <= 0.0001:
            return 1.0
        return round(1.0 / math.sqrt(info_sum), 4)

irt_engine = IRTEngine()
