class OnboardingAgent:
    def analyze_experience(self, experience_text: str, detected_topics: list, initial_level: str):
        topic_names = [t['name'] for t in detected_topics]
        summary = f"Student reports experience in {', '.join(topic_names)}. Initial baseline level estimated as {initial_level}."
        
        return {
            "summary": summary,
            "detectedTopics": detected_topics,
            "initialLevel": initial_level,
            "recommendedAssessmentLength": 12
        }

onboarding_agent = OnboardingAgent()
