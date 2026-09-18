from typing import List, Dict, Any

class QuestionRanker:
    def __init__(self):
        self.weights = {
            "company_match": 0.25,
            "role_match": 0.20,
            "level_fit": 0.15,
            "weakness_relevance": 0.15,
            "difficulty_fit": 0.15,
            "source_confidence": 0.10,
        }

    def rank_questions(
        self,
        candidates: List[Dict[str, Any]],
        target_company: str,
        target_role: str,
        target_level: str,
        weak_topics: List[str],
        target_difficulty: str = "medium"
    ) -> List[Dict[str, Any]]:
        scored_candidates = []

        for q in candidates:
            score = 0.0

            # 1. Company match
            if q.get("company", "").lower() == target_company.lower():
                score += self.weights["company_match"]

            # 2. Role match
            if target_role.lower() in q.get("role", "").lower():
                score += self.weights["role_match"]

            # 3. Level fit
            if q.get("level", "intern").lower() == target_level.lower():
                score += self.weights["level_fit"]

            # 4. Weakness relevance
            q_topics = [t.lower() for t in q.get("topics", [])]
            if any(w.lower() in q_topics for w in weak_topics):
                score += self.weights["weakness_relevance"]

            # 5. Difficulty fit
            if q.get("difficulty", "medium").lower() == target_difficulty.lower():
                score += self.weights["difficulty_fit"]

            # 6. Source confidence
            conf = q.get("confidence", 0.8)
            score += self.weights["source_confidence"] * conf

            q_copy = dict(q)
            q_copy["rank_score"] = round(score, 4)
            scored_candidates.append(q_copy)

        scored_candidates.sort(key=lambda x: x["rank_score"], reverse=True)
        return scored_candidates
