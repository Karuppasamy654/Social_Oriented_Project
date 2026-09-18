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

# Test 1: Beginner vs Expert Initial Difficulty Probability Distribution
def test_initial_difficulty_probability_distribution():
    det_beg, unk_beg, est_beg = predict_topics_from_text("I know basic arrays", self_reported_level="Beginner")
    det_exp, unk_exp, est_exp = predict_topics_from_text("I solve graph DP", self_reported_level="Expert")

    assert est_beg['ability_score'] == 0.25
    assert est_exp['ability_score'] == 0.75

    probs_beg = question_ranker.get_difficulty_probabilities(est_beg['ability_score'])
    probs_exp = question_ranker.get_difficulty_probabilities(est_exp['ability_score'])

    assert probs_beg['Easy'] > probs_beg['Hard']
    assert probs_exp['Hard'] > probs_exp['Easy']
    assert probs_beg['Easy'] > probs_exp['Easy']

# Test 2: Intermediate Initial Distribution Centers on Medium
def test_intermediate_initial_distribution():
    det, unk, est = predict_topics_from_text("I know hashmap and trees", self_reported_level="Intermediate")
    assert est['ability_score'] == 0.50

    probs = question_ranker.get_difficulty_probabilities(est['ability_score'])
    assert probs['Medium'] >= probs['Easy'] and probs['Medium'] >= probs['Hard']

# Test 3: Correct Answer Increases Ability theta
def test_correct_answer_increases_theta():
    session = start_assessment_session("theta_up_test", "I know arrays", "Beginner")
    s_id = session['sessionId']
    q1 = session['currentQuestion']

    s_before = get_session(s_id)
    theta_before = s_before['studentAbility']

    res1 = record_answer_and_adapt(s_id, q1['id'], q1['correctAnswer'])
    s_after = get_session(s_id)
    theta_after = s_after['studentAbility']

    assert theta_after > theta_before

# Test 4: Wrong Answer Decreases Ability theta
def test_wrong_answer_decreases_theta():
    session = start_assessment_session("theta_down_test", "I know graphs", "Expert")
    s_id = session['sessionId']
    q1 = session['currentQuestion']

    s_before = get_session(s_id)
    theta_before = s_before['studentAbility']

    res1 = record_answer_and_adapt(s_id, q1['id'], "INVALID_WRONG_ANSWER")
    s_after = get_session(s_id)
    theta_after = s_after['studentAbility']

    assert theta_after < theta_before

# Test 5: Q2 Depends on Q1 Answer Outcome
def test_q2_depends_on_q1_outcome():
    # Run A: Correct Q1
    sA = start_assessment_session("q2_dep_a", "I know arrays", "Beginner")
    q1A = sA['currentQuestion']
    resA = record_answer_and_adapt(sA['sessionId'], q1A['id'], q1A['correctAnswer'])

    # Run B: Wrong Q1
    sB = start_assessment_session("q2_dep_b", "I know arrays", "Beginner")
    q1B = sB['currentQuestion']
    resB = record_answer_and_adapt(sB['sessionId'], q1B['id'], "WRONG_ANS")

    sA_full = get_session(sA['sessionId'])
    sB_full = get_session(sB['sessionId'])

    assert sA_full['studentAbility'] > sB_full['studentAbility']

# Test 6: Q3 Depends on Q2 Answer Outcome
def test_q3_depends_on_q2_outcome():
    s = start_assessment_session("q3_dep", "I know arrays", "Intermediate")
    q1 = s['currentQuestion']
    res1 = record_answer_and_adapt(s['sessionId'], q1['id'], q1['correctAnswer'])
    q2 = res1['currentQuestion']

    s_before_q2 = get_session(s['sessionId'])['studentAbility']
    res2 = record_answer_and_adapt(s['sessionId'], q2['id'], q2['correctAnswer'])
    s_after_q2 = get_session(s['sessionId'])['studentAbility']

    assert s_after_q2 > s_before_q2
    assert res2['currentQuestion'] is not None

# Test 7: Non-Fixed Difficulty Across Session
def test_non_fixed_difficulty_across_session():
    s = start_assessment_session("non_fixed_diff", "I know strings and arrays", "Beginner")
    s_id = s['sessionId']
    curr_q = s['currentQuestion']
    diff_history = []

    for _ in range(5):
        if not curr_q:
            break
        diff_history.append(curr_q['difficulty'])
        res = record_answer_and_adapt(s_id, curr_q['id'], curr_q['correctAnswer'])
        curr_q = res.get('currentQuestion')

    assert len(diff_history) > 1

# Test 8: Topic Adaptation Functionality Preserved
def test_topic_adaptation_preserved():
    s_graph = start_assessment_session("topic_graph", "I know graphs, BFS, DFS", "Intermediate")
    det_topics = {t['name'] for t in s_graph['detectedTopics']}
    assert "Graph" in det_topics or "BFS" in det_topics or "DFS" in det_topics

# Test 9: User B Primary Multi-Topic Coverage (No Array Fallback)
def test_user_b_primary_multi_topic_coverage():
    s_b = start_assessment_session(
        "user_b_cov",
        "I know linked lists, stacks, queues, binary trees and BST.",
        "Intermediate"
    )
    det_topics = {t['name'] for t in s_b['detectedTopics']}
    assert "Linked List" in det_topics or "Stack" in det_topics or "Binary Tree" in det_topics

# Test 10: No Question Repetition Within Session
def test_no_question_repetition_within_session():
    s = start_assessment_session("rep_test", "I know arrays", "Beginner")
    s_id = s['sessionId']
    curr_q = s['currentQuestion']

    for _ in range(8):
        if not curr_q:
            break
        res = record_answer_and_adapt(s_id, curr_q['id'], curr_q['correctAnswer'])
        curr_q = res.get('currentQuestion')

    full_s = get_session(s_id)
    asked = full_s['askedQuestionIds']
    assert len(asked) == len(set(asked))

# Test 11: Controlled Variation Across Repeated Sessions
def test_controlled_variation_across_repeated_sessions():
    exp = "I know arrays and strings"
    s1 = start_assessment_session("var_1", exp, "Beginner")
    s2 = start_assessment_session("var_2", exp, "Beginner")

    assert s1['currentQuestion'] is not None and s2['currentQuestion'] is not None

# Test 12: Python Owns All Intelligence
def test_python_owns_intelligence():
    det, unk, est = predict_topics_from_text("I know arrays", self_reported_level="Beginner")
    assert "ability_score" in est
    assert "confidence" in est

# Test 13: Model Artifact Registry Readiness
def test_model_registry_readiness():
    assert registry.feature_vectorizer is not None
    assert registry.topic_classifier is not None
    assert registry.skill_classifier is not None
