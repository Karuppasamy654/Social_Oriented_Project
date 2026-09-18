import re
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.code_intelligence.code_feature_extractor import extract_student_profile, StudentImplementationProfile
from app.code_intelligence.question_grounding import validate_question_grounding

router = APIRouter(prefix="/ml/understanding", tags=["Post-Submission Grounded Viva Engine"])

# In-memory viva sessions store
viva_sessions_db: Dict[str, Dict[str, Any]] = {}

class QuestionGenRequest(BaseModel):
    user_code: str
    problem_title: str = "Two Sum"
    language: str = "cpp17"
    problem_id: str = "two-sum"

class QuestionItem(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_option_index: int
    correct_answer: str
    explanation: str
    concept: str
    code_evidence: str
    evidence: List[str] = []
    question_type: str = "code_reasoning"
    difficulty: str = "medium"
    submission_id: Optional[str] = None
    problem_id: Optional[str] = None
    code_snapshot_hash: Optional[str] = None
    viva_session_id: Optional[str] = None
    question_fingerprint: Optional[str] = None

class VivaStartRequest(BaseModel):
    submission_id: str
    user_code: str
    problem_id: str = "two-sum"
    problem_title: str = "Two Sum"

class VivaAnswerRequest(BaseModel):
    viva_session_id: str
    question_id: str
    selected_index: int

class VivaResponse(BaseModel):
    viva_session_id: str
    submission_id: str
    problem_id: str
    status: str
    current_question_index: int
    total_questions: int
    current_question: Optional[QuestionItem] = None
    profile: Optional[Dict[str, Any]] = None
    score: float = 0.0
    feedback: Optional[str] = None

class UnderstandingEvalRequest(BaseModel):
    answers: List[Dict[str, Any]]
    questions: List[QuestionItem]

class UnderstandingEvalResponse(BaseModel):
    understanding_score: float
    status: str
    feedback: str


def build_candidate_questions(profile: StudentImplementationProfile, user_code: str) -> List[QuestionItem]:
    """
    Builds a rich pool of candidate questions derived STRICTLY from profile features & user code.
    No unwritten variables, unwritten data structures, or hallucinated algorithms allowed.
    """
    code_lower = (user_code or "").lower()
    candidates: List[QuestionItem] = []
    
    # Primary variables
    vec_candidates = [v for v in profile.variables if v not in ['i', 'j', 'k', 'n', 'm', 'idx', 'left', 'right', 'low', 'high', 'val', 'sum', 'complement', 'seen', 'mp', 'm']]
    vec_var = vec_candidates[0] if vec_candidates else "nums"
    loop_vars = [v for v in profile.variables if v in ['i', 'j', 'k', 'idx', 'left', 'right', 'low', 'high']]
    var_i = loop_vars[0] if len(loop_vars) > 0 else "i"
    var_j = loop_vars[1] if len(loop_vars) > 1 else "j"

    # --- 1. NESTED LOOPS / BRUTE FORCE CANDIDATES ---
    if profile.nested_loop_depth >= 2:
        candidates.append(QuestionItem(
            id="q_nested_loops_reasoning",
            question=f"In your solution for '{profile.problem_title}', why does your code use two nested loops with iterators `{var_i}` and `{var_j}`?",
            options=[
                f"To perform a pair-wise comparison checking every unique pair of elements in `{vec_var}` for the target condition.",
                f"To automatically sort `{vec_var}` into ascending order.",
                f"To double the size of `{vec_var}` in heap memory.",
                f"To create a binary search tree from `{vec_var}`."
            ],
            correct_option_index=0,
            correct_answer=f"To perform a pair-wise comparison checking every unique pair of elements in `{vec_var}` for the target condition.",
            explanation="Nested loops iterate through all combinations of elements to check candidate pairs.",
            concept="Code Reasoning & Control Flow",
            code_evidence=f"Outer loop using `{var_i}` (line 5) and inner loop using `{var_j}` (line 6).",
            evidence=[f"for-loop iterator {var_i}", f"nested for-loop iterator {var_j}"],
            question_type="code_reasoning",
            difficulty="easy"
        ))

        candidates.append(QuestionItem(
            id="q_nested_loops_indexing",
            question=f"In your inner loop initialization `for (int {var_j} = {var_i} + 1; ...)` , what does `{var_j} = {var_i} + 1` prevent?",
            options=[
                f"It prevents comparing an element with itself and avoids re-checking previously tested pairs.",
                f"It prevents memory stack overflow errors in C++.",
                f"It forces the inner loop to run backwards.",
                f"It converts vector elements into pointers."
            ],
            correct_option_index=0,
            correct_answer=f"It prevents comparing an element with itself and avoids re-checking previously tested pairs.",
            explanation="Starting j at i + 1 ensures distinct index pairs (i != j) and avoids redundant symmetric checks.",
            concept="Loop Invariants & Boundaries",
            code_evidence=f"Initialization `int {var_j} = {var_i} + 1` in inner loop.",
            evidence=[f"initialization {var_j} = {var_i} + 1"],
            question_type="code_reasoning",
            difficulty="medium"
        ))

        candidates.append(QuestionItem(
            id="q_brute_force_complexity",
            question=f"What is the worst-case time complexity of your exact implementation for '{profile.problem_title}'?",
            options=[
                f"O(N^2) quadratic time complexity because of the two nested loops scanning elements.",
                "O(N) linear time complexity.",
                "O(N log N) logarithmic sorting complexity.",
                "O(1) constant time complexity."
            ],
            correct_option_index=0,
            correct_answer=f"O(N^2) quadratic time complexity because of the two nested loops scanning elements.",
            explanation="Two nested loops iterating up to N elements execute N*(N-1)/2 iterations = O(N^2).",
            concept="Time Complexity Analysis",
            code_evidence=f"Nested loops depth = {profile.nested_loop_depth}.",
            evidence=[f"nested loops with depth {profile.nested_loop_depth}"],
            question_type="complexity",
            difficulty="easy"
        ))

        candidates.append(QuestionItem(
            id="q_brute_force_space",
            question="What is the auxiliary space complexity of your current implementation?",
            options=[
                "O(1) constant auxiliary space since no additional dynamic data structures are allocated.",
                "O(N) linear space complexity.",
                "O(N^2) quadratic space complexity.",
                "O(log N) space complexity."
            ],
            correct_option_index=0,
            correct_answer="O(1) constant auxiliary space since no additional dynamic data structures are allocated.",
            explanation="Only loop iterator variables are stored in primitive stack memory, requiring O(1) space.",
            concept="Space Complexity Analysis",
            code_evidence="Primitive variables without hash map / vector allocations.",
            evidence=["no extra data structures instantiated"],
            question_type="complexity",
            difficulty="easy"
        ))

        candidates.append(QuestionItem(
            id="q_brute_force_optimization_alt",
            question=f"Your solution runs in O(N^2) time. How could a hash table (unordered_map) approach optimize search time for '{profile.problem_title}'?",
            options=[
                "By storing seen numbers and their indices, lookups take expected O(1) time, reducing total time to O(N).",
                "By sorting the vector in O(1) time.",
                "By eliminating all conditional if statements.",
                "By reducing memory usage to negative bytes."
            ],
            correct_option_index=0,
            correct_answer="By storing seen numbers and their indices, lookups take expected O(1) time, reducing total time to O(N).",
            explanation="Trading space O(N) for time efficiency allows finding complements in expected O(1) lookup time.",
            concept="Algorithm Optimization",
            code_evidence="O(N^2) nested loops baseline implementation.",
            evidence=["O(N^2) time complexity evidence"],
            question_type="optimization",
            difficulty="hard"
        ))

    # --- 2. HASHING (UNORDERED_MAP / MAP) CANDIDATES ---
    if profile.hashing:
        map_var = [v for v in profile.variables if v in ['seen', 'mp', 'm', 'map', 'hash', 'lookup'] or 'map' in v or 'hash' in v]
        map_name = map_var[0] if map_var else "seen"

        candidates.append(QuestionItem(
            id="q_hash_ds_role",
            question=f"In your solution, you declared `{map_name}` as a hash table. What is stored as the key and value in `{map_name}`?",
            options=[
                f"`{map_name}` stores vector element values as keys and their corresponding array indices as values.",
                f"`{map_name}` stores indices as keys and pointer addresses as values.",
                f"`{map_name}` stores character ASCII values as keys and line numbers as values.",
                f"`{map_name}` automatically sorts elements in descending order."
            ],
            correct_option_index=0,
            correct_answer=f"`{map_name}` stores vector element values as keys and their corresponding array indices as values.",
            explanation="Unordered maps allow mapping from element value to its original index for instant lookup.",
            concept="Data Structure Selection",
            code_evidence=f"Declared hash table variable `{map_name}`.",
            evidence=[f"hash table declaration {map_name}"],
            question_type="data_structure",
            difficulty="easy"
        ))

        candidates.append(QuestionItem(
            id="q_hash_complexity",
            question=f"What is the expected time and space complexity of your hash-map solution?",
            options=[
                "Expected O(N) time complexity and O(N) space complexity.",
                "O(N^2) time complexity and O(1) space complexity.",
                "O(N log N) time complexity and O(1) space complexity.",
                "O(1) time complexity and O(1) space complexity."
            ],
            correct_option_index=0,
            correct_answer="Expected O(N) time complexity and O(N) space complexity.",
            explanation="Single pass iteration with expected O(1) hash map operations takes O(N) time and O(N) space.",
            concept="Time & Space Complexity",
            code_evidence="Single loop with hash map operations.",
            evidence=["unordered_map lookup and single loop"],
            question_type="complexity",
            difficulty="medium"
        ))

    # --- 3. SORTING CANDIDATES ---
    if profile.sorting:
        candidates.append(QuestionItem(
            id="q_sorting_complexity",
            question="Your code calls `std::sort`. What is the time complexity introduced by sorting?",
            options=[
                "O(N log N) average and worst-case time complexity.",
                "O(N) linear time complexity.",
                "O(N^2) quadratic time complexity.",
                "O(1) constant time complexity."
            ],
            correct_option_index=0,
            correct_answer="O(N log N) average and worst-case time complexity.",
            explanation="std::sort uses Introsort (QuickSort + HeapSort + InsertionSort) guaranteeing O(N log N).",
            concept="Algorithm Complexity",
            code_evidence="Call to std::sort in code.",
            evidence=["std::sort call present"],
            question_type="complexity",
            difficulty="medium"
        ))

    # --- 4. RECURSION CANDIDATES ---
    if profile.recursion:
        candidates.append(QuestionItem(
            id="q_recursion_base_case",
            question="In your recursive function, why is the base case condition essential?",
            options=[
                "It stops recursive calls and prevents stack overflow runtime crashes.",
                "It sorts the array in memory.",
                "It converts loop variables into pointers.",
                "It speeds up compiler execution time by 10x."
            ],
            correct_option_index=0,
            correct_answer="It stops recursive calls and prevents stack overflow runtime crashes.",
            explanation="Every recursive function requires a base case to terminate execution stack frames.",
            concept="Recursion Mechanics",
            code_evidence="Recursive function invocation present.",
            evidence=["self-calling recursive function"],
            question_type="code_reasoning",
            difficulty="medium"
        ))

    # --- 5. LINKED LIST CANDIDATES ---
    if profile.linked_list:
        candidates.append(QuestionItem(
            id="q_linked_list_traversal",
            question="In your linked list code, how does your pointer traversal step advance to the next node?",
            options=[
                "By updating the node pointer via `curr = curr->next` until `nullptr` is reached.",
                "By accessing array indices like `list[i]`.",
                "By calling `std::sort` on the head node.",
                "By allocating new vector memory."
            ],
            correct_option_index=0,
            correct_answer="By updating the node pointer via `curr = curr->next` until `nullptr` is reached.",
            explanation="Linked lists are traversed sequentially by following next pointers.",
            concept="Data Structure Mechanics",
            code_evidence="ListNode pointer assignment with `->next`.",
            evidence=["ListNode pointer navigation ->next"],
            question_type="code_reasoning",
            difficulty="easy"
        ))

    # --- 6. TREE CANDIDATES ---
    if profile.tree:
        candidates.append(QuestionItem(
            id="q_tree_traversal",
            question="How does your binary tree implementation handle terminal leaf nodes?",
            options=[
                "By checking if the current node pointer is `nullptr` before dereferencing `left` or `right`.",
                "By calling vector clear() on node values.",
                "By computing hash keys for leaf nodes.",
                "By returning a string index."
            ],
            correct_option_index=0,
            correct_answer="By checking if the current node pointer is `nullptr` before dereferencing `left` or `right`.",
            explanation="Tree traversal algorithms guard against null pointer exceptions by verifying `node != nullptr`.",
            concept="Tree Traversal",
            code_evidence="TreeNode left/right pointer dereference.",
            evidence=["TreeNode traversal pointers"],
            question_type="edge_case",
            difficulty="medium"
        ))

    # --- 7. GENERAL PASS-BY-REFERENCE / MEMORY CANDIDATE ---
    if "&" in user_code:
        candidates.append(QuestionItem(
            id="q_cpp_pass_by_reference",
            question=f"In your function signature, why is parameter `{vec_var}` passed by reference (`vector<int>&`)?",
            options=[
                "To pass the vector by reference without making a deep copy, saving O(N) time and space overhead.",
                "To automatically sort vector elements before execution.",
                "To restrict vector elements to positive numbers only.",
                "To disable compiler syntax validation."
            ],
            correct_option_index=0,
            correct_answer="To pass the vector by reference without making a deep copy, saving O(N) time and space overhead.",
            explanation="C++ pass-by-reference avoids duplicating vector elements in call stack frames.",
            concept="C++ Memory Optimization",
            code_evidence=f"Function parameter `vector<int>& {vec_var}`.",
            evidence=[f"reference operator & used in vector<int>& {vec_var}"],
            question_type="optimization",
            difficulty="easy"
        ))

    # Filter all candidates through the Grounding Validator
    validated_candidates = []
    for c in candidates:
        is_valid, reason = validate_question_grounding(c.question, user_code, profile)
        if is_valid:
            validated_candidates.append(c)

    return validated_candidates


@router.post("/viva/start", response_model=VivaResponse)
def start_viva_session(req: VivaStartRequest):
    """
    Starts an adaptive Viva session for a specific submission code snapshot.
    Builds profile, generates strictly grounded candidates, attaches submission metadata, and selects Q1.
    """
    import hashlib
    code_hash = hashlib.sha256((req.user_code or "").encode("utf-8")).hexdigest()
    profile = extract_student_profile(req.user_code, req.problem_title, req.problem_id)
    candidates = build_candidate_questions(profile, req.user_code)

    if not candidates:
        raise HTTPException(status_code=400, detail="Could not extract grounded candidate questions for submitted code.")

    session_id = f"viva_{uuid.uuid4().hex[:12]}"

    # Populate binding metadata & fingerprints on all candidates
    for c in candidates:
        c.submission_id = req.submission_id
        c.problem_id = req.problem_id
        c.code_snapshot_hash = code_hash
        c.viva_session_id = session_id
        c.question_fingerprint = hashlib.sha256(f"{c.question}_{c.concept}_{c.code_evidence}".encode("utf-8")).hexdigest()
    
    # Runtime Diagnostic Trace Log (Section 28)
    trace_log = {
        "submission_id": req.submission_id,
        "code_snapshot_hash": code_hash,
        "extracted_features": profile.algorithm_patterns,
        "variables": profile.variables,
        "nested_loop_depth": profile.nested_loop_depth,
        "candidates_generated": len(candidates),
        "selected_question_id": candidates[0].id if candidates else None,
        "selected_question_text": candidates[0].question if candidates else None,
        "code_evidence": candidates[0].code_evidence if candidates else None,
        "grounding_status": "VALIDATED_100_PERCENT"
    }

    session_data = {
        "viva_session_id": session_id,
        "submission_id": req.submission_id,
        "problem_id": req.problem_id,
        "code_snapshot_hash": code_hash,
        "user_code": req.user_code,
        "profile": profile.dict(),
        "candidates": [c.dict() for c in candidates],
        "current_index": 0,
        "answers": [],
        "score": 0.0,
        "status": "active",
        "trace": trace_log
    }

    viva_sessions_db[session_id] = session_data

    first_q = candidates[0]
    return VivaResponse(
        viva_session_id=session_id,
        submission_id=req.submission_id,
        problem_id=req.problem_id,
        status="active",
        current_question_index=0,
        total_questions=len(candidates),
        current_question=first_q,
        profile=profile.dict(),
        score=0.0
    )


@router.post("/viva/answer", response_model=VivaResponse)
def answer_viva_question(req: VivaAnswerRequest):
    """
    Processes student answer for current question and adaptively selects next question or finishes.
    """
    session = viva_sessions_db.get(req.viva_session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Viva session not found.")

    candidates = session["candidates"]
    current_idx = session["current_index"]

    if current_idx >= len(candidates):
        raise HTTPException(status_code=400, detail="Viva session has already completed.")

    current_q = candidates[current_idx]
    is_correct = (req.selected_index == current_q["correct_option_index"])

    session["answers"].append({
        "question_id": req.question_id,
        "selected_index": req.selected_index,
        "is_correct": is_correct
    })

    # Update session state
    next_idx = current_idx + 1
    session["current_index"] = next_idx

    # Calculate current score
    correct_count = sum(1 for a in session["answers"] if a["is_correct"])
    score = round(correct_count / len(session["answers"]), 2)
    session["score"] = score

    if next_idx < len(candidates):
        next_q = candidates[next_idx]
        return VivaResponse(
            viva_session_id=req.viva_session_id,
            submission_id=session["submission_id"],
            problem_id=session["problem_id"],
            status="active",
            current_question_index=next_idx,
            total_questions=len(candidates),
            current_question=QuestionItem(**next_q),
            profile=session["profile"],
            score=score
        )
    else:
        session["status"] = "completed"
        final_score = round(correct_count / len(candidates), 2)
        if final_score >= 0.8:
            status_label = "Strong Understanding"
            feedback = "🌟 Outstanding! You demonstrated clear conceptual understanding of your implementation."
        elif final_score >= 0.6:
            status_label = "Demonstrated Understanding"
            feedback = "✅ Good code understanding. Review complexity and edge cases to refine your skills."
        else:
            status_label = "Needs Review"
            feedback = "⚠️ Gap detected in code reasoning. Focus on understanding step-by-step loop invariants."

        return VivaResponse(
            viva_session_id=req.viva_session_id,
            submission_id=session["submission_id"],
            problem_id=session["problem_id"],
            status=status_label,
            current_question_index=len(candidates),
            total_questions=len(candidates),
            current_question=None,
            profile=session["profile"],
            score=final_score,
            feedback=feedback
        )


@router.get("/viva/session/{session_id}", response_model=VivaResponse)
def get_viva_session(session_id: str):
    session = viva_sessions_db.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Viva session not found.")

    candidates = session["candidates"]
    current_idx = session["current_index"]

    current_q = QuestionItem(**candidates[current_idx]) if current_idx < len(candidates) else None

    return VivaResponse(
        viva_session_id=session_id,
        submission_id=session["submission_id"],
        problem_id=session["problem_id"],
        status=session["status"],
        current_question_index=current_idx,
        total_questions=len(candidates),
        current_question=current_q,
        profile=session["profile"],
        score=session.get("score", 0.0)
    )

@router.get("/viva/trace/{session_id}")
def get_viva_diagnostic_trace(session_id: str):
    """
    Developer-only diagnostic trace endpoint (Section 28).
    Returns execution trace: submission_id -> code_hash -> extracted_features -> candidates -> selected_question -> evidence.
    """
    session = viva_sessions_db.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Viva session trace not found.")

    return session.get("trace", {
        "submission_id": session.get("submission_id"),
        "code_snapshot_hash": session.get("code_snapshot_hash"),
        "status": session.get("status")
    })


# --- Backwards compatibility routes for /questions & /evaluate ---
@router.post("/questions", response_model=List[QuestionItem])
def generate_questions(req: QuestionGenRequest):
    profile = extract_student_profile(req.user_code, req.problem_title, req.problem_id)
    candidates = build_candidate_questions(profile, req.user_code)
    return candidates

@router.post("/evaluate", response_model=UnderstandingEvalResponse)
def evaluate_understanding(req: UnderstandingEvalRequest):
    correct_count = 0
    total = len(req.questions)
    if total == 0:
        return UnderstandingEvalResponse(understanding_score=1.0, status="Mastered", feedback="Clean code execution.")

    answers_dict = {a.get("question_id"): a.get("selected_index") for a in req.answers}
    for q in req.questions:
        user_sel = answers_dict.get(q.id)
        if user_sel is not None and int(user_sel) == q.correct_option_index:
            correct_count += 1

    score = float(correct_count / total)
    if score >= 0.8:
        status = "Mastered"
        feedback = "🌟 Outstanding code understanding! You demonstrated complete conceptual mastery of your C++ solution."
    elif score >= 0.6:
        status = "Understood"
        feedback = "✅ Good understanding of your implementation logic."
    else:
        status = "Needs Review"
        feedback = "⚠️ Conceptual gap detected in implementation mechanics."

    return UnderstandingEvalResponse(
        understanding_score=round(score, 2),
        status=status,
        feedback=feedback
    )
