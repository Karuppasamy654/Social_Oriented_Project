# Interview Speech Analysis Report

## ASR & Transcript Architecture
- **Speech-to-Text Pipeline:** Microphone input $\rightarrow$ Web Speech / Whisper ASR $\rightarrow$ Transcript text.
- **Objective Speech Metrics:**
  - `wpm`: Words per minute calculation.
  - `filler_word_count`: Detection of filler words ("um", "uh", "like", "basically").
  - `pause_count`: Pause interval measurement.
  - `speaking_duration_seconds`: Active response duration.

## Fairness & Non-Bias Controls
- **No Accent or Emotion Scoring:** Accent, pronunciation style, and vocal pitch are strictly excluded from technical skill scoring.
- **Content Grounding:** Technical scoring evaluates algorithmic correctness, reasoning, completeness, and clarity.
