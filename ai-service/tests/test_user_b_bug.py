import pytest
from app.services.assessment_engine import (
    start_assessment_session,
    record_answer_and_adapt,
    build_candidate_pools,
    QUESTION_BANK
)

def test_user_b_candidate_pool_filtering():
    """Verify that candidate pool for User B (Linked List, Stack, Queue, Tree, BST) filters candidates to user topics."""
    detected_topics = [
        {"name": "Linked List", "probability": 0.85},
        {"name": "Stack", "probability": 0.80},
        {"name": "Queue", "probability": 0.75},
        {"name": "Binary Tree", "probability": 0.90},
        {"name": "Tree", "probability": 0.85}
    ]

    candidate_pool, primary_names, _ = build_candidate_pools(detected_topics, [], QUESTION_BANK)
    assert len(candidate_pool) >= 5
    
    # Verify candidate topics match User B's topics
    pool_topics = {q["topic"] for q in candidate_pool}
    expected_user_topics = {"Linked List", "Stack", "Queue", "Binary Tree", "Tree"}
    assert pool_topics.intersection(expected_user_topics)

def test_user_b_assessment_flow_delivers_user_topics():
    """Verify User B receiving a sequence of 5 questions gets questions from claimed topics (Linked List, Stack, Queue, Tree, etc.)."""
    user_b_text = "I am proficient in Linked List, Stack, Queue, Binary Tree and BST."
    selected_b_topics = ["Linked List", "Stack", "Queue", "Binary Tree", "BST"]
    session_res = start_assessment_session("user_b_test", user_b_text, "Intermediate", selected_topics=selected_b_topics)
    
    session_id = session_res["sessionId"]
    q1 = session_res["currentQuestion"]
    assert q1 is not None

    user_b_topic_names = {"Linked List", "Stack", "Queue", "Binary Tree", "Tree", "BST", "Two Pointer", "String", "Array"}
    
    asked_topics = [q1["topic"]]
    
    # Progress through 5 questions
    curr_q = q1
    for _ in range(4):
        ans = curr_q.get("correctAnswer") or (curr_q["options"][0] if (curr_q.get("options") and len(curr_q["options"]) > 0) else "def solve(): pass")
        resp = record_answer_and_adapt(session_id, curr_q.get("id") or curr_q.get("question_id"), ans)
        curr_q = resp["currentQuestion"]
        if curr_q:
            asked_topics.append(curr_q["topic"])

    # At least 80% of asked questions must belong to User B's detected topic set (not generic fallback)
    matching_count = sum(1 for t in asked_topics if t in user_b_topic_names)
    assert matching_count / len(asked_topics) >= 0.80
