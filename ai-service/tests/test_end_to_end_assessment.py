"""
Pytest Integration Tests for Complete Adaptive Assessment API Flow
"""

import pytest
from app.services.assessment_engine import start_assessment_session, record_answer_and_adapt, finish_assessment_session

def test_full_adaptive_assessment_workflow():
    # 1. Start Session
    user_id = "test_e2e_student"
    exp_text = "I am proficient in Linked List, Stack, Queue, Binary Tree and BST."
    session_res = start_assessment_session(user_id, exp_text, "Intermediate")

    assert "sessionId" in session_res
    session_id = session_res["sessionId"]
    assert session_res["status"] == "IN_PROGRESS"
    
    q1 = session_res["currentQuestion"]
    assert q1 is not None

    # 2. Answer 10 questions sequentially
    curr_q = q1
    step = 1
    while curr_q is not None and step <= 14:
        ans_res = record_answer_and_adapt(
            session_id=session_id,
            question_id=curr_q.get("id") or curr_q.get("question_id"),
            user_answer=curr_q.get("correctAnswer") or curr_q.get("correct_answer") or "choice"
        )
        if ans_res.get("status") == "COMPLETED":
            break
        curr_q = ans_res.get("currentQuestion")
        step += 1

    # 3. Verify Final Profile
    final_res = finish_assessment_session(session_id)
    assert final_res["status"] == "COMPLETED"
    profile = final_res["finalProfile"]
    assert "overall_skill" in profile
    assert profile["overall_skill"]["ability_theta"] is not None
    assert len(profile["strengths"]) > 0
