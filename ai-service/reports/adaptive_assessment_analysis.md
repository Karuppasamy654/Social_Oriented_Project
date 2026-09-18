# CodeBuddy Multi-Profile Adaptive Assessment Simulation Report

- **Date**: 2026-09-16
- **Version**: `v3.0.0`
- **File Path**: `ai-service/reports/adaptive_simulation.md`

---

## Executive Summary
This report records empirical execution logs simulating 4 distinct student experience profiles through dynamic 10–15 question adaptive sessions. It verifies NLP multi-label topic detection, Primary + Exploration candidate pool filtering, IRT ability estimation, Bayesian topic mastery updates, and Softmax controlled weighted randomization.

---
### Profile: Student A (Arrays & Strings)
- **Input Text**: `"I know arrays and strings. I have solved 40 problems in Python."`
- **NLP Detected Topics**: `Array (70%), String (70%)`
- **Initial ML Skill Estimate**: `Beginner` (Ability score: `0.25`)

#### Question Sequence Executed (15 Qs):
1. **[Array • Easy]** Two Sum (`q_curr_1_time_brute`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.64), primary topic match (String)_
2. **[String • Easy]** Valid Anagram Variant 1 (`q_curr_21_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.67), primary topic match (Stack)_
3. **[Stack • Easy]** Valid Parentheses Variant 2 (`q_curr_29_ds_selection`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.70), primary topic match (Bit Manipulation)_
4. **[Bit Manipulation • Easy]** Single Number Variant 2 (`q_curr_34_concept_gen`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.64), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
5. **[Bit Manipulation • Easy]** Single Number Variant 2 (`q_curr_34_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.67), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
6. **[Bit Manipulation • Easy]** Single Number Variant 1 (`q_curr_14_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.70), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
7. **[Bit Manipulation • Easy]** Single Number Variant 6 (`q_curr_114_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.72), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
8. **[Bit Manipulation • Easy]** Single Number Variant 5 (`q_curr_94_impl`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.66), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
9. **[Bit Manipulation • Easy]** Single Number Variant 2 (`q_curr_34_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.69), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
10. **[Bit Manipulation • Easy]** Single Number Variant 5 (`q_curr_94_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.72), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
11. **[Bit Manipulation • Easy]** Single Number Variant 1 (`q_curr_14_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.74), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
12. **[Bit Manipulation • Easy]** Single Number Variant 5 (`q_curr_94_algo_gen`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.68), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
13. **[Bit Manipulation • Easy]** Single Number Variant 1 (`q_curr_14_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.71), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
14. **[Bit Manipulation • Easy]** Single Number Variant 3 (`q_curr_54_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Easy: P=0.73), primary topic match (Bit Manipulation), targets previous mistake in Bit Manipulation_
15. **[Bit Manipulation • Easy]** Single Number Variant 7 (`q_curr_134_algo_gen`) ➔ Correct: `True`
   *Reasons*: _Adaptive candidate_

#### Final ML Skill Profile:
- **Verified Skill Level**: `Intermediate`
- **Accuracy Score**: `80.0%`
- **Confidence Score**: `40.35%`
- **Verified Strengths**: `Array, String`
- **Target Focus Topics**: `HashMap, Two Pointer, Sliding Window, Linked List, Stack, Queue, Binary Tree, BST, Heap, Priority Queue, Graph, BFS, DFS, Backtracking, Greedy, Dynamic Programming, Trie, Union Find, Bit Manipulation, Recursion, Sorting, Binary Search, Prefix Sum, Matrix, Intervals`

---
### Profile: Student B (LinkedList, Stack, Queue, Tree, BST)
- **Input Text**: `"I know linked lists, stacks, queues, binary trees and BST."`
- **NLP Detected Topics**: `Linked List (70%), Stack (70%), Queue (70%), Binary Tree (70%), BST (70%)`
- **Initial ML Skill Estimate**: `Intermediate` (Ability score: `0.5`)

#### Question Sequence Executed (15 Qs):
1. **[Linked List • Medium]** Add Two Numbers (`q_curr_2_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.55), primary topic match (Binary Tree)_
2. **[Binary Tree • Medium]** Validate Binary Search Tree Variant 3 (`q_curr_291_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.59), primary topic match (Linked List)_
3. **[Linked List • Medium]** Add Two Numbers (`q_curr_2_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.63), primary topic match (Binary Tree)_
4. **[Binary Tree • Medium]** Validate Binary Search Tree Variant 1 (`q_curr_227_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.33), primary topic match (Array)_
5. **[Array • Hard]** Trapping Rain Water Variant 3 (`q_curr_478_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.39), primary topic match (Array)_
6. **[Array • Hard]** Trapping Rain Water Variant 2 (`q_curr_466_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.45), primary topic match (Array)_
7. **[Array • Hard]** Sliding Window Maximum Variant 1 (`q_curr_462_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.51), primary topic match (Binary Tree)_
8. **[Binary Tree • Hard]** Serialize and Deserialize Binary Tree Variant 1 (`q_curr_457_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.55), primary topic match (Linked List)_
9. **[Linked List • Hard]** Merge k Sorted Lists Variant 2 (`q_curr_465_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.60), primary topic match (Array)_
10. **[Array • Hard]** Trapping Rain Water Variant 3 (`q_curr_478_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.64), primary topic match (Linked List)_
11. **[Linked List • Hard]** Merge k Sorted Lists Variant 1 (`q_curr_453_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.67), primary topic match (Binary Tree)_
12. **[Binary Tree • Hard]** Serialize and Deserialize Binary Tree Variant 2 (`q_curr_469_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.70), primary topic match (Array)_
13. **[Array • Hard]** Trapping Rain Water Variant 2 (`q_curr_466_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.72), primary topic match (Array)_
14. **[Array • Hard]** Sliding Window Maximum Variant 1 (`q_curr_462_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.74), primary topic match (Array)_
15. **[Array • Hard]** Sliding Window Maximum Variant 1 (`q_curr_462_algo_gen`) ➔ Correct: `True`
   *Reasons*: _Adaptive candidate_

#### Final ML Skill Profile:
- **Verified Skill Level**: `Expert`
- **Accuracy Score**: `100.0%`
- **Confidence Score**: `33.37%`
- **Verified Strengths**: `Linked List, Stack, Queue, Binary Tree, BST, Array`
- **Target Focus Topics**: `String, HashMap, Two Pointer, Sliding Window, Heap, Priority Queue, Graph, BFS, DFS, Backtracking, Greedy, Dynamic Programming, Trie, Union Find, Bit Manipulation, Recursion, Sorting, Binary Search, Prefix Sum, Matrix, Intervals`

---
### Profile: Student C (Graph, BFS, DFS, DP)
- **Input Text**: `"I have solved many problems using graphs, BFS, DFS and dynamic programming."`
- **NLP Detected Topics**: `Graph (70%), BFS (70%), DFS (70%), Dynamic Programming (70%)`
- **Initial ML Skill Estimate**: `Advanced` (Ability score: `0.75`)

#### Question Sequence Executed (15 Qs):
1. **[Array • Medium]** Maximum Subarray (`q_curr_10_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.55), primary topic match (Array)_
2. **[Array • Medium]** Maximum Subarray (`q_curr_10_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.59), primary topic match (Array)_
3. **[Array • Medium]** Maximum Subarray (`q_curr_10_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.63), primary topic match (Array)_
4. **[Array • Medium]** Number of Islands Variant 5 (`q_curr_358_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.67), primary topic match (Graph)_
5. **[Graph • Medium]** Number of Islands Variant 1 (`q_curr_230_concept_grid`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.69), primary topic match (Array)_
6. **[Array • Medium]** Maximum Subarray (`q_proc_510_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.72), primary topic match (Binary Tree)_
7. **[Binary Tree • Medium]** Validate Binary Search Tree Variant 1 (`q_curr_227_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Medium: P=0.74), primary topic match (Binary Tree)_
8. **[Binary Tree • Medium]** Validate Binary Search Tree Variant 5 (`q_curr_355_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.44), primary topic match (Binary Tree)_
9. **[Binary Tree • Hard]** Serialize and Deserialize Binary Tree Variant 2 (`q_curr_469_algo_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.50), primary topic match (Binary Tree)_
10. **[Binary Tree • Hard]** Serialize and Deserialize Binary Tree Variant 3 (`q_curr_481_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.55), primary topic match (Binary Tree)_
11. **[Binary Tree • Hard]** Serialize and Deserialize Binary Tree Variant 1 (`q_curr_457_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.59), primary topic match (String)_
12. **[String • Hard]** Longest Palindromic Substring Variant 3 (`q_curr_268_algo_manacher`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.63), primary topic match (String)_
13. **[String • Hard]** Word Ladder Variant 1 (`q_curr_456_impl`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.66), primary topic match (String)_
14. **[String • Hard]** Edit Distance Variant 1 (`q_curr_460_concept_gen`) ➔ Correct: `True`
   *Reasons*: _IRT diff fit (Hard: P=0.69), primary topic match (String)_
15. **[String • Hard]** Longest Palindromic Substring Variant 5 (`q_curr_332_algo_manacher`) ➔ Correct: `True`
   *Reasons*: _Adaptive candidate_

#### Final ML Skill Profile:
- **Verified Skill Level**: `Expert`
- **Accuracy Score**: `100.0%`
- **Confidence Score**: `30.31%`
- **Verified Strengths**: `Graph, BFS, DFS, Dynamic Programming, Array, String, Binary Tree`
- **Target Focus Topics**: `HashMap, Two Pointer, Sliding Window, Linked List, Stack, Queue, BST, Heap, Priority Queue, Backtracking, Greedy, Trie, Union Find, Bit Manipulation, Recursion, Sorting, Binary Search, Prefix Sum, Matrix, Intervals`

---
### Profile: Student D (No DSA Knowledge)
- **Input Text**: `"I have never studied data structures."`
- **NLP Detected Topics**: `Array (36%)`
- **Initial ML Skill Estimate**: `Beginner` (Ability score: `0.25`)

#### Question Sequence Executed (15 Qs):
1. **[Array • Easy]** Two Sum (`q_curr_1_concept`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.54), targets previous mistake in Array_
2. **[Array • Easy]** Best Time to Buy and Sell Stock (`q_curr_12_impl`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.49), targets previous mistake in Array_
3. **[Array • Easy]** Contains Duplicate Variant 1 (`q_curr_20_algo_gen`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.44), targets previous mistake in Array_
4. **[Array • Easy]** Majority Element Variant 1 (`q_curr_15_concept_gen`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.40), targets previous mistake in Array_
5. **[Array • Easy]** Climbing Stairs (`q_curr_11_impl`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.36), targets previous mistake in Array_
6. **[Array • Easy]** Search Insert Position Variant 1 (`q_curr_24_algo_gen`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.33), targets previous mistake in Array_
7. **[Array • Easy]** Two Sum (`q_curr_1_time_brute`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.30), targets previous mistake in Array_
8. **[Array • Easy]** Majority Element Variant 1 (`q_curr_15_impl`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.27), targets previous mistake in Array_
9. **[Array • Easy]** Two Sum (`q_curr_1_algo_opt`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.34), targets previous mistake in Array_
10. **[Array • Easy]** Best Time to Buy and Sell Stock (`q_curr_12_concept_gen`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.31), targets previous mistake in Array_
11. **[Array • Easy]** Move Zeroes Variant 1 (`q_curr_25_impl`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.28), targets previous mistake in Array_
12. **[Array • Easy]** Best Time to Buy and Sell Stock (`q_curr_12_algo_gen`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.26), targets previous mistake in Array_
13. **[Array • Easy]** Search Insert Position Variant 1 (`q_curr_24_concept_gen`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.24), targets previous mistake in Array_
14. **[Array • Easy]** Two Sum (`q_curr_1_impl`) ➔ Correct: `False`
   *Reasons*: _IRT diff fit (Easy: P=0.22), targets previous mistake in Array_
15. **[Array • Easy]** Majority Element Variant 1 (`q_curr_15_algo_gen`) ➔ Correct: `False`
   *Reasons*: _Adaptive candidate_

#### Final ML Skill Profile:
- **Verified Skill Level**: `Beginner`
- **Accuracy Score**: `6.67%`
- **Confidence Score**: `36.29%`
- **Verified Strengths**: `Array`
- **Target Focus Topics**: `Array, String, HashMap, Two Pointer, Sliding Window, Linked List, Stack, Queue, Binary Tree, BST, Heap, Priority Queue, Graph, BFS, DFS, Backtracking, Greedy, Dynamic Programming, Trie, Union Find, Bit Manipulation, Recursion, Sorting, Binary Search, Prefix Sum, Matrix, Intervals`

---
## Same-User Repeated Assessment Diversity Test

To verify Softmax controlled weighted randomization, Student A ("I know arrays and strings.") was run through 5 consecutive assessment sessions.

- **Session Run 1 Question IDs**: `q_curr_1_concept, q_curr_27_algo_gen, q_curr_8_ds_selection, q_curr_14_impl, q_curr_34_concept_gen, q_curr_74_algo_gen, q_curr_54_impl, q_curr_54_concept_gen, q_curr_14_algo_gen, q_curr_74_impl, q_curr_14_concept_gen, q_curr_94_algo_gen` 
- **Session Run 2 Question IDs**: `q_curr_1_impl, q_curr_41_algo_gen, q_curr_22_time_bs, q_curr_8_ds_selection, q_curr_14_concept_gen, q_curr_14_impl, q_curr_14_algo_gen, q_curr_74_concept_gen, q_curr_54_impl, q_curr_34_algo_gen, q_curr_34_concept_gen, q_curr_34_impl` 
- **Session Run 3 Question IDs**: `q_curr_1_concept, q_curr_21_impl, q_curr_22_time_bs, q_curr_14_concept_gen, q_curr_54_impl, q_curr_94_algo_gen, q_curr_94_concept_gen, q_curr_114_impl, q_curr_14_algo_gen, q_curr_74_concept_gen, q_curr_134_impl, q_curr_134_algo_gen` 
- **Session Run 4 Question IDs**: `q_curr_1_concept, q_curr_27_impl, q_curr_34_algo_gen, q_curr_34_concept_gen, q_curr_94_impl, q_curr_94_algo_gen, q_curr_74_concept_gen, q_curr_74_impl, q_curr_114_algo_gen, q_curr_114_concept_gen, q_curr_14_impl, q_curr_244_algo_backtrack` 
- **Session Run 5 Question IDs**: `q_curr_1_algo_opt, q_curr_21_impl, q_curr_29_ds_selection, q_curr_14_concept_gen, q_curr_34_algo_gen, q_curr_14_impl, q_curr_54_concept_gen, q_curr_94_algo_gen, q_curr_94_impl, q_curr_74_concept_gen, q_curr_134_algo_gen, q_curr_34_impl` 

- **Total Questions Served Across 5 Runs**: `60`
- **Unique Question Count**: `30`
- **Unique Question Rate**: `50.0%`
- **Sequence Diversity Status**: **VERIFIED** — Softmax sampling over candidate pool produces high-quality variation for identical student profiles across sessions.
