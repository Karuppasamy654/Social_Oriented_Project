import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class CodeFeatureEvidence(BaseModel):
    feature: str
    variable_or_snippet: str
    lines: List[int]
    description: str

class StudentImplementationProfile(BaseModel):
    problem_id: str
    problem_title: str
    
    # Detected Patterns
    algorithm_patterns: List[str]
    data_structures: List[str]
    variables: List[str]
    operations: List[str]
    
    # Control Flow
    for_loops: int
    while_loops: int
    nested_loop_depth: int
    if_statements: int
    
    # Boolean Flags
    recursion: bool
    sorting: bool
    hashing: bool
    two_pointers: bool
    linked_list: bool
    tree: bool
    sliding_window: bool
    
    # Extracted Complexity
    estimated_time_complexity: str
    estimated_space_complexity: str
    
    # Code Evidence Store
    code_evidence: List[CodeFeatureEvidence]


def extract_student_profile(user_code: str, problem_title: str = "Two Sum", problem_id: str = "two-sum") -> StudentImplementationProfile:
    """
    Analyzes exact student submission code to construct a deterministic StudentImplementationProfile.
    Zero reliance on reference solutions or optimal algorithm assumptions.
    """
    code_str = user_code or ""
    lines = code_str.splitlines()
    code_lower = code_str.lower()
    
    algorithm_patterns = []
    data_structures = []
    variables = []
    operations = []
    code_evidence = []
    
    # 1. Variable extraction
    found_vars = set()
    
    # Common variable pattern declarations
    var_decls = re.findall(r'\b(?:int|double|float|char|bool|string|auto|vector<[^>]+>|unordered_map<[^>]+>|unordered_set<[^>]+>|map<[^>]+>|set<[^>]+>|ListNode\*?|TreeNode\*?)\s+([a-zA-Z_]\w*)', code_str)
    for v in var_decls:
        if v not in ('main', 'Solution', 'public', 'private', 'protected', 'return', 'if', 'else', 'for', 'while'):
            found_vars.add(v)
            
    # Function parameter variables
    param_decls = re.findall(r'(?:vector<[^>]+>&?|string&?|int|ListNode\*|TreeNode\*)\s+([a-zA-Z_]\w*)', code_str)
    for p in param_decls:
        if p not in ('main', 'Solution', 'public', 'std', 'vector', 'string'):
            found_vars.add(p)
            
    # Loop iterator variables
    loop_vars = re.findall(r'for\s*\(\s*int\s+([a-zA-Z_]\w*)', code_str)
    for lv in loop_vars:
        found_vars.add(lv)
        
    variables = sorted(list(found_vars))
    
    # 2. Control Flow Analysis
    for_loops = len(re.findall(r'\bfor\s*\(', code_str))
    while_loops = len(re.findall(r'\bwhile\s*\(', code_str))
    if_statements = len(re.findall(r'\bif\s*\(', code_str))
    
    # Track nested loop depth & line numbers
    nested_loop_depth = 0
    current_depth = 0
    loop_lines = []
    
    for idx, line in enumerate(lines):
        line_num = idx + 1
        stripped = line.strip()
        if re.search(r'\b(for|while)\s*\(', stripped):
            loop_lines.append(line_num)
            current_depth += 1
            if current_depth > nested_loop_depth:
                nested_loop_depth = current_depth
        if '}' in stripped and current_depth > 0:
            current_depth -= 1
            
    # 3. Data Structures & Language Feature Detection
    has_unordered_map = bool(re.search(r'\bunordered_map\b', code_str))
    has_map = bool(re.search(r'\bmap\b', code_str))
    has_unordered_set = bool(re.search(r'\bunordered_set\b', code_str))
    has_set = bool(re.search(r'\bset\b', code_str))
    has_vector = bool(re.search(r'\bvector\b', code_str))
    has_string = bool(re.search(r'\bstring\b', code_str))
    has_list_node = bool(re.search(r'\bListNode\b', code_str))
    has_tree_node = bool(re.search(r'\bTreeNode\b', code_str))
    has_stack = bool(re.search(r'\bstack\b', code_str))
    has_queue = bool(re.search(r'\bqueue\b', code_str))
    
    hashing = has_unordered_map or has_map or has_unordered_set or has_set
    if has_vector: data_structures.append("vector")
    if has_string: data_structures.append("string")
    if has_unordered_map: data_structures.append("unordered_map")
    if has_map and not has_unordered_map: data_structures.append("map")
    if has_unordered_set: data_structures.append("unordered_set")
    if has_list_node: data_structures.append("ListNode")
    if has_tree_node: data_structures.append("TreeNode")
    if has_stack: data_structures.append("stack")
    if has_queue: data_structures.append("queue")
    
    # 4. Pattern & Algorithm Detection
    sorting = bool(re.search(r'\b(std::)?sort\b', code_str))
    
    # Recursion check
    recursion = False
    func_match = re.search(r'\b([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{', code_str)
    if func_match:
        func_name = func_match.group(1)
        if func_name not in ('Solution', 'main'):
            if re.search(r'\b' + re.escape(func_name) + r'\s*\(', code_str[func_match.end():]):
                recursion = True

    two_pointers = False
    if ('left' in found_vars and 'right' in found_vars) or ('l' in found_vars and 'r' in found_vars) or ('low' in found_vars and 'high' in found_vars):
        two_pointers = True
        
    linked_list = has_list_node or ('->next' in code_str)
    tree = has_tree_node or ('->left' in code_str) or ('->right' in code_str)
    sliding_window = ('window' in code_lower) or (two_pointers and 'max' in code_lower and not sorting)
    
    if nested_loop_depth >= 2:
        algorithm_patterns.append("nested_loop")
        algorithm_patterns.append("brute_force")
        code_evidence.append(CodeFeatureEvidence(
            feature="nested_loop",
            variable_or_snippet="for/while loops",
            lines=loop_lines,
            description=f"Contains {nested_loop_depth} levels of nested loops."
        ))
    elif for_loops + while_loops == 1:
        algorithm_patterns.append("single_loop")
        
    if hashing:
        algorithm_patterns.append("hash_lookup")
        code_evidence.append(CodeFeatureEvidence(
            feature="hashing",
            variable_or_snippet="unordered_map/set",
            lines=[idx+1 for idx, l in enumerate(lines) if 'unordered_map' in l or 'unordered_set' in l or 'map' in l],
            description="Uses hash table data structure for O(1) expected lookups."
        ))
        
    if sorting:
        algorithm_patterns.append("sorting")
        code_evidence.append(CodeFeatureEvidence(
            feature="sorting",
            variable_or_snippet="std::sort",
            lines=[idx+1 for idx, l in enumerate(lines) if 'sort' in l],
            description="Calls sorting algorithm on container elements."
        ))
        
    if two_pointers:
        algorithm_patterns.append("two_pointers")
        
    if linked_list:
        algorithm_patterns.append("linked_list_traversal")
        
    if tree:
        algorithm_patterns.append("tree_traversal")
        
    # 5. Operation extraction
    if '+' in code_str: operations.append("addition")
    if '-' in code_str: operations.append("subtraction")
    if '*' in code_str or '/' in code_str or '%' in code_str: operations.append("arithmetic")
    if '==' in code_str or '!=' in code_str or '<' in code_str or '>' in code_str: operations.append("comparison")
    if '[]' in code_str or '[' in code_str: operations.append("indexing")
    
    # 6. Complexity Analysis based on STUDENT CODE
    if sorting:
        time_comp = "O(N log N)"
        space_comp = "O(1)" if not hashing else "O(N)"
    elif nested_loop_depth >= 3:
        time_comp = "O(N^3)"
        space_comp = "O(1)"
    elif nested_loop_depth == 2:
        time_comp = "O(N^2)"
        space_comp = "O(1)"
    elif hashing:
        time_comp = "O(N)"
        space_comp = "O(N)"
    elif recursion:
        time_comp = "O(2^N)"
        space_comp = "O(N)"
    else:
        time_comp = "O(N)"
        space_comp = "O(1)"

    return StudentImplementationProfile(
        problem_id=problem_id,
        problem_title=problem_title,
        algorithm_patterns=algorithm_patterns,
        data_structures=data_structures,
        variables=variables,
        operations=operations,
        for_loops=for_loops,
        while_loops=while_loops,
        nested_loop_depth=nested_loop_depth,
        if_statements=if_statements,
        recursion=recursion,
        sorting=sorting,
        hashing=hashing,
        two_pointers=two_pointers,
        linked_list=linked_list,
        tree=tree,
        sliding_window=sliding_window,
        estimated_time_complexity=time_comp,
        estimated_space_complexity=space_comp,
        code_evidence=code_evidence
    )
