import re
import difflib
from typing import Dict, Any

def tokenize_code(code: str) -> List[str]:
    """Extracts code tokens ignoring whitespace and comments."""
    cleaned = re.sub(r'//.*|/\*[\s\S]*?\*/', '', code)
    tokens = re.findall(r'[a-zA-Z_]\w*|[^\s\w]', cleaned)
    return tokens

def compute_code_similarity(student_code: str, reference_code: str = "") -> Dict[str, Any]:
    """
    Computes objective code representation and structural similarity metrics.
    Provides objective similarity signals ONLY. Never makes accusations of cheating.
    """
    if not student_code or not reference_code:
        return {
            "reference_similarity": 0.0,
            "ast_similarity": 0.0,
            "token_similarity": 0.0,
            "similarity_signal": "low_similarity",
            "description": "Insufficient baseline comparison code."
        }

    # 1. Token Sequence Similarity
    s_tokens = tokenize_code(student_code)
    r_tokens = tokenize_code(reference_code)

    seq_matcher = difflib.SequenceMatcher(None, s_tokens, r_tokens)
    token_sim = round(seq_matcher.ratio(), 2)

    # 2. Normalized Text Levenshtein Ratio
    text_matcher = difflib.SequenceMatcher(None, student_code.strip(), reference_code.strip())
    ref_sim = round(text_matcher.ratio(), 2)

    # 3. Structural Keyword / AST Pattern Similarity
    keywords = ['for', 'while', 'if', 'else', 'return', 'unordered_map', 'vector', 'sort', 'ListNode', 'TreeNode']
    s_kw = [t for t in s_tokens if t in keywords]
    r_kw = [t for t in r_tokens if t in keywords]

    kw_matcher = difflib.SequenceMatcher(None, s_kw, r_kw)
    ast_sim = round(kw_matcher.ratio(), 2)

    signal_level = "low_similarity"
    if token_sim > 0.85 and ref_sim > 0.85:
        signal_level = "high_similarity"
    elif token_sim > 0.60:
        signal_level = "moderate_similarity"

    return {
        "reference_similarity": ref_sim,
        "ast_similarity": ast_sim,
        "token_similarity": token_sim,
        "similarity_signal": signal_level,
        "description": f"Code similarity score: {token_sim * 100}% token match relative to reference implementation."
    }
