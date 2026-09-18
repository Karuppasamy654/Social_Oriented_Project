"""
Layer C — Multi-Factor Adaptive Question Ranker
Ranks candidate questions based on IRT ability fit, topic weakness, uncertainty, Fisher Information gain, question-type diversity, and repetition penalties.
Selects optimal next question using controlled Softmax stochastic selection over top candidate subset.
"""

import math
import random
from typing import List, Dict, Any, Tuple
from app.ml.irt_engine import irt_engine, IRTEngine

class MLInformedQuestionRanker:
    """Multi-factor utility adaptive ranker incorporating IRT statistical inputs."""

    def __init__(self):
        self.weights = {
            'topic_relevance': 0.40,
            'difficulty_fit': 0.20,
            'uncertainty': 0.15,
            'information_gain': 0.10,
            'weakness_relevance': 0.07,
            'type_diversity': 0.05,
            'unseen_bonus': 0.03
        }

    def compute_candidate_score(
        self,
        question: Dict[str, Any],
        detected_topics: List[Dict[str, Any]],
        topic_mastery: Dict[str, float],
        student_ability: float,
        asked_ids: List[str],
        asked_types: List[str] = None,
        mistake_topics: List[str] = None,
        is_exploration: bool = False
    ) -> Tuple[float, List[str]]:
        q_id = question.get('id') or question.get('question_id')
        topic = question.get('topic')
        difficulty = question.get('difficulty', 'Medium')
        q_type = question.get('question_type', 'algorithm_selection')

        # 1. Repetition exclusion penalty
        if q_id in asked_ids:
            return -100.0, ["previously asked"]

        reasons = []

        # 2. IRT Difficulty Fit & Information Gain
        b = irt_engine.difficulty_to_b(difficulty)
        p_correct = irt_engine.calculate_p_correct(student_ability, b)
        info_gain = irt_engine.calculate_information(student_ability, b)

        # Ideal difficulty fit when student has ~50-70% chance of success on diagnostic item
        diff_fit = 1.0 - abs(p_correct - 0.60) / 0.60
        reasons.append(f"IRT diff fit ({difficulty}: P={p_correct:.2f})")

        # 3. Topic Relevance
        detected_names = [t['name'] for t in detected_topics if t.get('probability', 0) >= 0.60]
        q_topics = question.get('topics', [])
        if topic in detected_names or any(t in detected_names for t in q_topics):
            topic_rel = 1.0
            reasons.append(f"primary topic match ({topic})")
        elif is_exploration:
            topic_rel = 0.01
            reasons.append(f"exploration topic ({topic})")
        else:
            topic_rel = 0.0

        # 4. Uncertainty
        current_mastery = topic_mastery.get(topic, 0.50)
        uncertainty = 1.0 - 2.0 * abs(current_mastery - 0.50)

        # 5. Weakness & Mistake Relevance
        weakness_rel = 1.0 if current_mastery < 0.45 else 0.2
        if mistake_topics and topic in mistake_topics:
            weakness_rel += 0.4
            reasons.append(f"targets previous mistake in {topic}")

        # 6. Question Type Diversity Bonus
        type_bonus = 1.0
        if asked_types and q_type in asked_types[-2:]:
            # Slight penalty if same question type was asked in last 2 turns
            type_bonus = 0.3
        else:
            type_bonus = 1.0

        # Unseen Bonus
        unseen_bonus = 1.0

        # Compute Base Utility Score
        score = (
            self.weights['difficulty_fit'] * diff_fit +
            self.weights['topic_relevance'] * topic_rel +
            self.weights['uncertainty'] * uncertainty +
            self.weights['information_gain'] * info_gain +
            self.weights['weakness_relevance'] * weakness_rel +
            self.weights['type_diversity'] * type_bonus +
            self.weights['unseen_bonus'] * unseen_bonus
        )

        return round(score, 4), reasons

    def get_difficulty_probabilities(self, ability_score: float) -> Dict[str, float]:
        """
        Calculates initial difficulty selection probabilities centered on student ability score.
        Ability ~0.25 (Beginner) -> Easy > Hard
        Ability ~0.50 (Intermediate) -> Medium highest
        Ability ~0.75 (Expert) -> Hard > Easy
        """
        b_easy = 0.25
        b_medium = 0.50
        b_hard = 0.75

        w_easy = math.exp(-((ability_score - b_easy) ** 2) / 0.08)
        w_medium = math.exp(-((ability_score - b_medium) ** 2) / 0.08)
        w_hard = math.exp(-((ability_score - b_hard) ** 2) / 0.08)

        total = w_easy + w_medium + w_hard
        return {
            'Easy': round(w_easy / total, 4),
            'Medium': round(w_medium / total, 4),
            'Hard': round(w_hard / total, 4)
        }

    def rank_questions(
        self,
        candidate_questions: List[Dict[str, Any]],
        detected_topics: List[Dict[str, Any]],
        topic_mastery: Dict[str, float],
        student_ability: float,
        asked_ids: List[str],
        asked_types: List[str] = None,
        mistake_topics: List[str] = None,
        exploration_topic_set: set = None
    ) -> List[Dict[str, Any]]:
        ranked = []
        for q in candidate_questions:
            q_topic = q.get('topic')
            is_exploration = bool(exploration_topic_set and q_topic in exploration_topic_set)
            score, reasons = self.compute_candidate_score(
                question=q,
                detected_topics=detected_topics,
                topic_mastery=topic_mastery,
                student_ability=student_ability,
                asked_ids=asked_ids,
                asked_types=asked_types,
                mistake_topics=mistake_topics,
                is_exploration=is_exploration
            )
            if score > -50.0:
                ranked.append({
                    'question': q,
                    'utility_score': score,
                    'score': score,
                    'reasons': reasons
                })

        ranked.sort(key=lambda x: x['utility_score'], reverse=True)
        return ranked

    def select_top_weighted_candidate(self, ranked_candidates: List[Dict[str, Any]], top_n: int = 5, temperature: float = 0.5) -> Dict[str, Any]:
        """Performs Softmax stochastic selection over top_n candidate items."""
        if not ranked_candidates:
            return None
        candidates = ranked_candidates[:top_n]
        if len(candidates) == 1:
            res = dict(candidates[0])
            res['selection_prob'] = 1.0
            res['score'] = res.get('utility_score', res.get('score', 0.0))
            return res

        scores = [c.get('utility_score', c.get('score', 0.0)) for c in candidates]
        max_s = max(scores)
        exp_scores = [math.exp((s - max_s) / max(0.1, temperature)) for s in scores]
        total_exp = sum(exp_scores)
        probs = [e / total_exp for e in exp_scores]

        r = random.random()
        cumulative = 0.0
        selected_idx = 0
        for i, p in enumerate(probs):
            cumulative += p
            if r <= cumulative:
                selected_idx = i
                break

        res = dict(candidates[selected_idx])
        res['selection_prob'] = round(probs[selected_idx], 4)
        res['score'] = res.get('utility_score', res.get('score', 0.0))
        return res

question_ranker = MLInformedQuestionRanker()
