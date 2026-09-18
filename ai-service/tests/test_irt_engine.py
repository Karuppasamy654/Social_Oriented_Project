"""
Pytest Unit Tests for Layer C IRT Rasch Statistical Ability Engine
"""

import pytest
from app.ml.irt_engine import irt_engine, IRTEngine

def test_irt_probability_calculation():
    # When ability theta == item difficulty b, P(correct) == 0.50
    p = irt_engine.calculate_p_correct(theta=0.0, b=0.0)
    assert abs(p - 0.50) < 1e-4

    # When theta > b, P(correct) > 0.50
    p_high = irt_engine.calculate_p_correct(theta=1.4, b=0.0)
    assert p_high > 0.75

def test_irt_ability_update():
    theta_0 = 0.0
    # Correct response on Medium question increases theta
    theta_new, p_correct, error = irt_engine.update_ability(theta_0, "Medium", is_correct=True)
    assert theta_new > theta_0
    assert error > 0.0

    # Incorrect response on Medium question decreases theta
    theta_down, p_down, err_down = irt_engine.update_ability(theta_0, "Medium", is_correct=False)
    assert theta_down < theta_0
    assert err_down < 0.0

def test_fisher_information_gain():
    info = irt_engine.calculate_information(theta=0.0, b=0.0)
    assert info > 0.20
