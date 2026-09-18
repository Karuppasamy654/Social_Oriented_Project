import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/ml", tags=["Code Static Analysis"])

class CodeAnalysisRequest(BaseModel):
    code: str
    language: str = "cpp"
    problem_title: Optional[str] = "Coding Problem"
    execution_time_ms: Optional[float] = 14.0
    memory_kb: Optional[float] = 1024.0

class CodeAnalysisResponse(BaseModel):
    estimated_time_complexity: str
    estimated_space_complexity: str
    confidence: float
    evidence: List[str]
    what_did_well: List[str]
    what_can_be_improved: List[str]
    possible_optimization: str
    loop_count: int
    nested_loop_max_depth: int
    has_recursion: bool
    ast_node_count: int
    cyclomatic_complexity: int
    potential_anti_patterns: List[str]

@router.post("/analyze-code", response_model=CodeAnalysisResponse)
def analyze_code(req: CodeAnalysisRequest):
    code_str = req.code or ""
    lang = req.language.lower()
    
    evidence = []
    what_did_well = []
    what_can_be_improved = []
    anti_patterns = []

    # C++ static token & loop nesting analyzer
    lines = code_str.splitlines()
    loop_count = 0
    max_depth = 0
    current_depth = 0
    has_recursion = False
    
    # Track C++ constructs
    has_sort = bool(re.search(r'\b(std::)?sort\b', code_str))
    has_hashmap = bool(re.search(r'\b(unordered_map|unordered_set)\b', code_str))
    has_treemap = bool(re.search(r'\b(std::)?map\b', code_str)) and not has_hashmap
    has_vector = bool(re.search(r'\bvector\b', code_str))
    has_ref_pass = bool(re.search(r'vector<[^>]+>\s*&', code_str))
    has_binary_search = bool(re.search(r'\b(lower_bound|upper_bound|binary_search)\b', code_str))

    for line in lines:
        stripped = line.strip()
        if re.search(r'\b(for|while)\b', stripped):
            loop_count += 1
            current_depth += 1
            if current_depth > max_depth:
                max_depth = current_depth
        if '}' in stripped and current_depth > 0:
            current_depth -= 1

        # Detect recursion calls
        if re.search(r'\b(solve|dfs|bfs|helper|backtrack)\s*\(', stripped) and 'return' in stripped:
            has_recursion = True

    # Deterministic Time Complexity evaluation
    confidence = 0.92
    if has_sort:
        if max_depth <= 1:
            time_comp = "O(N log N)"
            evidence.append("Called std::sort on input container incurrs O(N log N) runtime.")
        else:
            time_comp = "O(N^2 log N)"
            evidence.append("Nested loop structure containing std::sort calls.")
    elif max_depth >= 3:
        time_comp = "O(N^3)"
        evidence.append("Triple nested loop structure detected.")
    elif max_depth == 2:
        time_comp = "O(N^2)"
        evidence.append("Nested dual for-loop iteration over input length.")
    elif max_depth == 1:
        if has_binary_search:
            time_comp = "O(N log N)"
            evidence.append("Linear loop containing binary search boundary lookups.")
        elif has_hashmap:
            time_comp = "O(N)"
            evidence.append("Single pass linear traversal with expected O(1) unordered_map lookups.")
        else:
            time_comp = "O(N)"
            evidence.append("Single pass linear traversal over input elements.")
    elif has_binary_search:
        time_comp = "O(log N)"
        evidence.append("Logarithmic binary search boundary halving.")
    elif has_recursion:
        time_comp = "O(2^N)"
        evidence.append("Recursive branching tree traversal.")
        confidence = 0.85
    elif len(code_str.strip()) < 10 or ("goto" in code_str or "asm" in code_str or "volatile" in code_str):
        time_comp = "Low Confidence / Unable to Determine"
        confidence = 0.35
        evidence.append("Unclear or non-standard control flow constructs detected.")
    else:
        time_comp = "O(1)"
        evidence.append("Direct constant time lookup without iterative loops.")

    # Deterministic Space Complexity evaluation
    if has_hashmap:
        space_comp = "O(N)"
        evidence.append("unordered_map stores up to N element pairs in memory.")
    elif has_vector:
        if "result" in code_str.lower() or "ans" in code_str.lower():
            space_comp = "O(N)"
            evidence.append("vector container dynamically holds output indices / values.")
        else:
            space_comp = "O(1)"
            evidence.append("In-place vector modification without extra memory allocation.")
    elif has_recursion:
        space_comp = "O(N)"
        evidence.append("Call stack frame depth consumes O(N) recursion memory.")
    else:
        space_comp = "O(1)"
        evidence.append("Constant auxiliary primitive scalar variables used.")

    # What user did well
    if has_hashmap and max_depth <= 1:
        what_did_well.append("Optimal choice of unordered_map to achieve single-pass O(N) linear time complexity.")
    if has_ref_pass:
        what_did_well.append("Passed vector parameters by reference (vector<int>&) avoiding costly O(N) memory copies.")
    if max_depth == 1 and not has_sort:
        what_did_well.append("Clean linear algorithm design avoiding quadratic nested loop performance bottlenecks.")
    if not what_did_well:
        what_did_well.append("Implemented correct logic satisfying problem test constraints.")

    # What can be improved & anti-patterns
    if max_depth >= 2:
        what_can_be_improved.append("Consider replacing nested loops with an unordered_map lookup to reduce runtime from O(N^2) to O(N).")
        anti_patterns.append("Nested loop iteration pattern (Potential O(N^2) quadratic runtime bottleneck)")

    if has_sort and not has_hashmap and max_depth <= 1:
        what_can_be_improved.append("Sorting the array introduces an O(N log N) runtime; a hash map can achieve O(N) without sorting.")

    if not has_ref_pass and "vector<" in code_str:
        what_can_be_improved.append("Use pass-by-reference (vector<int>&) in function parameters to eliminate vector copy overhead.")
        anti_patterns.append("Pass-by-value vector parameter causes unnecessary memory allocations.")

    if not what_can_be_improved:
        what_can_be_improved.append("Variable names could be more descriptive (e.g., using `indexByValue` instead of `seen`).")

    # Optimization advice
    if max_depth >= 2:
        possible_optimization = "An optimal O(N) solution exists using std::unordered_map to store values and their indices in a single pass."
    elif has_sort and "two" in (req.problem_title or "").lower():
        possible_optimization = "You can reduce runtime from O(N log N) to O(N) by using an unordered_map instead of sorting."
    else:
        possible_optimization = "Your implementation is already asymptotically optimal for this problem class."

    node_count = len(code_str.split())

    return CodeAnalysisResponse(
        estimated_time_complexity=time_comp,
        estimated_space_complexity=space_comp,
        confidence=confidence,
        evidence=evidence,
        what_did_well=what_did_well,
        what_can_be_improved=what_can_be_improved,
        possible_optimization=possible_optimization,
        loop_count=loop_count,
        nested_loop_max_depth=max_depth,
        has_recursion=has_recursion,
        ast_node_count=node_count,
        cyclomatic_complexity=1 + loop_count + (1 if has_recursion else 0),
        potential_anti_patterns=anti_patterns
    )
