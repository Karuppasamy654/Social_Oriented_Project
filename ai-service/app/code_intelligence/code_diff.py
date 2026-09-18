import re
import difflib
from typing import Dict, Any, List

def analyze_code_diff(starter_code: str, submitted_code: str) -> Dict[str, Any]:
    """
    Compares problem starter code vs student submitted code to isolate
    student-authored lines, modified lines, and student-added constructs.
    """
    starter_lines = [line.strip() for line in (starter_code or "").splitlines()]
    submitted_raw_lines = (submitted_code or "").splitlines()
    submitted_lines = [line.strip() for line in submitted_raw_lines]

    matcher = difflib.SequenceMatcher(None, starter_lines, submitted_lines)
    
    student_added_lines: List[int] = []
    student_modified_lines: List[int] = []
    provided_lines: List[int] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for line_idx in range(j1, j2):
                provided_lines.append(line_idx + 1)
        elif tag == 'replace':
            for line_idx in range(j1, j2):
                student_modified_lines.append(line_idx + 1)
        elif tag == 'insert':
            for line_idx in range(j1, j2):
                student_added_lines.append(line_idx + 1)

    # Extract student-authored features specifically from added/modified lines
    authored_text = "\n".join([submitted_raw_lines[idx - 1] for idx in (student_added_lines + student_modified_lines) if 0 <= idx - 1 < len(submitted_raw_lines)])
    if not authored_text.strip():
        authored_text = submitted_code

    student_authored_features = []
    if re.search(r'\bunordered_map\b|\bmap\b', authored_text):
        student_authored_features.append("unordered_map")
    if re.search(r'\bunordered_set\b|\bset\b', authored_text):
        student_authored_features.append("unordered_set")
    if re.search(r'\b(std::)?sort\b', authored_text):
        student_authored_features.append("std::sort")
    if re.search(r'\bListNode\b|->next', authored_text):
        student_authored_features.append("ListNode")
    if re.search(r'\bTreeNode\b|->left|->right', authored_text):
        student_authored_features.append("TreeNode")
    if re.search(r'\bfor\s*\(', authored_text):
        student_authored_features.append("for_loop")
    if re.search(r'\bwhile\s*\(', authored_text):
        student_authored_features.append("while_loop")
    if re.search(r'\bif\s*\(', authored_text):
        student_authored_features.append("if_statement")

    return {
        "student_added_lines": student_added_lines,
        "student_modified_lines": student_modified_lines,
        "provided_lines": provided_lines,
        "student_authored_features": student_authored_features,
        "has_student_modifications": len(student_added_lines) + len(student_modified_lines) > 0
    }
