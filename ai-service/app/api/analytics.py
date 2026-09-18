from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter(prefix="/ml/analytics", tags=["Learning Analytics Engine"])

class AnalyticsRequest(BaseModel):
    user_id: str
    submissions: List[Dict[str, Any]] = []

class AnalyticsResponse(BaseModel):
    total_analyzed: int
    accuracy_trend: List[Dict[str, Any]]
    topic_mastery: Dict[str, float]
    solve_speed_index: float
    recommended_focus: str

@router.post("", response_model=AnalyticsResponse)
def compute_analytics(req: AnalyticsRequest):
    subs = req.submissions
    total = len(subs)
    
    if total == 0:
        return AnalyticsResponse(
            total_analyzed=0,
            accuracy_trend=[],
            topic_mastery={"Arrays": 0.5, "Strings": 0.5, "HashMap": 0.5, "Trees": 0.3, "Graphs": 0.2},
            solve_speed_index=1.0,
            recommended_focus="Arrays & Hashing basics"
        )

    accepted = [s for s in subs if s.get("status") == "Accepted"]
    acc_ratio = len(accepted) / total if total > 0 else 0.0

    topic_counts = {}
    topic_accepted = {}

    for s in subs:
        t = s.get("topic", "Arrays")
        topic_counts[t] = topic_counts.get(t, 0) + 1
        if s.get("status") == "Accepted":
            topic_accepted[t] = topic_accepted.get(t, 0) + 1

    mastery = {}
    weakest_topic = "Graphs"
    min_ratio = 1.0

    for t, count in topic_counts.items():
        ratio = topic_accepted.get(t, 0) / count
        mastery[t] = round(ratio, 2)
        if ratio < min_ratio:
            min_ratio = ratio
            weakest_topic = t

    return AnalyticsResponse(
        total_analyzed=total,
        accuracy_trend=[{"session": i+1, "accuracy": round((i+1)*acc_ratio/total, 2)} for i in range(min(5, total))],
        topic_mastery=mastery,
        solve_speed_index=1.1,
        recommended_focus=f"Target practice on {weakest_topic}"
    )
