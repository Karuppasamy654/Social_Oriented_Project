import os
import pytest
from app.ml.topic_classifier import predict_topics_from_text
from app.ml.skill_classifier import predict_final_skill_profile

def test_experience_arrays_strings():
    """TEST 1: Experience = 'I know arrays and strings.'"""
    text = "I know arrays and strings."
    detected_topics, unknown_topics, initial_estimate = predict_topics_from_text(text)

    detected_names = [t['name'] for t in detected_topics]
    assert 'Array' in detected_names or 'String' in detected_names
    assert initial_estimate['initial_level'] in ['Beginner', 'Intermediate']

def test_experience_graphs_trees_dp():
    """TEST 2: Experience = 'I know graphs, trees and dynamic programming.'"""
    text = "I know graphs, trees and dynamic programming."
    detected_topics, unknown_topics, initial_estimate = predict_topics_from_text(text)

    detected_names = [t['name'] for t in detected_topics]
    assert 'Graph' in detected_names or 'Dynamic Programming' in detected_names or 'Tree' in detected_names
    assert initial_estimate['initial_level'] in ['Intermediate', 'Advanced']

def test_distinct_outputs_for_different_inputs():
    """CRITICAL TEST: Verify probability vectors differ for different inputs."""
    input_a = "I know arrays and strings."
    input_b = "I know graphs, trees and dynamic programming."

    topics_a, _, est_a = predict_topics_from_text(input_a)
    topics_b, _, est_b = predict_topics_from_text(input_b)

    names_a = [t['name'] for t in topics_a]
    names_b = [t['name'] for t in topics_b]

    assert names_a != names_b or est_a['ability_score'] != est_b['ability_score']

def test_never_studied_dsa():
    """TEST 3: Experience = 'I have never studied data structures.'"""
    text = "I have never studied data structures."
    detected_topics, unknown_topics, initial_estimate = predict_topics_from_text(text)

    # Must NOT infer strong advanced DSA topics
    detected_names = [t['name'] for t in detected_topics]
    assert 'Dynamic Programming' not in detected_names
    assert 'Graph' not in detected_names
    assert initial_estimate['initial_level'] == 'Beginner'

def test_skill_classifier_predictions():
    """Verify skill classifier generates valid probabilities and scores."""
    # Expert feature vector
    feat_expert = [0.95, 1.8, 0.9, 0.95, 0.1, 0.05, 0.92, 0.9, 0.95]
    level_exp, score_exp, conf_exp, probs_exp = predict_final_skill_profile(feat_expert, 'Expert')

    assert level_exp in ['Advanced', 'Expert']
    assert score_exp >= 0.80

    # Beginner feature vector
    feat_beg = [0.25, 0.4, 0.1, 0.3, 0.8, 0.8, 0.2, 0.2, 0.3]
    level_beg, score_beg, conf_beg, probs_beg = predict_final_skill_profile(feat_beg, 'Beginner')

    assert level_beg == 'Beginner'
    assert score_beg < 0.45
