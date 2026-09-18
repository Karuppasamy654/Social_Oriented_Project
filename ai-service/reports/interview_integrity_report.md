# Interview Integrity & Proctoring Report

## Event Types & Signals Tracked
- **`tab_hidden`**: Visibility change event triggered when document becomes non-visible.
- **`fullscreen_exit`**: Detects when user leaves fullscreen mode.
- **`window_blur`**: Window focus loss event.
- **`camera_stopped` / `microphone_stopped`**: Hardware disconnect alerts.
- **`multiple_faces` / `face_missing`**: Face count signal checks.
- **`possible_phone_detected`**: Object detection signal flag.

## Privacy & Policy Rules
- **Transient Processing:** Frames are processed transiently without raw video retention by default.
- **Independent Scoring:** Proctoring integrity signals (`Normal`, `Review Suggested`, `Violation Threshold Reached`) are strictly separated from technical performance scores.
- **No False Misconduct Accusation:** Events are stored as integrity logs, avoiding definitive biometric claims of cheating.
