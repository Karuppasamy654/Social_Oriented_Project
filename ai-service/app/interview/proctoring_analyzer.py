from typing import List, Dict, Any

class ProctoringAnalyzer:
    def __init__(self, max_visibility_violations: int = 3):
        self.max_visibility_violations = max_visibility_violations

    def analyze_events(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        counts = {
            "tab_hidden": 0,
            "fullscreen_exit": 0,
            "window_blur": 0,
            "camera_stopped": 0,
            "microphone_stopped": 0,
            "multiple_faces": 0,
            "face_missing": 0,
            "possible_phone_detected": 0
        }

        for ev in events:
            ev_type = ev.get("type") or ev.get("event") or ""
            ev_type_lower = ev_type.lower()
            if "tab" in ev_type_lower or "hidden" in ev_type_lower:
                counts["tab_hidden"] += 1
            elif "fullscreen" in ev_type_lower:
                counts["fullscreen_exit"] += 1
            elif "blur" in ev_type_lower:
                counts["window_blur"] += 1
            elif "camera" in ev_type_lower:
                counts["camera_stopped"] += 1
            elif "mic" in ev_type_lower:
                counts["microphone_stopped"] += 1
            elif "multiple" in ev_type_lower and "face" in ev_type_lower:
                counts["multiple_faces"] += 1
            elif "missing" in ev_type_lower or "no_face" in ev_type_lower:
                counts["face_missing"] += 1
            elif "phone" in ev_type_lower:
                counts["possible_phone_detected"] += 1

        total_violations = (
            counts["tab_hidden"] +
            counts["fullscreen_exit"] +
            counts["multiple_faces"] +
            counts["possible_phone_detected"]
        )

        if total_violations == 0:
            status = "Normal"
            summary = "Session conducted cleanly with no integrity flags."
        elif total_violations <= self.max_visibility_violations:
            status = "Review Suggested"
            summary = f"Minor integrity signals logged ({total_violations} total). Review recommended."
        else:
            status = "Integrity Violation Threshold Reached"
            summary = f"Configured violation threshold exceeded ({total_violations} total integrity flags)."

        return {
            "status": status,
            "summary": summary,
            "total_event_count": len(events),
            "event_counts": counts,
            "policy_threshold": self.max_visibility_violations
        }
