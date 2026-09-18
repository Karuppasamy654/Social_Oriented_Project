"""
Pytest Unit Tests for Question Bank Quality & Eligibility Audit
"""

import pytest
from app.data.question_bank_loader import load_assessment_question_bank
from app.data.question_schema import VALID_QUESTION_TYPES as SUPPORTED_QUESTION_TYPES
from app.data.problem_schema import CodingProblem

@pytest.fixture
def question_bank():
    return load_assessment_question_bank()

def test_total_question_count_and_eligibility(question_bank):
    assert len(question_bank) > 0
    eligible = [q for q in question_bank if q.get('assessment_eligible', False)]
    ineligible = [q for q in question_bank if not q.get('assessment_eligible', False)]
    assert len(eligible) > 0
    assert len(ineligible) > 0
    assert len(eligible) + len(ineligible) == len(question_bank)

def test_eligible_questions_have_valid_structure(question_bank):
    eligible = [q for q in question_bank if q.get('assessment_eligible', False)]
    for q in eligible:
        assert q['quality_tier'] == 'GOOD'
        assert len(q['title']) >= 3
        assert q['question_type'] in SUPPORTED_QUESTION_TYPES
        if q['question_type'] != 'implementation':
            assert len(q['options']) >= 2
            assert q['correct_answer'] or q['correctAnswer']
        assert bool(q['source_problem']) or bool(q.get('source'))

def test_generic_boilerplate_detected():
    assert CodingProblem.is_generic_boilerplate("Given complex structural inputs, design an optimal algorithm") is True
    assert CodingProblem.is_generic_boilerplate("standard memory and time limit bounds") is True
    assert CodingProblem.is_generic_boilerplate("using string / frequency count") is True
    assert CodingProblem.is_generic_boilerplate("Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.") is False

def test_longest_palindromic_substring_disambiguated(question_bank):
    lp_q = next((q for q in question_bank if "longest palindromic substring" in q.get('title', '').lower() and q.get('question_type') == 'algorithm_selection' and q.get('assessment_eligible')), None)
    assert lp_q is not None
    assert lp_q['assessment_eligible'] is True
    assert lp_q['quality_tier'] == 'GOOD'
    assert any("Manacher" in opt for opt in lp_q['options'])
    assert "Manacher" in (lp_q.get('correct_answer') or lp_q.get('correctAnswer'))

def test_benchmark_problems_eligible(question_bank):
    benchmarks = ["Two Sum", "Valid Parentheses", "Reverse Linked List", "Binary Search"]
    eligible_titles = [q['title'].lower() for q in question_bank if q.get('assessment_eligible', False)]
    for b in benchmarks:
        assert any(b.lower() in t for t in eligible_titles)
