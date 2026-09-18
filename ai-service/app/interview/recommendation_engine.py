from typing import List, Dict, Any

class RecommendationEngine:
    def build_company_prep_plan(
        self,
        company: str,
        role: str,
        weak_topics: List[str],
        score_pct: float
    ) -> Dict[str, Any]:
        priority_topics = list(set(weak_topics)) if weak_topics else ["arrays", "dynamic_programming", "system_design"]

        recommended_problems = [
            {"slug": "two-sum", "title": "Two Sum", "difficulty": "Easy", "topic": "arrays"},
            {"slug": "maximum-subarray", "title": "Maximum Subarray", "difficulty": "Medium", "topic": "dynamic_programming"},
            {"slug": "reverse-linked-list", "title": "Reverse Linked List", "difficulty": "Easy", "topic": "linked_lists"}
        ]

        return {
            "target_company": company,
            "target_role": role,
            "performance_summary": f"Overall Session Rating: {score_pct}%",
            "priority_topics": priority_topics,
            "recommended_coding_problems": recommended_problems,
            "next_steps": [
                f"Complete 2 mock interviews for {company} focused on {priority_topics[0] if priority_topics else 'Core CS'}.",
                "Review time and space complexity explanations for array and graph algorithms.",
                "Practice STAR format responses for behavioral leadership questions."
            ]
        }
