class SkillProfileAgent:
    def build_profile(self, experience_text: str, questions_asked: list, answers: list, initial_level: str):
        total = len(answers) or 1
        correct_count = sum(1 for a in answers if a.get('isCorrect'))
        score_pct = Math.round((correct_count / total) * 100) if hasattr(Math, 'round') else round((correct_count / total) * 100)

        # Topic breakdown
        topic_scores = {}
        for a in answers:
            topic = a.get('topic', 'General')
            if topic not in topic_scores:
                topic_scores[topic] = {'total': 0, 'correct': 0}
            topic_scores[topic]['total'] += 1
            if a.get('isCorrect'):
                topic_scores[topic]['correct'] += 1

        topic_mastery = {}
        strengths = []
        weaknesses = []

        for t, stats in topic_scores.items():
            mastery = round(stats['correct'] / stats['total'], 2)
            topic_mastery[t] = mastery
            if mastery >= 0.70:
                strengths.append(t)
            else:
                weaknesses.append(t)

        if not strengths and topic_mastery:
            strengths.append(max(topic_mastery, key=topic_mastery.get))
        if not weaknesses:
            weaknesses.append("Advanced Dynamic Programming")

        # Verified level calculation
        if score_pct >= 80:
            verified_level = "Intermediate+" if initial_level == "Intermediate" else "Advanced"
        elif score_pct >= 50:
            verified_level = "Intermediate" if initial_level in ["Intermediate", "Advanced"] else "Beginner+"
        else:
            verified_level = "Beginner"

        reasoning = f"Evaluated across {total} adaptive questions ({score_pct}% accuracy). Demonstrated strength in {', '.join(strengths[:2])}."

        return {
            "overallLevel": verified_level,
            "verifiedLevel": verified_level,
            "accuracy": score_pct,
            "confidenceScore": min(96, 82 + int(score_pct * 0.14)),
            "topicMastery": topic_mastery,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "reasoning": reasoning
        }

skill_profile_agent = SkillProfileAgent()
