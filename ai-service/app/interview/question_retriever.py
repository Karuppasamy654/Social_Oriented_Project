import json
import os
import datetime
from typing import List, Dict, Any, Optional

class QuestionRetriever:
    def __init__(self, dataset_path: Optional[str] = None):
        if not dataset_path:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            dataset_path = os.path.join(base_dir, "data", "interviews", "company_interview_questions.jsonl")
        
        self.dataset_path = dataset_path
        self.questions: List[Dict[str, Any]] = []
        self._load_dataset()

    def _load_dataset(self):
        if os.path.exists(self.dataset_path):
            with open(self.dataset_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        self.questions.append(json.loads(line))

    def get_previous_year(self) -> int:
        """Dynamically return current year - 1 (e.g. 2026 -> 2025). Never hardcode 2025."""
        current_year = datetime.datetime.now().year
        return current_year - 1

    def retrieve_candidates(
        self,
        company: str,
        role: str,
        level: str,
        interview_type: str,
        asked_ids: List[str],
        user_weak_topics: List[str] = None,
        target_difficulty: str = "medium"
    ) -> List[Dict[str, Any]]:
        user_weak_topics = user_weak_topics or []
        candidates = []

        # Filter by company match first (case-insensitive)
        for q in self.questions:
            if q["question_id"] in asked_ids:
                continue

            q_company = q.get("company", "").strip().lower()
            if q_company != company.strip().lower() and q_company != "all":
                continue

            # Check verification status rule: do not misrepresent non-reported questions
            if q.get("verification_status") not in ["verified_reported", "paraphrased_reported", "company_style_practice"]:
                continue

            candidates.append(q)

        # If no exact company questions exist, return company-style practice fallback
        if not candidates:
            candidates = [
                {
                    "question_id": f"fallback_{company.lower()}_01",
                    "company": company,
                    "role": role,
                    "year": self.get_previous_year(),
                    "round": "technical_1",
                    "question_type": "dsa",
                    "question_text": f"Explain key algorithmic considerations for optimizing performance in a {company}-scale environment.",
                    "canonical_question": "System Performance Optimization",
                    "topics": ["algorithms", "system_design"],
                    "difficulty": target_difficulty,
                    "level": level,
                    "source_type": "company_style_practice",
                    "source_url": "",
                    "source_title": "Generated Practice Pattern",
                    "reported_date": str(datetime.date.today()),
                    "confidence": 0.75,
                    "verification_status": "company_style_practice",
                    "provenance": f"Company-Style Practice Pattern for {company}"
                }
            ]

        return candidates
