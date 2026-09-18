"""
Pytest Unit Tests for Layer A Problem Schema & Boilerplate Rejection
"""

import pytest
from app.data.problem_schema import CodingProblem

def test_valid_coding_problem():
    prob = CodingProblem(
        problem_id="prob_two_sum",
        title="Two Sum",
        problem_statement="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        topics=["Array", "HashMap"],
        difficulty="Easy"
    )
    is_valid, reason = prob.validate_quality()
    assert is_valid is True
    assert reason == "Valid human-readable problem"

def test_boilerplate_rejection():
    prob = CodingProblem(
        problem_id="prob_bad",
        title="Generic Problem",
        problem_statement="Given complex structural inputs, design an optimal algorithm for combination sum matching constraints.",
        topics=["Array"],
        difficulty="Medium"
    )
    is_valid, reason = prob.validate_quality()
    assert is_valid is False
    assert "boilerplate" in reason.lower()
