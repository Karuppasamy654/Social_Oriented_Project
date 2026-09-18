class AnswerAnalysisAgent:
    def evaluate_answer(self, question: dict, user_answer: str, is_correct: bool):
        if is_correct:
            return {
                "correctness": 1.0,
                "conceptualUnderstanding": 0.95,
                "missingConcepts": [],
                "reason": f"Correctly answered {question.get('topic', 'DSA')} question on {question.get('difficulty', 'Medium')} difficulty.",
                "confidence": 0.92
            }
        else:
            return {
                "correctness": 0.0,
                "conceptualUnderstanding": 0.40,
                "missingConcepts": [question.get('topic', 'Algorithm Concept')],
                "reason": f"Incorrect choice for {question.get('topic', 'DSA')} ({question.get('difficulty', 'Medium')} level). Concept reinforcement recommended.",
                "confidence": 0.85
            }

answer_analysis_agent = AnswerAnalysisAgent()
