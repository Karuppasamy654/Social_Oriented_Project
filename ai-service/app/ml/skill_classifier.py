"""
Layer C — Skill Classification Module
Predicts multi-label skill taxonomy separate from topic classification, and evaluates overall student skill tier.
"""

from typing import List, Dict, Any, Tuple

try:
    import numpy as np  # type: ignore
except ImportError:
    np = None

from app.ml.model_registry import registry

SKILL_CLASSES = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

SKILL_TAXONOMY = [
    'arrays', 'strings', 'hashing', 'linked_lists', 'stacks', 'queues',
    'trees', 'bst', 'heaps', 'graphs', 'recursion', 'backtracking',
    'greedy', 'dynamic_programming', 'binary_search', 'sorting',
    'complexity_analysis', 'debugging', 'implementation'
]

def predict_skills_from_text(experience_text: str) -> List[str]:
    """Predicts specific multi-label skill competencies from text input."""
    text_lower = (experience_text or '').lower()
    predicted_skills = set()

    for skill in SKILL_TAXONOMY:
        clean_skill = skill.replace('_', ' ')
        if clean_skill in text_lower:
            predicted_skills.add(skill)

    if 'complexity' in text_lower or 'big o' in text_lower:
        predicted_skills.add('complexity_analysis')
    if 'debug' in text_lower or 'fix' in text_lower:
        predicted_skills.add('debugging')

    if not predicted_skills:
        predicted_skills = {'arrays', 'implementation'}

    return sorted(list(predicted_skills))

def predict_final_skill_profile(feature_vector: list, self_reported_level: str = 'Beginner') -> Tuple[str, float, float, Dict[str, float]]:
    clf = registry.skill_classifier

    if clf is not None:
        try:
            X = np.array([feature_vector]) if np is not None else [feature_vector]
            if hasattr(clf, "predict_proba"):
                probs = clf.predict_proba(X)[0]
                best_idx = int(probs.index(max(probs)) if isinstance(probs, list) else np.argmax(probs))
                level = SKILL_CLASSES[best_idx]
                confidence = float(probs[best_idx])
                prob_dict = {SKILL_CLASSES[i]: round(float(probs[i]), 4) for i in range(len(SKILL_CLASSES))}
            else:
                best_idx = int(clf.predict(X)[0])
                level = SKILL_CLASSES[best_idx]
                confidence = 0.85
                prob_dict = {SKILL_CLASSES[i]: (0.85 if i == best_idx else 0.05) for i in range(len(SKILL_CLASSES))}

            acc = feature_vector[0]
            score = round(float(acc), 4)
            return level, score, round(confidence, 4), prob_dict
        except Exception as e:
            print(f"[Warning] Skill Classifier Inference error: {e}")

    acc, speed, diff_succ, accepted, attempts, hints, mastery, edge, understand = feature_vector
    weighted_score = (acc * 0.30) + (diff_succ * 0.25) + (mastery * 0.20) + (understand * 0.15) + ((1.0 - hints) * 0.10)

    if weighted_score >= 0.85:
        level = 'Expert'
        prob_dict = {'Beginner': 0.01, 'Intermediate': 0.04, 'Advanced': 0.10, 'Expert': 0.85}
    elif weighted_score >= 0.65:
        level = 'Advanced'
        prob_dict = {'Beginner': 0.02, 'Intermediate': 0.08, 'Advanced': 0.82, 'Expert': 0.08}
    elif weighted_score >= 0.40:
        level = 'Intermediate'
        prob_dict = {'Beginner': 0.05, 'Intermediate': 0.80, 'Advanced': 0.10, 'Expert': 0.05}
    else:
        level = 'Beginner'
        prob_dict = {'Beginner': 0.85, 'Intermediate': 0.10, 'Advanced': 0.04, 'Expert': 0.01}

    confidence = 0.85
    return level, round(weighted_score, 4), confidence, prob_dict
