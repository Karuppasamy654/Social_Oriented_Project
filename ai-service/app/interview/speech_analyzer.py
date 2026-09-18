import re
from typing import Dict, Any

class SpeechAnalyzer:
    FILLER_WORDS = {"um", "uh", "like", "you know", "basically", "actually", "so", "right", "mean"}

    def analyze_transcript(
        self,
        transcript: str,
        duration_seconds: float,
        latency_seconds: float = 0.0
    ) -> Dict[str, Any]:
        transcript = (transcript or "").strip()
        words = re.findall(r'\w+', transcript.lower())
        word_count = len(words)

        duration_minutes = max(duration_seconds / 60.0, 0.05)
        wpm = round(word_count / duration_minutes, 1)

        filler_count = sum(1 for word in words if word in self.FILLER_WORDS)

        # Estimate pauses from punctuation or long silence intervals
        pause_count = len(re.findall(r'[.,;?!]', transcript))

        return {
            "wpm": wpm,
            "word_count": word_count,
            "filler_word_count": filler_count,
            "pause_count": pause_count,
            "response_latency_seconds": round(latency_seconds, 2),
            "speaking_duration_seconds": round(duration_seconds, 2)
        }
