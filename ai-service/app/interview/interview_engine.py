import uuid
import datetime
from typing import Dict, Any, List, Optional
from .interview_state import InterviewSessionState, QuestionHistoryItem, AnswerHistoryItem, IntegrityEvent, SpeechMetrics
from .interview_model_registry import get_interview_registry

class AIInterviewEngine:
    def __init__(self):
        self.registry = get_interview_registry()
        self.sessions: Dict[str, InterviewSessionState] = {}

    def start_session(
        self,
        user_id: str,
        company: str,
        role: str,
        level: str = "intern",
        interview_type: str = "Technical",
        duration_minutes: int = 45,
        weak_topics: List[str] = None
    ) -> InterviewSessionState:
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        now_str = datetime.datetime.now().isoformat()

        session = InterviewSessionState(
            session_id=session_id,
            user_id=user_id,
            company=company,
            role=role,
            level=level,
            interview_type=interview_type,
            target_duration_minutes=duration_minutes,
            started_at=now_str,
            current_state="STARTING",
            weak_topics=weak_topics or ["arrays", "graphs"]
        )

        # Retrieve candidates for warm-up / Question 1
        candidates = self.registry.retriever.retrieve_candidates(
            company=company,
            role=role,
            level=level,
            interview_type=interview_type,
            asked_ids=[],
            user_weak_topics=session.weak_topics
        )

        ranked = self.registry.ranker.rank_questions(
            candidates=candidates,
            target_company=company,
            target_role=role,
            target_level=level,
            weak_topics=session.weak_topics
        )

        selected_q = ranked[0] if ranked else candidates[0]

        q_item = QuestionHistoryItem(
            question_id=selected_q["question_id"],
            canonical_question=selected_q.get("canonical_question", selected_q.get("question_text")),
            question_text=selected_q["question_text"],
            question_type=selected_q.get("question_type", "dsa"),
            difficulty=selected_q.get("difficulty", "medium"),
            verification_status=selected_q.get("verification_status", "verified_reported"),
            provenance=selected_q.get("provenance", f"Verified Report ({company})"),
            topics=selected_q.get("topics", []),
            asked_at=now_str,
            source_url=selected_q.get("source_url"),
            coding_problem_slug=selected_q.get("coding_problem_slug")
        )

        session.question_history.append(q_item)
        session.current_question_index = 1
        session.current_state = "ANSWERING"
        session.is_coding_round = (q_item.question_type == "coding")
        session.active_coding_slug = q_item.coding_problem_slug

        self.sessions[session_id] = session
        return session

    def submit_answer(
        self,
        session_id: str,
        transcript: str,
        duration_seconds: float,
        user_code: Optional[str] = None
    ) -> Dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        # Rejection check for terminated sessions
        if session.current_state == "TERMINATED_INTEGRITY" or len(session.proctoring_events) >= 5:
            return {
                "success": False,
                "terminated": True,
                "reason": "integrity_threshold_reached",
                "status": "terminated_integrity",
                "session_id": session_id,
                "message": "Interview terminated due to integrity threshold. Answers cannot be submitted."
            }

        if not session.question_history:
            return {"success": False, "message": "No active question found."}

        current_q = session.question_history[-1]
        now_str = datetime.datetime.now().isoformat()

        # 1. Analyze speech
        speech_res = self.registry.speech_analyzer.analyze_transcript(
            transcript=transcript,
            duration_seconds=duration_seconds
        )
        speech_metrics = SpeechMetrics(
            wpm=speech_res["wpm"],
            filler_word_count=speech_res["filler_word_count"],
            pause_count=speech_res["pause_count"],
            speaking_duration_seconds=speech_res["speaking_duration_seconds"]
        )

        # 2. Evaluate answer
        eval_res = self.registry.answer_evaluator.evaluate_answer(
            question={
                "question_id": current_q.question_id,
                "topics": current_q.topics,
                "difficulty": current_q.difficulty
            },
            student_transcript=transcript,
            speech_metrics=speech_res,
            user_code=user_code
        )

        # 3. Update IRT ability
        new_theta = self.registry.answer_evaluator.update_irt_ability(
            current_theta=session.ability_theta,
            question_difficulty=current_q.difficulty,
            score_pct=eval_res["total_score_pct"]
        )
        session.ability_theta = new_theta

        # 4. Record answer
        ans_item = AnswerHistoryItem(
            question_id=current_q.question_id,
            transcript=transcript,
            answered_at=now_str,
            response_duration_seconds=duration_seconds,
            technical_score=eval_res["technical_score"],
            reasoning_score=eval_res["reasoning_score"],
            completeness_score=eval_res["completeness_score"],
            clarity_score=eval_res["clarity_score"],
            speech_metrics=speech_metrics,
            feedback=eval_res["feedback"],
            weak_concepts=eval_res["weak_concepts"],
            user_code=user_code
        )
        session.answer_history.append(ans_item)

        # Update session weak topics
        for wc in eval_res["weak_concepts"]:
            if wc not in session.weak_topics:
                session.weak_topics.append(wc)

        session.current_state = "EVALUATING"

        # Check if follow-up question is warranted
        needs_followup = False
        followup_text = None
        if eval_res["total_score_pct"] < 65.0:
            needs_followup = True
            followup_text = f"Based on your response to {current_q.canonical_question}, what specific condition or edge-case handling would prevent invalid operations?"

        return {
            "success": True,
            "session": session.dict(),
            "evaluation": eval_res,
            "needs_followup": needs_followup,
            "followup_text": followup_text
        }

    def next_question(self, session_id: str) -> Dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        # Rejection check for terminated sessions
        if session.current_state == "TERMINATED_INTEGRITY" or len(session.proctoring_events) >= 5:
            session.current_state = "TERMINATED_INTEGRITY"
            return {
                "session": session.dict(),
                "completed": True,
                "terminated": True,
                "reason": "integrity_threshold_reached",
                "status": "terminated_integrity",
                "question": None
            }

        # Question budget limit
        if len(session.question_history) >= 5:
            session.current_state = "COMPLETED"
            return {"session": session.dict(), "completed": True, "terminated": False, "question": None}

        asked_ids = [q.question_id for q in session.question_history]
        target_diff = "easy" if session.ability_theta < -0.5 else ("hard" if session.ability_theta > 0.5 else "medium")

        candidates = self.registry.retriever.retrieve_candidates(
            company=session.company,
            role=session.role,
            level=session.level,
            interview_type=session.interview_type,
            asked_ids=asked_ids,
            user_weak_topics=session.weak_topics,
            target_difficulty=target_diff
        )

        ranked = self.registry.ranker.rank_questions(
            candidates=candidates,
            target_company=session.company,
            target_role=session.role,
            target_level=session.level,
            weak_topics=session.weak_topics,
            target_difficulty=target_diff
        )

        selected_q = ranked[0] if ranked else candidates[0]
        now_str = datetime.datetime.now().isoformat()

        q_item = QuestionHistoryItem(
            question_id=selected_q["question_id"],
            canonical_question=selected_q.get("canonical_question", selected_q.get("question_text")),
            question_text=selected_q["question_text"],
            question_type=selected_q.get("question_type", "dsa"),
            difficulty=selected_q.get("difficulty", "medium"),
            verification_status=selected_q.get("verification_status", "verified_reported"),
            provenance=selected_q.get("provenance", f"Verified Report ({session.company})"),
            topics=selected_q.get("topics", []),
            asked_at=now_str,
            source_url=selected_q.get("source_url"),
            coding_problem_slug=selected_q.get("coding_problem_slug")
        )

        session.question_history.append(q_item)
        session.current_question_index += 1
        session.current_state = "ANSWERING"
        session.is_coding_round = (q_item.question_type == "coding")
        session.active_coding_slug = q_item.coding_problem_slug

        return {"session": session.dict(), "completed": False, "terminated": False, "question": q_item.dict()}

    def log_integrity_event(
        self,
        session_id: str,
        event_type: str,
        duration_ms: int = 0,
        severity: str = "medium"
    ) -> Dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        # Idempotency check: if session is already terminated
        if session.current_state == "TERMINATED_INTEGRITY":
            return {
                "success": True,
                "terminated": True,
                "reason": "integrity_threshold_reached",
                "integrity_flag_count": len(session.proctoring_events),
                "status": "terminated_integrity",
                "session_id": session_id,
                "message": "Interview already terminated due to integrity threshold."
            }

        ev_id = f"ev_{uuid.uuid4().hex[:8]}"
        now_str = datetime.datetime.now().isoformat()

        event = IntegrityEvent(
            event_id=ev_id,
            type=event_type,
            timestamp=now_str,
            duration_ms=duration_ms,
            severity=severity
        )
        session.proctoring_events.append(event)
        flag_count = len(session.proctoring_events)

        # Check maximum integrity threshold rule (5 flags)
        if flag_count >= 5:
            session.current_state = "TERMINATED_INTEGRITY"
            print(f"[INTEGRITY] Session {session_id} reached 5 flags. Gracefully terminating session.")
            return {
                "success": True,
                "terminated": True,
                "reason": "integrity_threshold_reached",
                "integrity_flag_count": flag_count,
                "status": "terminated_integrity",
                "session_id": session_id,
                "message": "Maximum integrity events (5) reached. Session gracefully terminated.",
                "logged_event": event.dict()
            }

        return {
            "success": True,
            "terminated": False,
            "integrity_flag_count": flag_count,
            "status": session.current_state,
            "session_id": session_id,
            "logged_event": event.dict()
        }

    def finish_session(self, session_id: str) -> Dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        if session.current_state != "TERMINATED_INTEGRITY":
            session.current_state = "COMPLETED"

        ans_dicts = [a.dict() for a in session.answer_history]
        ev_dicts = [e.dict() for e in session.proctoring_events]

        scores = self.registry.scorer.compute_final_score(
            answer_history=ans_dicts,
            interview_type=session.interview_type
        )
        proctoring_report = self.registry.proctoring_analyzer.analyze_events(ev_dicts)
        feedback_report = self.registry.feedback_engine.generate_feedback(
            answer_history=ans_dicts,
            weak_topics=session.weak_topics
        )
        prep_plan = self.registry.recommendation_engine.build_company_prep_plan(
            company=session.company,
            role=session.role,
            weak_topics=session.weak_topics,
            score_pct=scores["overall_score"] if scores["overall_score"] is not None else 0.0
        )

        n_ans = len(session.answer_history)
        n_accepted = len([a for a in session.answer_history if a.technical_score >= 80])

        return {
            "session": session.dict(),
            "scores": scores,
            "proctoring_report": proctoring_report,
            "feedback": feedback_report,
            "company_preparation_plan": prep_plan,
            "evidenceSummary": {
                "questionsPresented": len(session.question_history),
                "questionsAttempted": n_ans,
                "questionsEvaluated": n_ans,
                "codingProblemsAttempted": n_ans,
                "codingSubmissions": n_ans,
                "acceptedSubmissions": n_accepted
            },
            "scoreStatus": scores.get("score_status", "NOT_EVALUATED"),
            "mlPrediction": {
                "status": "unavailable" if n_ans == 0 else ("provisional" if n_ans < 2 else "evaluated"),
                "prediction": "Not available yet" if n_ans == 0 else ("Provisional readiness estimate" if n_ans < 2 else "Evaluated readiness profile"),
                "confidence": "None" if n_ans == 0 else ("Low" if n_ans < 2 else "High"),
                "model": "coding_readiness_v2",
                "modelVersion": "2.0.0"
            }
        }

_engine_instance = None

def get_interview_engine() -> AIInterviewEngine:
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = AIInterviewEngine()
    return _engine_instance
