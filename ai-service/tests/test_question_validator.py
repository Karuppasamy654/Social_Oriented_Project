"""
Pytest Unit Tests for Layer B Single-Answer Question Quality Validator
"""

import pytest
from app.data.question_schema import AssessmentQuestion
from app.data.question_validator import QuestionQualityValidator

def test_valid_single_answer_mcq():
    q = AssessmentQuestion(
        question_id="q_two_sum_concept",
        problem_id="two_sum",
        question_type="concept",
        learning_objective="identify_hash_map",
        question_text="Which data structure enables O(1) expected lookup for the complement in Two Sum?",
        options=["A) Stack", "B) Queue", "C) Hash Map", "D) Linked List"],
        correct_answer="C) Hash Map",
        explanation="Hash Map provides O(1) average lookup for target - val.",
        topic="Array",
        difficulty="Easy"
    )
    is_valid, reason = QuestionQualityValidator.validate_question(q)
    assert is_valid is True

def test_ambiguous_complexity_without_code_rejection():
    # Ambiguous complexity MCQ without explicit code snippet or algorithm reference
    q = AssessmentQuestion(
        question_id="q_bad_complexity",
        problem_id="two_sum",
        question_type="time_complexity",
        learning_objective="analyze_complexity",
        question_text="What is the time complexity of Two Sum?",
        options=["A) O(1)", "B) O(log N)", "C) O(N)", "D) O(N²)"],
        correct_answer="C) O(N)",
        explanation="Can be solved in O(N).",
        topic="Array",
        difficulty="Easy"
    )
    is_valid, reason = QuestionQualityValidator.validate_question(q)
    assert is_valid is False
    assert "requires code snippet or explicit algorithm specification" in reason

def test_valid_complexity_with_code():
    q = AssessmentQuestion(
        question_id="q_good_complexity",
        problem_id="two_sum",
        question_type="time_complexity",
        learning_objective="analyze_nested_loop",
        question_text="Consider the following brute-force nested-loop implementation of Two Sum:\nfor i in range(n):\n  for j in range(i+1, n):\n...",
        code="for i in range(n):\n  for j in range(i+1, n):\n    if nums[i] + nums[j] == target: return [i, j]",
        options=["A) O(1)", "B) O(log N)", "C) O(N)", "D) O(N²)"],
        correct_answer="D) O(N²)",
        explanation="Nested loops iterate N*(N-1)/2 times, resulting in O(N²) time complexity.",
        topic="Array",
        difficulty="Easy"
    )
    is_valid, reason = QuestionQualityValidator.validate_question(q)
    assert is_valid is True
