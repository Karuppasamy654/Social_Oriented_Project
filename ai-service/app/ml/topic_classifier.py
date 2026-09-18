import os
from app.ml.model_registry import registry

try:
    import numpy as np  # type: ignore
except ImportError:
    np = None

TOPIC_TAXONOMY = [
    'Array', 'String', 'HashMap', 'Two Pointer', 'Sliding Window', 'Linked List',
    'Stack', 'Queue', 'Binary Tree', 'BST', 'Heap', 'Priority Queue', 'Graph',
    'BFS', 'DFS', 'Backtracking', 'Greedy', 'Dynamic Programming', 'Trie',
    'Union Find', 'Bit Manipulation', 'Recursion', 'Sorting', 'Binary Search',
    'Prefix Sum', 'Matrix', 'Intervals'
]

KEYWORD_MAP = {
    'Array': ['array', 'vector', 'matrix', 'subarray', 'arraylist'],
    'String': ['string', 'text', 'char', 'palindrome', 'anagram'],
    'HashMap': ['hash', 'map', 'dictionary', 'hashmap', 'hashtable'],
    'Linked List': ['linked list', 'singly linked', 'doubly linked', 'linkedlist', 'node pointer'],
    'Stack': ['stack', 'push', 'pop', 'parentheses', 'lifo'],
    'Queue': ['queue', 'fifo', 'deque'],
    'Binary Tree': ['binary tree', 'tree node', 'root node', 'leaf node'],
    'BST': ['bst', 'binary search tree', 'search_tree', 'inorder'],
    'Graph': ['graph', 'vertex', 'edge', 'adjacency', 'dijkstra'],
    'BFS': ['bfs', 'breadth first', 'level order'],
    'DFS': ['dfs', 'depth first', 'tree traversal'],
    'Dynamic Programming': ['dp', 'dynamic programming', 'knapsack', 'memoization', 'tabulation'],
    'Binary Search': ['binary search', 'bisect', 'sorted search'],
    'Two Pointer': ['two pointer', 'pointers', 'left right'],
    'Sliding Window': ['sliding window', 'window', 'subarray window'],
    'Heap': ['heap', 'min heap', 'max heap'],
    'Priority Queue': ['priority queue', 'priority'],
    'Trie': ['trie', 'prefix tree'],
    'Union Find': ['union find', 'disjoint set'],
    'Bit Manipulation': ['bitwise', 'xor', 'bitmask', 'shift operator', 'bit manipulation'],
    'Recursion': ['recursion', 'recursive'],
    'Backtracking': ['backtracking', 'nqueens', 'subsets'],
    'Sorting': ['sort', 'sorting', 'quicksort', 'mergesort'],
    'Prefix Sum': ['prefix sum', 'prefix']
}

def predict_topics_from_text(experience_text: str, user_selected_topics: list = None, self_reported_level: str = None):
    """
    Parses user experience text via TF-IDF vectorization and multi-label ML model inference.
    Combines text NLP predictions with user explicit topic selections and self-reported level prior.
    Returns:
      - detected_topics: List of dicts [{'name': topic, 'probability': prob}]
      - unknown_topics: List of topics with low or absent probability evidence
      - initial_skill_estimate: Dict with level, confidence, ability_score (theta_0)
    """
    text = (experience_text or '').strip()
    selected_set = set(user_selected_topics or [])

    vectorizer = getattr(registry, 'feature_vectorizer', None)
    classifier = getattr(registry, 'topic_classifier', None)


    detected_topics = []
    unknown_topics = []
    topic_probs = {}

    if vectorizer is not None and classifier is not None and text:
        try:
            X_vec = vectorizer.transform([text])
            if hasattr(classifier, "predict_proba"):
                probs_raw = classifier.predict_proba(X_vec)
                if isinstance(probs_raw, list) and len(probs_raw) > 0:
                    probs = [float(p[1]) if (hasattr(p, '__len__') and len(p) > 1) else float(p[0]) for p in probs_raw]
                elif np is not None and isinstance(probs_raw, np.ndarray):
                    probs = probs_raw[0].tolist()
                else:
                    preds = classifier.predict(X_vec)[0]
                    probs = [float(val) for val in preds]
            else:
                preds = classifier.predict(X_vec)[0]
                probs = [float(val) for val in preds]

            for idx, topic in enumerate(TOPIC_TAXONOMY):
                prob = probs[idx] if idx < len(probs) else 0.10
                topic_probs[topic] = max(0.01, min(0.99, round(float(prob), 4)))

        except Exception as e:
            print(f"[Warning] ML Topic Classifier Inference Error: {e}")

    # Keyword enrichment
    text_lower = text.lower()
    for topic in TOPIC_TAXONOMY:
        current_p = topic_probs.get(topic, 0.05)
        kws = KEYWORD_MAP.get(topic, [topic.lower()])
        if topic == 'Binary Search' and 'binary search tree' in text_lower:
            kws = [kw for kw in kws if kw != 'binary search']
        kw_matches = sum(1 for kw in kws if kw in text_lower)

        if kw_matches > 0:
            current_p = max(current_p, min(0.95, 0.50 + kw_matches * 0.20))
        if topic in selected_set:
            current_p = max(current_p, 0.85)

        topic_probs[topic] = round(current_p, 4)

        if current_p >= 0.35:
            detected_topics.append({'name': topic, 'probability': current_p})
        else:
            unknown_topics.append({'name': topic, 'probability': current_p})

    detected_topics.sort(key=lambda x: x['probability'], reverse=True)

    # Initial Ability Prior (theta_0) derived directly from self-reported level
    level = (self_reported_level or '').strip().capitalize()
    if level == 'Beginner':
        initial_level = 'Beginner'
        ability_score = 0.25
        confidence = 0.70
    elif level in ['Expert', 'Advanced']:
        initial_level = 'Expert' if level == 'Expert' else 'Advanced'
        ability_score = 0.75
        confidence = 0.85
    elif level == 'Intermediate':
        initial_level = 'Intermediate'
        ability_score = 0.50
        confidence = 0.80
    else:
        # Fallback to NLP topic heuristic if self-reported level unprovided
        adv_topics = {'Graph', 'BFS', 'DFS', 'Dynamic Programming', 'Trie', 'Union Find', 'Backtracking'}
        med_topics = {'Binary Tree', 'BST', 'Heap', 'Priority Queue', 'Two Pointer', 'Sliding Window', 'HashMap', 'Binary Search', 'Linked List', 'Stack', 'Queue'}

        detected_names = {t['name'] for t in detected_topics}
        has_adv = len(detected_names.intersection(adv_topics))
        has_med = len(detected_names.intersection(med_topics))

        if has_adv >= 2:
            initial_level = 'Advanced'
            ability_score = 0.75
            confidence = 0.85
        elif has_adv >= 1 or has_med >= 2:
            initial_level = 'Intermediate'
            ability_score = 0.50
            confidence = 0.78
        elif len(detected_topics) > 0:
            initial_level = 'Beginner'
            ability_score = 0.25
            confidence = 0.70
        else:
            initial_level = 'Beginner'
            ability_score = 0.15
            confidence = 0.60

    initial_estimate = {
        'initial_level': initial_level,
        'confidence': round(confidence, 2),
        'ability_score': round(ability_score, 2),
        'reason': f"Initial ability prior (theta_0 = {ability_score:.2f}) established for level '{initial_level}'."
    }

    return detected_topics, unknown_topics, initial_estimate
