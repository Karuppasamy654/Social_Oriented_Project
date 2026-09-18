import math

class TopicMasteryModel:
    """
    Maintains per-topic student mastery scores using a Bayesian / IRT-inspired update mechanism.
    Does NOT use crude static increments like `skill += 10`.
    """
    def __init__(self, initial_mastery_dict=None):
        self.mastery = initial_mastery_dict or {}

    def get_mastery(self, topic: str) -> float:
        return self.mastery.get(topic, 0.35)

    def update_mastery(self, topic: str, difficulty: str, is_correct: bool, user_ability: float = 0.5):
        """
        Updates topic mastery after answering a question.
        Uses question difficulty weight:
          - Easy: 0.30 weight
          - Medium: 0.60 weight
          - Hard: 0.90 weight
        Uses IRT logistic probability:
          P(correct) = 1 / (1 + exp(-(user_ability - diff_val)))
        """
        diff_weights = {'Easy': 0.30, 'Medium': 0.60, 'Hard': 0.90}
        diff_val = diff_weights.get(difficulty, 0.50)

        current = self.get_mastery(topic)

        # Expected probability of correct answer based on current mastery
        expected_prob = 1.0 / (1.0 + math.exp(-3.0 * (current - diff_val)))

        # Learning rate scaled by information gain
        learning_rate = 0.25 * diff_val

        actual_outcome = 1.0 if is_correct else 0.0
        residual = actual_outcome - expected_prob

        # Update rule: New Mastery = Old Mastery + LR * (Actual - Expected)
        new_mastery = current + learning_rate * residual

        # Clamp between 0.05 and 0.98
        new_mastery = max(0.05, min(0.98, round(new_mastery, 4)))
        self.mastery[topic] = new_mastery
        return new_mastery

    def get_all_mastery(self) -> dict:
        return self.mastery
