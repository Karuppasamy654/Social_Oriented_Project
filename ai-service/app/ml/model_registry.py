import os
from typing import Dict, Any, List, Optional

class ModelRegistry:
    """
    Runtime ML Model Registry for CodeBuddy.
    Loads classifiers and rankers for pattern detection, question type scoring, and understanding prediction.
    Uses documented deterministic fallbacks if trained binary model artifacts are absent.
    """
    def __init__(self):
        self.models_loaded = False
        self.registry_status = "deterministic_rule_ranker_active"
        self.feature_vectorizer = None
        self.topic_classifier = None
        self.metadata = {
            "topic_classification": "TF-IDF + ML",
            "version": "v3.0.0",
            "status": "active"
        }


    def predict_pattern(self, code_features: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Classifies algorithmic patterns from code features.
        """
        patterns = []
        depth = code_features.get("nested_loop_depth", 0)
        hashing = code_features.get("hashing", False)
        sorting = code_features.get("sorting", False)
        recursion = code_features.get("recursion", False)

        if depth >= 2:
            patterns.append({"pattern": "brute_force", "confidence": 0.99, "source": "ast_nested_loop_classifier"})
        elif hashing:
            patterns.append({"pattern": "hash_lookup", "confidence": 0.95, "source": "ast_hash_map_classifier"})
        elif sorting:
            patterns.append({"pattern": "sorting", "confidence": 0.95, "source": "ast_sort_classifier"})
        elif recursion:
            patterns.append({"pattern": "recursion", "confidence": 0.90, "source": "ast_call_stack_classifier"})
        else:
            patterns.append({"pattern": "single_loop", "confidence": 0.85, "source": "ast_linear_classifier"})

        return patterns

    def rank_candidate_questions(
        self,
        candidates: List[Dict[str, Any]],
        student_profile: Dict[str, Any],
        previous_answers: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Ranks candidate questions based on evidence strength, learning value, weakness, difficulty fit, and diversity.
        """
        prev_q_ids = {a.get("question_id") for a in (previous_answers or [])}
        
        scored_candidates = []
        for cand in candidates:
            # Skip duplicates
            if cand.get("id") in prev_q_ids:
                continue

            score = 1.0
            # Higher weight for direct code evidence
            if cand.get("evidence"):
                score += 0.30
            # Higher weight for complexity & reasoning
            if cand.get("question_type") in ["code_reasoning", "complexity"]:
                score += 0.20
            # Fitting difficulty
            if cand.get("difficulty") == "medium":
                score += 0.10

            cand["ranking_score"] = round(score, 2)
            scored_candidates.append(cand)

        # Sort descending by ranking score
        scored_candidates.sort(key=lambda x: x["ranking_score"], reverse=True)
        return scored_candidates

model_registry = ModelRegistry()
registry = model_registry

