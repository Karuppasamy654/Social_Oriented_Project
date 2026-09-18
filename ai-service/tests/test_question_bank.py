import pytest
from app.data.question_bank_loader import load_assessment_question_bank

def test_question_bank_size_and_schema():
    bank = load_assessment_question_bank()
    assert len(bank) >= 500

    required_keys = {'id', 'title', 'difficulty', 'topic', 'options', 'correctAnswer', 'source', 'license'}
    for q in bank[:20]:
        assert required_keys.issubset(set(q.keys()))
        assert q['difficulty'] in ['Easy', 'Medium', 'Hard']

def test_question_bank_topic_diversity():
    bank = load_assessment_question_bank()
    topics = {q['topic'] for q in bank}

    assert 'Array' in topics
    assert 'String' in topics
    assert 'Linked List' in topics
    assert 'Stack' in topics
    assert 'Binary Tree' in topics
    assert len(topics) >= 10
