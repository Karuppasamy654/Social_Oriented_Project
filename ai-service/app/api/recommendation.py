from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any

router = APIRouter(prefix="/ml/recommend", tags=["ML Recommendation Engine"])

class UserProfilePayload(BaseModel):
    user_level: str = "Intermediate"
    weak_topics: List[str] = []
    mistake_topics: List[str] = []
    solved_problem_ids: List[str] = []
    target_company: str = ""

class ProblemCandidate(BaseModel):
    id: str
    title: str
    difficulty: str
    category: str
    tags: List[str] = []
    company_tags: List[str] = []
    acceptance_rate: float = 0.5

class RecommendationRequest(BaseModel):
    user_profile: UserProfilePayload
    candidates: List[ProblemCandidate]
    top_n: int = 5

class ScoredRecommendation(BaseModel):
    problem_id: str
    title: str
    difficulty: str
    category: str
    score: float
    reason: str

@router.post("", response_model=List[ScoredRecommendation])
def get_recommendations(req: RecommendationRequest):
    try:
        results = []
        user_level = req.user_profile.user_level.lower()
        weak_set = set(t.lower() for t in req.user_profile.weak_topics)
        mistake_set = set(t.lower() for t in req.user_profile.mistake_topics)
        solved_set = set(req.user_profile.solved_problem_ids)
        target_co = req.user_profile.target_company.lower()

        for cand in req.candidates:
            if cand.id in solved_set:
                continue

            score = 0.5
            reasons = []

            cand_diff = cand.difficulty.lower()
            if user_level == "beginner" and cand_diff == "easy":
                score += 0.3
                reasons.append("Optimal difficulty for Beginner level")
            elif user_level == "intermediate" and cand_diff in ["easy", "medium"]:
                score += 0.3
                reasons.append("Matches Intermediate skill profile")
            elif user_level in ["advanced", "expert"] and cand_diff in ["medium", "hard"]:
                score += 0.3
                reasons.append("Challenges Advanced problem-solving capacity")

            cand_cat = cand.category.lower()
            if cand_cat in weak_set:
                score += 0.4
                reasons.append(f"Targets identified weak area ({cand.category})")

            if cand_cat in mistake_set or any(t.lower() in mistake_set for t in cand.tags):
                score += 0.3
                reasons.append(f"Reinforces recent anti-pattern mistake area ({cand.category})")

            if target_co and any(target_co in co.lower() for co in cand.company_tags):
                score += 0.2
                reasons.append(f"Frequently asked in {req.user_profile.target_company} interviews")

            results.append(ScoredRecommendation(
                problem_id=cand.id,
                title=cand.title,
                difficulty=cand.difficulty,
                category=cand.category,
                score=round(score, 3),
                reason="; ".join(reasons) if reasons else "General skill practice match"
            ))

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:req.top_n]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation error: {str(e)}")
