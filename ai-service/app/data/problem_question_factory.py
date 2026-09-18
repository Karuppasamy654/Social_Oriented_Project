"""
Layer B — Assessment Question Factory
Transforms Layer A Coding Problems into unambiguous Layer B Assessment Questions across 11 question types.
Ensures every question has a clear learning objective, explicit code snippet (where needed), single intended answer, plausible distractors, and valid schema.
"""

from typing import List, Dict, Any, Optional
import uuid
from app.data.problem_schema import CodingProblem
from app.data.question_schema import AssessmentQuestion
from app.data.question_validator import QuestionQualityValidator

class ProblemQuestionFactory:
    """Factory creating high-quality assessment questions from authoritative coding problems."""

    @staticmethod
    def generate_questions_for_problem(problem: CodingProblem) -> List[AssessmentQuestion]:
        questions: List[AssessmentQuestion] = []
        if not problem.assessment_eligible:
            return questions

        title = problem.title.strip()
        problem_id = problem.problem_id or title.lower().replace(" ", "_")
        topic = problem.topics[0] if problem.topics else "Array"
        topics = problem.topics if problem.topics else [topic]
        diff = problem.difficulty or "Medium"
        desc = problem.problem_statement or ""

        # 1. IMPLEMENTATION QUESTION (Actual Coding Problem)
        impl_q = AssessmentQuestion(
            question_id=f"q_{problem_id}_impl",
            problem_id=problem_id,
            question_type="implementation",
            learning_objective=f"implement_{topic.lower().replace(' ', '_')}_solution",
            question_text=f"{title}\n\n{desc}",
            code="",
            options=[
                "A) Optimal O(N) linear time approach",
                "B) Sorting-based O(N log N) approach",
                "C) Brute-force O(N^2) quadratic nested loop approach",
                "D) Auxiliary hash table / two-pointer approach"
            ],
            correct_answer="A) Optimal O(N) linear time approach",
            explanation=f"Implement an efficient solution for {title} handling all specified edge cases and constraints.",
            topic=topic,
            topics=topics,
            skills=[topic.lower().replace(' ', '_'), "implementation"],
            difficulty=diff,
            source_problem=title,
            generated_from_source=True,
            starter_code=f"# Solution for {title}\ndef solve():\n    pass\n",
            expected_language="python",
            execution_enabled=True,
            assessment_eligible=True
        )
        questions.append(QuestionQualityValidator.audit_and_annotate(impl_q))

        # 2. ALGORITHM SELECTION / CONCEPT / COMPLEXITY QUESTIONS
        title_lower = title.lower()

        # TWO SUM
        if "two sum" in title_lower:
            # Concept MCQ
            q_concept = AssessmentQuestion(
                question_id=f"q_{problem_id}_concept",
                problem_id=problem_id,
                question_type="concept",
                learning_objective="identify_hash_map_complement_lookup",
                question_text="For the Two Sum problem, which data structure enables O(1) average-time lookup to find the complement of the current element?",
                code="",
                options=["A) Stack", "B) Queue", "C) Hash Map", "D) Linked List"],
                correct_answer="C) Hash Map",
                explanation="Storing previously visited elements in a Hash Map allows constant-time O(1) average lookup for (target - current_val).",
                topic=topic,
                topics=topics,
                skills=["hash_table", "data_structure_selection"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_concept))

            # Time Complexity MCQ with explicit code snippet
            q_time = AssessmentQuestion(
                question_id=f"q_{problem_id}_time_brute",
                problem_id=problem_id,
                question_type="time_complexity",
                learning_objective="analyze_nested_loop_complexity",
                question_text="Consider the following brute-force implementation of Two Sum:\n\n```python\nfor i in range(len(nums)):\n    for j in range(i + 1, len(nums)):\n        if nums[i] + nums[j] == target:\n            return [i, j]\n```\nWhat is the worst-case time complexity?",
                code="for i in range(len(nums)):\n    for j in range(i + 1, len(nums)):\n        if nums[i] + nums[j] == target:\n            return [i, j]",
                options=["A) O(1)", "B) O(log N)", "C) O(N)", "D) O(N²)"],
                correct_answer="D) O(N²)",
                explanation="The outer loop runs N times and the inner loop runs on average N/2 times, resulting in N*(N-1)/2 iterations, which is O(N²) time complexity.",
                topic=topic,
                topics=topics,
                skills=["complexity_analysis", "nested_loops"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_time))

            # Algorithm Selection MCQ
            q_algo = AssessmentQuestion(
                question_id=f"q_{problem_id}_algo_opt",
                problem_id=problem_id,
                question_type="algorithm_selection",
                learning_objective="choose_optimal_two_sum_approach",
                question_text="You need to solve Two Sum in expected O(N) linear time while preserving original element indices. Which approach is appropriate?",
                code="",
                options=["A) Selection Sort followed by linear scan", "B) Single pass Hash Map storing value-to-index mappings", "C) Exponential backtracking search tree", "D) Nested brute-force loops"],
                correct_answer="B) Single pass Hash Map storing value-to-index mappings",
                explanation="A single-pass Hash Map checks for target - nums[i] in O(1) average time while maintaining original indices.",
                topic=topic,
                topics=topics,
                skills=["algorithm_selection", "hash_map"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_algo))

        # LONGEST PALINDROMIC SUBSTRING
        elif "longest palindromic substring" in title_lower:
            q_algo = AssessmentQuestion(
                question_id=f"q_{problem_id}_algo_manacher",
                problem_id=problem_id,
                question_type="algorithm_selection",
                learning_objective="identify_optimal_palindrome_algorithm",
                question_text="Which algorithm can solve the Longest Palindromic Substring problem in strict O(N) linear time?",
                code="",
                options=["A) Brute-force substring checking O(N³)", "B) Dynamic Programming matrix O(N²)", "C) Expand Around Center O(N²)", "D) Manacher's Algorithm O(N)"],
                correct_answer="D) Manacher's Algorithm O(N)",
                explanation="Manacher's Algorithm leverages symmetry and previously computed palindrome radii to find the longest palindromic substring in O(N) linear time.",
                topic="String",
                topics=["String", "Dynamic Programming"],
                skills=["algorithm_selection", "string_algorithms"],
                difficulty="Hard",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_algo))

            q_time = AssessmentQuestion(
                question_id=f"q_{problem_id}_time_expand",
                problem_id=problem_id,
                question_type="time_complexity",
                learning_objective="analyze_expand_around_center_complexity",
                question_text="Consider the 'Expand Around Center' approach for Longest Palindromic Substring where each character (and index gap) serves as a potential center expanded outwards. What is the worst-case time complexity?",
                code="for i in range(len(s)):\n    expand(s, i, i)     # odd length\n    expand(s, i, i + 1) # even length",
                options=["A) O(N)", "B) O(N²)", "C) O(N log N)", "D) O(2^N)"],
                correct_answer="B) O(N²)",
                explanation="There are 2N-1 centers. Expanding outward from each center takes up to O(N) comparisons, giving O(N²) worst-case time complexity.",
                topic="String",
                topics=["String", "Two Pointer"],
                skills=["complexity_analysis", "two_pointer"],
                difficulty="Medium",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_time))

        # VALID PARENTHESES
        elif "valid parentheses" in title_lower or "parentheses" in title_lower:
            q_ds = AssessmentQuestion(
                question_id=f"q_{problem_id}_ds_selection",
                problem_id=problem_id,
                question_type="data_structure_selection",
                learning_objective="select_stack_for_parentheses_matching",
                question_text="Why is a Stack data structure optimal for checking the validity of nested bracket characters in string s?",
                code="",
                options=[
                    "A) It allows random access to arbitrary indices in O(1) time",
                    "B) It enforces Last-In-First-Out (LIFO) ordering, matching the most recently opened bracket first",
                    "C) It automatically sorts closing brackets in alphabetical order",
                    "D) It partitions brackets into disjoint connected components"
                ],
                correct_answer="B) It enforces Last-In-First-Out (LIFO) ordering, matching the most recently opened bracket first",
                explanation="Nested brackets must be closed in reverse order of opening, which precisely corresponds to LIFO stack evaluation.",
                topic="Stack",
                topics=["Stack", "String"],
                skills=["data_structure_selection", "stack"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_ds))

        # REVERSE LINKED LIST
        elif "reverse linked list" in title_lower:
            q_comp = AssessmentQuestion(
                question_id=f"q_{problem_id}_space_iterative",
                problem_id=problem_id,
                question_type="space_complexity",
                learning_objective="calculate_in_place_linked_list_reversal_space",
                question_text="An iterative implementation of Reverse Linked List uses prev, curr, and next_node pointers to reverse node links in-place. What is the auxiliary space complexity?",
                code="prev = None\ncurr = head\nwhile curr:\n    nxt = curr.next\n    curr.next = prev\n    prev = curr\n    curr = nxt",
                options=["A) O(1)", "B) O(log N)", "C) O(N)", "D) O(N²)"],
                correct_answer="A) O(1)",
                explanation="The iterative pointer manipulation reassigns existing node links using 3 pointer variables without allocating additional data structures or stack frames, resulting in O(1) auxiliary space.",
                topic="Linked List",
                topics=["Linked List"],
                skills=["space_complexity", "linked_list"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_comp))

        # BINARY SEARCH
        elif "binary search" in title_lower and "tree" not in title_lower:
            q_comp = AssessmentQuestion(
                question_id=f"q_{problem_id}_time_bs",
                problem_id=problem_id,
                question_type="time_complexity",
                learning_objective="analyze_binary_search_complexity",
                question_text="What is the optimal worst-case time complexity of Binary Search on a sorted array of N elements?",
                code="low, high = 0, len(arr) - 1\nwhile low <= high:\n    mid = (low + high) // 2\n    if arr[mid] == target: return mid\n    elif arr[mid] < target: low = mid + 1\n    else: high = mid - 1",
                options=["A) O(1)", "B) O(log N)", "C) O(N)", "D) O(N log N)"],
                correct_answer="B) O(log N)",
                explanation="Binary Search halves the search space in each step (N -> N/2 -> N/4 -> ... -> 1), leading to O(log N) iterations.",
                topic="Binary Search",
                topics=["Binary Search", "Array"],
                skills=["complexity_analysis", "binary_search"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_comp))

        # MERGE INTERVALS
        elif "merge intervals" in title_lower or "intervals" in title_lower:
            q_algo = AssessmentQuestion(
                question_id=f"q_{problem_id}_algo_sort",
                problem_id=problem_id,
                question_type="algorithm_selection",
                learning_objective="interval_sorting_preprocessing",
                question_text="To efficiently merge overlapping interval pairs in an array of intervals, which initial preprocessing step is required?",
                code="",
                options=[
                    "A) Sort intervals by start time in ascending order",
                    "B) Reverse intervals array in O(N) time",
                    "C) Convert intervals into a Min-Heap",
                    "D) Partition intervals using Hash Map buckets"
                ],
                correct_answer="A) Sort intervals by start time in ascending order",
                explanation="Sorting by start time ensures that overlapping intervals become contiguous in the sorted array, enabling an O(N log N) total time sweep.",
                topic="Intervals",
                topics=["Intervals", "Array", "Sorting"],
                skills=["algorithm_selection", "sorting"],
                difficulty="Medium",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_algo))

        # NUMBER OF ISLANDS
        elif "number of islands" in title_lower or "islands" in title_lower:
            q_concept = AssessmentQuestion(
                question_id=f"q_{problem_id}_concept_grid",
                problem_id=problem_id,
                question_type="concept",
                learning_objective="connected_components_grid_traversal",
                question_text="In the Number of Islands problem on a 2D grid, which graph traversal strategy is commonly used to explore and mark all connected land cells ('1's)?",
                code="",
                options=[
                    "A) Binary Search",
                    "B) Depth-First Search (DFS) or Breadth-First Search (BFS)",
                    "C) Dijkstra's Shortest Path Algorithm",
                    "D) Floyd-Warshall All-Pairs Algorithm"
                ],
                correct_answer="B) Depth-First Search (DFS) or Breadth-First Search (BFS)",
                explanation="DFS/BFS traverses all 4-directionally connected land cells of an island, marking them visited so each connected component is counted once.",
                topic="Graph",
                topics=["Graph", "BFS", "DFS", "Matrix"],
                skills=["concept", "graph_traversal"],
                difficulty="Medium",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_concept))

        # CLIMBING STAIRS
        elif "climbing stairs" in title_lower or "climb stairs" in title_lower:
            q_concept = AssessmentQuestion(
                question_id=f"q_{problem_id}_concept_fib",
                problem_id=problem_id,
                question_type="concept",
                learning_objective="identify_fibonacci_dp_recurrence",
                question_text="Climbing Stairs can be modeled with recurrence dp[i] = dp[i-1] + dp[i-2]. Which mathematical sequence does this recurrence represent?",
                code="",
                options=[
                    "A) Arithmetic Progression",
                    "B) Geometric Progression",
                    "C) Fibonacci Sequence",
                    "D) Catalan Sequence"
                ],
                correct_answer="C) Fibonacci Sequence",
                explanation="To reach step i, you can arrive from step i-1 (1 step jump) or step i-2 (2 step jump), matching the Fibonacci recurrence F(n) = F(n-1) + F(n-2).",
                topic="Dynamic Programming",
                topics=["Dynamic Programming", "Math"],
                skills=["concept", "dynamic_programming"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_concept))

        # COMBINATION SUM
        elif "combination sum" in title_lower:
            q_algo = AssessmentQuestion(
                question_id=f"q_{problem_id}_algo_backtrack",
                problem_id=problem_id,
                question_type="algorithm_selection",
                learning_objective="backtracking_search_tree",
                question_text="Which algorithmic technique is used to explore all valid combinations of numbers that sum to target, allowing elements to be chosen repeatedly?",
                code="",
                options=[
                    "A) Tabulation Matrix DP",
                    "B) Backtracking Recursion with Decision Tree Branching",
                    "C) Greedy Choice Sweep",
                    "D) Two-Pointer Sliding Window"
                ],
                correct_answer="B) Backtracking Recursion with Decision Tree Branching",
                explanation="Backtracking builds candidate solutions recursively, pruning paths when the current sum exceeds target.",
                topic="Backtracking",
                topics=["Backtracking", "Array", "Recursion"],
                skills=["algorithm_selection", "backtracking"],
                difficulty="Medium",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_algo))

        # KTH LARGEST ELEMENT
        elif "kth largest" in title_lower:
            q_algo = AssessmentQuestion(
                question_id=f"q_{problem_id}_algo_quickselect",
                problem_id=problem_id,
                question_type="algorithm_selection",
                learning_objective="quickselect_average_linear_time",
                question_text="You need to find the Kth largest element in an unsorted array of N elements in expected O(N) average time. Which algorithm should you select?",
                code="",
                options=[
                    "A) Bubble Sort O(N²)",
                    "B) Quickselect (Hoare's Partitioning)",
                    "C) Full Merge Sort O(N log N)",
                    "D) Insertion Sort O(N²)"
                ],
                correct_answer="B) Quickselect (Hoare's Partitioning)",
                explanation="Quickselect uses partitioning to eliminate one half of the array at each step, yielding average O(N) linear time.",
                topic="Heap",
                topics=["Heap", "Sorting", "Priority Queue", "Quickselect"],
                skills=["algorithm_selection", "quickselect"],
                difficulty="Medium",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_algo))

        # TREE TRAVERSAL
        elif "tree traversal" in title_lower or "inorder" in title_lower:
            q_dry = AssessmentQuestion(
                question_id=f"q_{problem_id}_dry_inorder",
                problem_id=problem_id,
                question_type="dry_run",
                learning_objective="dry_run_bst_inorder_traversal",
                question_text="Consider a Binary Search Tree with root 4, left child 2, right child 5. What sequence of node values is produced by an Inorder Traversal (Left, Root, Right)?",
                code="",
                options=["A) [4, 2, 5]", "B) [2, 4, 5]", "C) [5, 4, 2]", "D) [2, 5, 4]"],
                correct_answer="B) [2, 4, 5]",
                explanation="Inorder traversal visits left subtree (2), root (4), right subtree (5), yielding [2, 4, 5] in sorted order.",
                topic="Binary Tree",
                topics=["Binary Tree", "Tree", "DFS"],
                skills=["dry_run", "tree_traversal"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_dry))

        # SINGLE NUMBER
        elif "single number" in title_lower:
            q_algo = AssessmentQuestion(
                question_id=f"q_{problem_id}_algo_xor",
                problem_id=problem_id,
                question_type="algorithm_selection",
                learning_objective="identify_xor_single_number_approach",
                question_text="Given an array where every integer element appears exactly twice except for one, which operation identifies the single element in O(N) linear time using O(1) auxiliary space?",
                code="",
                options=[
                    "A) Bitwise XOR all array elements",
                    "B) Sort the array and scan adjacent pairs",
                    "C) Compare every pair using nested loops",
                    "D) Store element frequencies in a Hash Map"
                ],
                correct_answer="A) Bitwise XOR all array elements",
                explanation="Bitwise XOR is associative and commutative. Since x ^ x = 0 and 0 ^ x = x, XORing all elements cancels out every paired number, leaving only the single element in O(N) time and O(1) space.",
                topic="Bit Manipulation",
                topics=["Bit Manipulation", "Array"],
                skills=["algorithm_selection", "bit_manipulation"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_algo))

            q_concept = AssessmentQuestion(
                question_id=f"q_{problem_id}_concept_xor_prop",
                problem_id=problem_id,
                question_type="concept",
                learning_objective="understand_xor_identity_and_self_inverse",
                question_text="Why does the bitwise XOR operation (^) correctly isolate the single element when all other numbers appear exactly twice?",
                code="",
                options=[
                    "A) x ^ x evaluates to 0 and 0 ^ x evaluates to x",
                    "B) XOR sorts the numbers in ascending numerical order",
                    "C) XOR removes negative values from memory",
                    "D) XOR calculates element frequencies in constant space"
                ],
                correct_answer="A) x ^ x evaluates to 0 and 0 ^ x evaluates to x",
                explanation="Because XOR is self-inverse (x ^ x = 0) and 0 is the identity element (0 ^ x = x), paired numbers cancel each other out regardless of array order.",
                topic="Bit Manipulation",
                topics=["Bit Manipulation", "Array"],
                skills=["concept", "bit_manipulation"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_concept))

            q_space = AssessmentQuestion(
                question_id=f"q_{problem_id}_space_xor",
                problem_id=problem_id,
                question_type="space_complexity",
                learning_objective="calculate_xor_single_number_space_complexity",
                question_text="If an optimal Single Number solution computes the cumulative XOR over an array of N integers using a single loop variable, what is its auxiliary space complexity?",
                code="result = 0\nfor num in nums:\n    result ^= num",
                options=["A) O(1)", "B) O(log N)", "C) O(N)", "D) O(N²)"],
                correct_answer="A) O(1)",
                explanation="The loop maintains only a single integer accumulator variable ('result'), resulting in O(1) constant auxiliary space.",
                topic="Bit Manipulation",
                topics=["Bit Manipulation", "Array"],
                skills=["space_complexity", "bit_manipulation"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_space))

            q_dry = AssessmentQuestion(
                question_id=f"q_{problem_id}_dry_xor_trace",
                problem_id=problem_id,
                question_type="dry_run",
                learning_objective="trace_bitwise_xor_array_evaluation",
                question_text="For the input array nums = [4, 1, 2, 1, 2], what value is returned by evaluating 4 ^ 1 ^ 2 ^ 1 ^ 2?",
                code="",
                options=["A) 0", "B) 1", "C) 2", "D) 4"],
                correct_answer="D) 4",
                explanation="Since (1 ^ 1) = 0 and (2 ^ 2) = 0, the expression reduces to 4 ^ 0 ^ 0 = 4.",
                topic="Bit Manipulation",
                topics=["Bit Manipulation", "Array"],
                skills=["dry_run", "bit_manipulation"],
                difficulty="Easy",
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_dry))

        # GENERAL FALLBACK QUESTION GENERATION FOR OTHER PROBLEMS
        else:
            q_algo = AssessmentQuestion(
                question_id=f"q_{problem_id}_algo_gen",
                problem_id=problem_id,
                question_type="algorithm_selection",
                learning_objective=f"select_optimal_{topic.lower().replace(' ', '_')}_approach",
                question_text=f"For the problem '{title}', which algorithmic approach achieves the optimal time and space complexity?",
                code="",
                options=[
                    f"A) Optimal {topic} traversal / lookup",
                    "B) Sorting the array as a preprocessing step",
                    "C) Brute-force nested loops over all element pairs",
                    "D) Storing all elements in an auxiliary stack"
                ],
                correct_answer=f"A) Optimal {topic} traversal / lookup",
                explanation=f"The optimal solution for '{title}' relies on structural properties and algorithms in {topic}.",
                topic=topic,
                topics=topics,
                skills=[topic.lower().replace(' ', '_')],
                difficulty=diff,
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_algo))

            q_concept = AssessmentQuestion(
                question_id=f"q_{problem_id}_concept_gen",
                problem_id=problem_id,
                question_type="concept",
                learning_objective=f"understand_{topic.lower().replace(' ', '_')}_core_principles",
                question_text=f"Which fundamental data structure or property from {topic} is primary in solving '{title}'?",
                code="",
                options=[
                    f"A) Core data structure operations in {topic}",
                    "B) Full sorting of all input elements",
                    "C) Linear scanning over unindexed data",
                    "D) Recursive depth-first search tree"
                ],
                correct_answer=f"A) Core data structure operations in {topic}",
                explanation=f"Core operations and invariants in {topic} provide the foundation for solving '{title}'.",
                topic=topic,
                topics=topics,
                skills=[topic.lower().replace(' ', '_'), "concept"],
                difficulty=diff,
                source_problem=title
            )
            questions.append(QuestionQualityValidator.audit_and_annotate(q_concept))

        return questions

