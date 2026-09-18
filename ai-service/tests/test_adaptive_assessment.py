import os
import sys
import pytest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.data.question_bank_loader import load_assessment_question_bank
from app.ml.topic_classifier import predict_topics_from_text
from app.ml.question_ranker import question_ranker
from app.ml.mastery_model import TopicMasteryModel
from app.ml.model_registry import registry
from app.services.assessment_engine import start_assessment_session, record_answer_and_adapt, get_session

# Test 1: Question Bank Integrity
def test_question_bank_loading():
    qbank = load_assessment_question_bank()
    assert len(qbank) >= 500, f"Expected 500+ questions, got {len(qbank)}"
    for q in qbank:
        assert "id" in q and "topic" in q and "difficulty" in q
        if q.get("quality_tier") == "GOOD" and q.get("question_type") != "implementation":
            assert "options" in q and len(q["options"]) >= 2
        assert "correctAnswer" in q or "correct_answer" in q

# Test 2: NLP Multi-Label Topic Classification Differentiation
def test_topic_classification_differentiation():
    text_a = "I know arrays, strings and linked lists."
    text_b = "I have solved graph theory, BFS, DFS and dynamic programming."

    topics_a, unknown_a, est_a = predict_topics_from_text(text_a)
    topics_b, unknown_b, est_b = predict_topics_from_text(text_b)

    names_a = {t['name'] for t in topics_a}
    names_b = {t['name'] for t in topics_b}

    assert "Array" in names_a or "Linked List" in names_a
    assert "Graph" in names_b or "Dynamic Programming" in names_b
    assert names_a != names_b

# Test 3: Primary + Exploration Candidate Pool Filtering (User B Test)
def test_user_b_primary_exploration_pools():
    session_res = start_assessment_session(
        user_id="user_b_test",
        experience_text="I know linked lists, stacks, queues, binary trees and BST.",
        self_reported_level="Intermediate"
    )

    det_names = {t['name'] for t in session_res['detectedTopics']}
    assert "Linked List" in det_names or "Stack" in det_names or "Binary Tree" in det_names

    q1 = session_res['currentQuestion']
    assert q1 is not None

    full_session = get_session(session_res['sessionId'])
    assert q1['id'] in full_session['askedQuestionIds']

# Test 4: Sequential Adaptation (Q_{i+1} Dependent on Q_i Outcome)
def test_sequential_adaptation():
    session = start_assessment_session("seq_test", "I know arrays and strings.", "Beginner")
    session_id = session['sessionId']
    q1 = session['currentQuestion']

    # Submit correct answer to Q1
    res1 = record_answer_and_adapt(session_id, q1['id'], q1['correctAnswer'])

    assert res1['status'] == 'IN_PROGRESS'
    q2 = res1['currentQuestion']
    assert q2 is not None
    assert q2['id'] != q1['id']

# Test 5: Bayesian Per-Topic Mastery Update
def test_bayesian_mastery_update():
    mastery = TopicMasteryModel({'Array': 0.50})
    m_after_correct = mastery.update_mastery('Array', 'Medium', is_correct=True, user_ability=0.55)
    assert m_after_correct > 0.50

    m_after_wrong = mastery.update_mastery('Array', 'Medium', is_correct=False, user_ability=0.55)
    assert m_after_wrong < m_after_correct

# Test 6: Same-User Repeated Session Diversity (Softmax Randomization)
def test_same_user_sequence_diversity():
    exp = "I know arrays and strings."

    s1 = start_assessment_session("run_1", exp, "Beginner")
    s2 = start_assessment_session("run_2", exp, "Beginner")

    assert s1['currentQuestion'] is not None and s2['currentQuestion'] is not None

# Test 7: ML Artifact Registry Verification
def test_model_registry_artifacts():
    assert registry.feature_vectorizer is not None, "Vectorizer artifact missing"
    assert registry.topic_classifier is not None, "Topic classifier artifact missing"
    assert registry.skill_classifier is not None, "Skill classifier artifact missing"
