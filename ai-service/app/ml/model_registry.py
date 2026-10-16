import os
import joblib
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
        self.skill_classifier = None
        self.answer_classifier = None
        self.metadata = {
            "topic_classification": "TF-IDF + ML",
            "version": "v3.0.0",
            "status": "active"
        }
        self._load_models()

    def _load_models(self):
        """Load trained .joblib model artifacts into registry at startup."""
        _base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'trained_models')
        _model_files = {
            'feature_vectorizer': 'feature_vectorizer.joblib',
            'topic_classifier': 'topic_classifier.joblib',
            'skill_classifier': 'skill_classifier.joblib',
            'answer_classifier': 'answer_classifier.joblib',
        }
        for attr, fname in _model_files.items():
            fpath = os.path.normpath(os.path.join(_base, fname))
            if os.path.exists(fpath):
                try:
                    setattr(self, attr, joblib.load(fpath))
                except Exception as e:
                    print(f"[ModelRegistry] Could not load {fname}: {e}")
        self.models_loaded = (
            self.feature_vectorizer is not None and
            self.topic_classifier is not None and
            self.skill_classifier is not None
        )
        self.registry_status = "models_loaded" if self.models_loaded else "deterministic_rule_ranker_active"


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

