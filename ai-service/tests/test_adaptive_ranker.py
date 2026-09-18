import pytest
from app.ml.question_ranker import question_ranker

@pytest.fixture
def ranker():
    return question_ranker

@pytest.fixture
def sample_questions():
    return [
        {"id": "q1", "title": "Array Sum", "difficulty": "Easy", "topic": "Array"},
        {"id": "q2", "title": "Reverse Linked List", "difficulty": "Easy", "topic": "Linked List"},
        {"id": "q3", "title": "Binary Tree Inorder", "difficulty": "Medium", "topic": "Binary Tree"},
        {"id": "q4", "title": "Graph BFS", "difficulty": "Hard", "topic": "Graph"},
        {"id": "q5", "title": "Valid Parentheses", "difficulty": "Easy", "topic": "Stack"},
        {"id": "q6", "title": "Two Sum", "difficulty": "Easy", "topic": "Array"},
    ]

def test_asked_question_penalty(ranker, sample_questions):
    """Verify asked questions are penalized with -100 score."""
    score, reasons = ranker.compute_candidate_score(
        sample_questions[0],
        detected_topics=[{"name": "Array", "probability": 0.9}],
        topic_mastery={"Array": 0.5},
        student_ability=0.35,
        asked_ids=["q1"]
    )
    assert score == -100.0
    assert "previously asked" in reasons

def test_topic_relevance_boost(ranker, sample_questions):
    """Verify questions matching detected topics get higher score than non-detected topics."""
    score_detected, _ = ranker.compute_candidate_score(
        sample_questions[1], # Linked List
        detected_topics=[{"name": "Linked List", "probability": 0.9}],
        topic_mastery={"Linked List": 0.5},
        student_ability=0.35,
        asked_ids=[]
    )
    score_other, _ = ranker.compute_candidate_score(
        sample_questions[3], # Graph
        detected_topics=[{"name": "Linked List", "probability": 0.9}],
        topic_mastery={"Graph": 0.5},
        student_ability=0.35,
        asked_ids=[]
    )
    assert score_detected > score_other

def test_rank_questions_descending(ranker, sample_questions):
    """Verify rank_questions returns sorted candidate list excluding asked questions."""
    ranked = ranker.rank_questions(
        sample_questions,
        detected_topics=[{"name": "Array", "probability": 0.8}, {"name": "Stack", "probability": 0.7}],
        topic_mastery={"Array": 0.5, "Stack": 0.5},
        student_ability=0.35,
        asked_ids=["q1"]
    )
    assert len(ranked) == 5
    assert not any(r['question']['id'] == "q1" for r in ranked)
    scores = [r['score'] for r in ranked]
    assert scores == sorted(scores, reverse=True)

def test_select_top_weighted_candidate_single(ranker):
    """Verify single candidate pool returns that candidate with prob 1.0."""
    single_pool = [{"question": {"id": "only_q"}, "score": 0.85, "reasons": []}]
    chosen = ranker.select_top_weighted_candidate(single_pool)
    assert chosen["question"]["id"] == "only_q"
    assert chosen["selection_prob"] == 1.0

def test_select_top_weighted_candidate_softmax_diversity(ranker, sample_questions):
    """Verify Softmax sampling over top candidates selects valid options and shows diversity across runs."""
    ranked = ranker.rank_questions(
        sample_questions,
        detected_topics=[{"name": "Array", "probability": 0.8}, {"name": "Stack", "probability": 0.7}],
        topic_mastery={"Array": 0.5, "Stack": 0.5},
        student_ability=0.35,
        asked_ids=[]
    )
    
    selected_ids = set()
    for _ in range(50):
        chosen = ranker.select_top_weighted_candidate(ranked, top_n=5, temperature=0.15)
        selected_ids.add(chosen["question"]["id"])
        assert 0.0 <= chosen["selection_prob"] <= 1.0
    
    # Across 50 samples with temperature 0.15, at least 2 distinct questions from top_n should be sampled
    assert len(selected_ids) >= 2
