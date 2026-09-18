import re
from typing import Dict, Any, List, Tuple
from app.code_intelligence.code_feature_extractor import StudentImplementationProfile

# Set of technical keywords that might be mentioned as potential alternative approaches or general DSA concepts if framed as an alternative question
ALLOWABLE_ALTERNATIVE_INTRODUCTIONS = [
    "alternative", "instead", "can reduce", "could reduce", "optimiz", "trade-off", "trade off",
    "how would you", "what technique", "how could", "another approach", "different approach"
]

COMMON_CPP_KEYWORDS = {
    "int", "double", "float", "char", "bool", "void", "string", "auto", "return", "if", "else",
    "for", "while", "const", "vector", "nums", "target", "val", "head", "root", "node", "ans",
    "result", "i", "j", "k", "n", "m", "left", "right", "low", "high", "mid"
}

class QuestionGroundingValidator:
    """
    Strict two-stage (Lexical + Semantic) Grounding Validator for CodeBuddy Viva Questions.
    Ensures that questions NEVER assume unwritten code, unwritten variables, unwritten data structures,
    or unwritten algorithms, unless explicitly framed as an alternative solution comparison.
    """

    @staticmethod
    def validate_question_grounding(
        question_text: str,
        student_code: str,
        code_profile: StudentImplementationProfile
    ) -> Tuple[bool, str]:
        """
        Validates if question_text is grounded strictly in student_code and code_profile.
        Returns (is_valid, rejection_reason).
        """
        q_lower = question_text.lower()
        code_str = student_code or ""
        code_lower = code_str.lower()
        
        # Check if question explicitly introduces an alternative approach
        is_alternative_question = any(alt in q_lower for alt in ALLOWABLE_ALTERNATIVE_INTRODUCTIONS)

        # 1. LEXICAL & DATA STRUCTURE GROUNDING
        # Forbidden constructs if not in code and NOT an alternative question
        
        # Hashing / Map checks
        if any(term in q_lower for term in ["unordered_map", "seen", "complement", "hash table", "hash map", "hashing", "key and value"]):
            if not code_profile.hashing and "unordered_map" not in code_lower and "seen" not in code_lower:
                if not is_alternative_question:
                    return False, "Rejection: Question mentions hash map / seen / complement when student code contains no hashing."
                # Even if alternative, direct questions about student's unwritten 'seen' variable are FORBIDDEN
                if "your seen" in q_lower or "declared seen" in q_lower or "in seen" in q_lower:
                    return False, "Rejection: Question refers to non-existent variable 'seen' in student code."

        # Sorting checks
        if any(term in q_lower for term in ["std::sort", "sorted array", "sorting algorithm", "sort("]):
            if not code_profile.sorting and "sort" not in code_lower:
                if not is_alternative_question:
                    return False, "Rejection: Question mentions sorting when student code contains no sort call."

        # Recursion checks
        if any(term in q_lower for term in ["recursive base case", "call stack", "recursion depth", "recursive transition"]):
            if not code_profile.recursion:
                if not is_alternative_question:
                    return False, "Rejection: Question mentions recursion when student code is iterative."

        # Linked List checks
        if any(term in q_lower for term in ["listnode", "next pointer", "head pointer", "nullptr"]):
            if not code_profile.linked_list:
                return False, "Rejection: Question mentions linked list elements when student code uses non-list constructs."

        # Tree checks
        if any(term in q_lower for term in ["treenode", "left child", "right child", "binary tree"]):
            if not code_profile.tree:
                return False, "Rejection: Question mentions tree nodes when student code does not use trees."

        # 2. VARIABLE REFERENCE VALIDATION
        # Extract single quoted or backticked variables in question (e.g., `seen`, `x`, `nums`)
        quoted_vars = re.findall(r'[`\'"]([a-zA-Z_]\w*)[`\'"]', question_text)
        for var in quoted_vars:
            if var in COMMON_CPP_KEYWORDS or var in code_profile.variables:
                continue
            # If variable is not in student code variables and not in code_str
            if var not in code_str:
                return False, f"Rejection: Question references variable '{var}' which does not exist in student code."

        # 3. COMPLEXITY CONSISTENCY
        # If code is O(N^2), asking why hash lookup is O(1) in user's implementation is wrong
        if "your implementation" in q_lower or "your solution" in q_lower or "your code" in q_lower:
            if "o(1) lookup" in q_lower or "o(1) time" in q_lower:
                if code_profile.estimated_time_complexity == "O(N^2)" and not code_profile.hashing:
                    return False, "Rejection: Claims student code has O(1) lookup when complexity is O(N^2)."
            if "nested loops" in q_lower and code_profile.nested_loop_depth < 2:
                return False, "Rejection: Questions nested loops when student code has fewer than 2 loops."

        # 4. SEMANTIC CONSISTENCY
        # E.g. asking why x is a hash key when x is just a loop variable or addition
        if "hash key" in q_lower or "map key" in q_lower:
            if not code_profile.hashing:
                return False, "Rejection: Question asks about hash key for non-hashing implementation."

        return True, "Grounding Validated"

def validate_question_grounding(
    question_text: str,
    student_code: str,
    code_profile: StudentImplementationProfile
) -> Tuple[bool, str]:
    return QuestionGroundingValidator.validate_question_grounding(question_text, student_code, code_profile)
