import math

def extract_skill_features(data: dict) -> list:
    accuracy = float(data.get('accuracy', 0.5))
    solve_speed = float(data.get('solve_speed', 1.0))
    diff_success = float(data.get('diff_success', 0.5))
    accepted_rate = float(data.get('accepted_rate', 0.5))
    attempt_count = float(data.get('attempt_count', 2.0)) / 10.0
    hint_ratio = float(data.get('hint_ratio', 0.2))
    topic_mastery = float(data.get('topic_mastery', 0.5))
    edge_success = float(data.get('edge_success', 0.5))
    understanding_score = float(data.get('understanding_score', 0.5))

    return [
        accuracy,
        solve_speed,
        diff_success,
        accepted_rate,
        attempt_count,
        hint_ratio,
        topic_mastery,
        edge_success,
        understanding_score
    ]

def compute_cosine_similarity(vec1: list, vec2: list) -> float:
    """Computes cosine similarity using pure Python math."""
    if len(vec1) != len(vec2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot_product / (norm1 * norm2))
