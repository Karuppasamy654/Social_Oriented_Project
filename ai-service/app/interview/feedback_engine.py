from typing import List, Dict, Any

class FeedbackEngine:
    def generate_feedback(
        self,
        answer_history: List[Dict[str, Any]],
        weak_topics: List[str]
    ) -> Dict[str, Any]:
        strengths = []
        weaknesses = []
        actionable_plan = []

        if not answer_history:
            return {
                "strengths": ["Insufficient evidence"],
                "weaknesses": ["Insufficient evidence"],
                "actionable_plan": []
            }

        # Analyze strengths and weaknesses strictly from actual answer/code evaluation
        for item in answer_history:
            tech_score = item.get("technical_score", 0.0)
            q_id = item.get("question_id", "coding_task")
            topics = item.get("weak_concepts", [])

            if tech_score >= 80.0:
                strengths.append(f"Demonstrated strong performance on question/problem '{q_id}'.")
            elif tech_score < 70.0:
                topic_str = ", ".join(topics) if topics else "boundary conditions"
                weaknesses.append(f"Encountered difficulty with {topic_str} during question '{q_id}'.")

        if not strengths:
            strengths.append("Insufficient evidence")

        if not weaknesses:
            weaknesses.append("Insufficient evidence")

        for w_topic in set(weak_topics):
            actionable_plan.append({
                "concept": w_topic,
                "evidence": f"Identified area of difficulty during session.",
                "recommendation": f"Practice targeted {w_topic} coding problems focusing on edge cases."
            })

        return {
            "strengths": strengths,
            "weaknesses": weaknesses,
            "actionable_plan": actionable_plan
        }
