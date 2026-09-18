from typing import Dict, Any, List

class LearnerUnderstandingModel:
    """
    Tracks and updates concept-level understanding scores based on verified viva responses.
    Does NOT update mastery merely because code compiled.
    """
    def __init__(self, initial_state: Dict[str, float] = None):
        self.state = initial_state or {
            "nested_loops": 0.50,
            "pairwise_search": 0.50,
            "complexity": 0.50,
            "data_structures": 0.50,
            "hash_lookups": 0.50,
            "sorting_mechanics": 0.50,
            "recursion_base_cases": 0.50,
            "pointer_manipulation": 0.50
        }

    def update_concept(self, concept: str, is_correct: bool, difficulty_weight: float = 1.0):
        current = self.state.get(concept, 0.50)
        delta = 0.15 * difficulty_weight if is_correct else -0.15 * difficulty_weight
        new_val = max(0.0, min(1.0, current + delta))
        self.state[concept] = round(new_val, 2)

    def get_understanding_profile(self) -> Dict[str, Any]:
        return {"concept_scores": self.state}

    def evaluate_response(
        self,
        question_item: Dict[str, Any],
        selected_index: int
    ) -> Dict[str, Any]:
        correct_index = question_item.get("correct_option_index", 0)
        is_correct = (selected_index == correct_index)
        concept = question_item.get("concept", "code_reasoning").lower().replace(" ", "_")
        
        self.update_concept(concept, is_correct)
        
        return {
            "is_correct": is_correct,
            "confidence": 0.92,
            "concept": concept,
            "updated_score": self.state.get(concept, 0.50),
            "reasoning": "Answer matches correct code logic invariant." if is_correct else f"Incorrect. {question_item.get('explanation', '')}"
        }

    def get_state(self) -> Dict[str, float]:
        return self.state
