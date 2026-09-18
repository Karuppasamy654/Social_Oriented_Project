from typing import List, Dict, Any

class InterviewScorer:
    def compute_final_score(
        self,
        answer_history: List[Dict[str, Any]],
        interview_type: str = "Coding"
    ) -> Dict[str, Any]:
        if not answer_history:
            return {
                "overall_score": None,
                "score_status": "NOT_EVALUATED",
                "sub_scores": {
                    "technical_knowledge": None,
                    "problem_solving": None,
                    "coding": None,
                    "communication": "Not Applicable",
                    "behavioral": None
                },
                "explanation": "No interview questions or coding problems were attempted."
            }

        tech_scores = [a.get("technical_score", 0.0) for a in answer_history if a.get("technical_score") is not None]
        reason_scores = [a.get("reasoning_score", 0.0) for a in answer_history if a.get("reasoning_score") is not None]
        complete_scores = [a.get("completeness_score", 0.0) for a in answer_history if a.get("completeness_score") is not None]

        if not tech_scores:
            return {
                "overall_score": None,
                "score_status": "NOT_EVALUATED",
                "sub_scores": {
                    "technical_knowledge": None,
                    "problem_solving": None,
                    "coding": None,
                    "communication": "Not Applicable",
                    "behavioral": None
                },
                "explanation": "No evaluated attempts found."
            }

        avg_tech = sum(tech_scores) / len(tech_scores)
        avg_reason = sum(reason_scores) / len(reason_scores) if reason_scores else avg_tech
        avg_complete = sum(complete_scores) / len(complete_scores) if complete_scores else avg_tech

        technical_knowledge = round(avg_tech, 1)
        problem_solving = round((avg_reason + avg_complete) / 2.0, 1)
        coding_score = round(avg_tech, 1)

        # Weighted calculation without communication score (40% tech, 30% problem solving, 30% coding)
        overall = (0.40 * technical_knowledge) + (0.30 * problem_solving) + (0.30 * coding_score)
        overall_rounded = round(min(100.0, max(0.0, overall)), 1)
        score_status = "PROVISIONAL" if len(answer_history) < 2 else "EVALUATED"

        explanation = (
            f"Technical Knowledge ({technical_knowledge}/100), "
            f"Problem Solving ({problem_solving}/100), "
            f"Coding Execution ({coding_score}/100)."
        )

        return {
            "overall_score": overall_rounded,
            "score_status": score_status,
            "sub_scores": {
                "technical_knowledge": technical_knowledge,
                "problem_solving": problem_solving,
                "coding": coding_score,
                "communication": "Not Applicable",
                "behavioral": None
            },
            "explanation": explanation
        }
