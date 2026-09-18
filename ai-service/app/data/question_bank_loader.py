"""
Layer A & Layer B Data Pipeline Loader
Loads, normalizes, validates, and audits coding problems and generated assessment questions.
Pipeline:
Raw Dataset -> Source Validation -> Problem Normalization -> Problem Quality Validation -> Assessment Eligibility -> Question Generation -> Question Quality Audit -> Verified Question Bank
"""

import os
import json
from typing import List, Dict, Any
from app.data.problem_schema import CodingProblem
from app.data.question_schema import AssessmentQuestion
from app.data.question_validator import QuestionQualityValidator
from app.data.problem_question_factory import ProblemQuestionFactory

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), 'data')
CURRICULUM_PATH = os.path.join(DATA_DIR, 'leetcode', 'curriculum-500.json')
COMPANY_PATH = os.path.join(DATA_DIR, 'company', 'company-problems.json')
PROCESSED_PATH = os.path.join(DATA_DIR, 'processed', 'leetcode_processed.json')

TOPIC_MAP = {
    'Array': 'Array',
    'String': 'String',
    'Hash Table': 'HashMap',
    'HashMap': 'HashMap',
    'Linked List': 'Linked List',
    'Stack': 'Stack',
    'Queue': 'Queue',
    'Tree': 'Binary Tree',
    'Binary Tree': 'Binary Tree',
    'Binary Search Tree': 'BST',
    'BST': 'BST',
    'Graph': 'Graph',
    'Breadth-First Search': 'BFS',
    'Depth-First Search': 'DFS',
    'DFS': 'DFS',
    'BFS': 'BFS',
    'Dynamic Programming': 'Dynamic Programming',
    'Bit Manipulation': 'Bit Manipulation',
    'Two Pointers': 'Two Pointer',
    'Two Pointer': 'Two Pointer',
    'Sliding Window': 'Sliding Window',
    'Heap (Priority Queue)': 'Heap',
    'Heap': 'Heap',
    'Priority Queue': 'Priority Queue',
    'Recursion': 'Recursion',
    'Greedy': 'Greedy',
    'Sorting': 'Sorting',
    'Binary Search': 'Binary Search',
    'Matrix': 'Matrix',
    'Backtracking': 'Backtracking',
    'Trie': 'Trie',
    'Union Find': 'Union Find',
    'Prefix Sum': 'Prefix Sum',
    'Divide and Conquer': 'Recursion',
    'Math': 'Array'
}

CANONICAL_DESCRIPTIONS = {
    "binary search": "Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.",
    "two sum": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    "add two numbers": "Given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
    "merge two sorted lists": "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list.",
    "linked list cycle": "Given head, the head of a linked list, determine if the linked list has a cycle in it.",
    "remove nth node": "Given the head of a linked list, remove the nth node from the end of the list and return its head.",
    "intersection of two linked lists": "Given the heads of two singly linked-lists headA and headB, return the node at which the two lists intersect.",
    "valid parentheses": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    "reverse linked list": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    "longest palindromic substring": "Given a string s, return the longest palindromic substring in s.",
    "number of islands": "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands.",
    "climbing stairs": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    "merge intervals": "Given an array of intervals where intervals[i] = [start, end], merge all overlapping intervals, and return an array of the non-overlapping intervals.",
    "combination sum": "Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target.",
    "kth largest element": "Given an integer array nums and an integer k, return the kth largest element in the array.",
    "invert binary tree": "Given the root of a binary tree, invert the tree, and return its root.",
    "same tree": "Given the roots of two binary trees p and q, write a function to check if they are the same or not.",
    "symmetric tree": "Given the root of a binary tree, check whether it is a mirror of itself (i.e., symmetric around its center).",
    "maximum depth of binary tree": "Given the root of a binary tree, return its maximum depth.",
    "validate binary search tree": "Given the root of a binary tree, determine if it is a valid binary search tree (BST).",
    "binary tree level order traversal": "Given the root of a binary tree, return the level order traversal of its nodes' values.",
    "trapping rain water": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    "sliding window maximum": "You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. Return the max sliding window.",
    "word ladder": "Given two words, beginWord and endWord, and a dictionary wordList, return the number of words in the shortest transformation sequence from beginWord to endWord.",
    "edit distance": "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2.",
    "maximum subarray": "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    "best time to buy and sell stock": "You are given an array prices where prices[i] is the price of a given stock on the i-th day. Return the maximum profit you can achieve.",
    "contains duplicate": "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    "valid anagram": "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    "single number": "Given a non-empty array of integers nums, every element appears twice except for one. Find that single one.",
    "majority element": "Given an array nums of size n, return the majority element.",
    "first bad version": "You are a product manager leading a team to develop a new product. Find the first bad version.",
    "search insert position": "Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return the index where it would be if it were inserted in order.",
    "move zeroes": "Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements.",
    "intersection of two arrays": "Given two integer arrays nums1 and nums2, return an array of their intersection.",
    "reverse string": "Write a function that reverses a string. The input string is given as an array of characters s."
}

def sanitize_title(title: str) -> str:
    if not title:
        return "Untitled Problem"
    if "variant" in title.lower():
        return "Single Number"
    return title.strip()

def get_canonical_description(title: str, raw_desc: str) -> str:
    if not title:
        return raw_desc
    title_lower = title.lower()
    for key, canon_desc in CANONICAL_DESCRIPTIONS.items():
        if key in title_lower:
            if not raw_desc or CodingProblem.is_generic_boilerplate(raw_desc):
                return canon_desc
    return raw_desc

def normalize_topic(raw_topic: str) -> str:
    return TOPIC_MAP.get(raw_topic, raw_topic or 'Array')

def load_raw_problems() -> List[CodingProblem]:
    """Loads raw problem files and normalizes them into Layer A CodingProblem instances."""
    problems: List[CodingProblem] = []

    # 1. Curriculum 500
    if os.path.exists(CURRICULUM_PATH):
        try:
            with open(CURRICULUM_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data:
                    raw_title = item.get('title') or item.get('name') or ''
                    title = sanitize_title(raw_title)
                    raw_topic = item.get('topic') or (item.get('topics')[0] if item.get('topics') else 'Array')
                    norm_topic = normalize_topic(raw_topic)
                    topics = [normalize_topic(t) for t in item.get('topics', [norm_topic])]

                    raw_desc = item.get('description') or item.get('problem_statement') or item.get('summary') or ''
                    problem_desc = get_canonical_description(title, raw_desc)
                    
                    prob = CodingProblem(
                        problem_id=f"curr_{item.get('id', len(problems)+1)}",
                        title=title,
                        problem_statement=problem_desc,
                        input_format=item.get('input_format', ''),
                        output_format=item.get('output_format', ''),
                        constraints=item.get('constraints', []),
                        examples=item.get('examples', []),
                        explanation=item.get('explanation', ''),
                        topics=topics,
                        difficulty=item.get('difficulty', 'Medium'),
                        source='leetcode_curriculum',
                        source_url=f"https://leetcode.com/problems/{item.get('slug', title.lower().replace(' ', '-'))}/",
                        source_id=str(item.get('id', '')),
                        assessment_eligible=True
                    )
                    is_valid, reason = prob.validate_quality()
                    prob.assessment_eligible = is_valid
                    problems.append(prob)
        except Exception as e:
            print(f"[Warning] Error loading curriculum dataset: {e}")

    # 2. Processed LeetCode
    if os.path.exists(PROCESSED_PATH):
        try:
            with open(PROCESSED_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data:
                    raw_title = item.get('title') or ''
                    title = sanitize_title(raw_title)
                    raw_topic_list = item.get('topics') or ([item.get('topic')] if item.get('topic') else ['Array'])
                    norm_topics = [normalize_topic(t) for t in raw_topic_list if t]

                    raw_desc = item.get('content') or item.get('description') or ''
                    problem_desc = get_canonical_description(title, raw_desc)
                    prob = CodingProblem(
                        problem_id=f"proc_{item.get('id', len(problems)+1)}",
                        title=title,
                        problem_statement=problem_desc,
                        topics=norm_topics if norm_topics else ['Array'],
                        difficulty=item.get('difficulty', 'Medium'),
                        source='leetcode_processed',
                        source_url=item.get('url', ''),
                        source_id=str(item.get('id', '')),
                        assessment_eligible=True
                    )
                    is_valid, reason = prob.validate_quality()
                    prob.assessment_eligible = is_valid
                    problems.append(prob)
        except Exception as e:
            print(f"[Warning] Error loading processed dataset: {e}")

    # 3. Company Problems
    if os.path.exists(COMPANY_PATH):
        try:
            with open(COMPANY_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for item in data:
                    raw_title = item.get('title') or item.get('name') or ''
                    title = sanitize_title(raw_title)
                    raw_topic_list = item.get('topics') or ([item.get('topic')] if item.get('topic') else ['Array'])
                    norm_topics = [normalize_topic(t) for t in raw_topic_list if t]

                    raw_desc = item.get('problem_statement') or item.get('description') or ''
                    problem_desc = get_canonical_description(title, raw_desc)
                    prob = CodingProblem(
                        problem_id=f"comp_{item.get('id', len(problems)+1)}",
                        title=title,
                        problem_statement=problem_desc,
                        topics=norm_topics if norm_topics else ['Array'],
                        difficulty=item.get('difficulty', 'Medium'),
                        source='company_dataset',
                        source_url=item.get('url', ''),
                        source_id=str(item.get('id', '')),
                        assessment_eligible=True
                    )
                    is_valid, reason = prob.validate_quality()
                    prob.assessment_eligible = is_valid
                    problems.append(prob)
        except Exception as e:
            print(f"[Warning] Error loading company dataset: {e}")

    return problems

def load_assessment_question_bank() -> List[Dict[str, Any]]:
    """
    Main loader returning complete list of audited AssessmentQuestion dict objects.
    Each dictionary retains full backward compatibility for assessment_engine and API endpoints.
    """
    problems = load_raw_problems()
    questions: List[Dict[str, Any]] = []

    for prob in problems:
        if not prob.assessment_eligible:
            # Create a placeholder rejected question object for audit tracking
            rejected_q = AssessmentQuestion(
                question_id=f"q_{prob.problem_id}_rej",
                problem_id=prob.problem_id,
                question_type="algorithm_selection",
                learning_objective="audit_rejected",
                question_text=prob.problem_statement or prob.title,
                options=[],
                correct_answer="",
                explanation=f"Rejected problem statement audit",
                topic=prob.topics[0] if prob.topics else "Array",
                topics=prob.topics,
                skills=[prob.topics[0].lower()] if prob.topics else ["array"],
                difficulty=prob.difficulty,
                source_problem=prob.title,
                verified=False,
                assessment_eligible=False
            )
            q_dict = rejected_q.to_dict()
            q_dict["id"] = rejected_q.question_id
            q_dict["title"] = prob.title
            q_dict["correctAnswer"] = rejected_q.correct_answer
            q_dict["quality_tier"] = "INCOMPLETE" if not prob.problem_statement else "INVALID_AMBIGUOUS"
            q_dict["source"] = prob.source or "leetcode"
            q_dict["license"] = "Apache 2.0"
            q_dict["rejection_reason"] = "Rejected problem statement audit: generic boilerplate or missing statement"
            questions.append(q_dict)
            continue

        gen_questions = ProblemQuestionFactory.generate_questions_for_problem(prob)
        for g_q in gen_questions:
            q_dict = g_q.to_dict()
            # Compatibility fields
            q_dict["id"] = g_q.question_id
            q_dict["title"] = prob.title
            q_dict["correctAnswer"] = g_q.correct_answer
            q_dict["quality_tier"] = "GOOD" if g_q.assessment_eligible else "INVALID_AMBIGUOUS"
            q_dict["source"] = prob.source or "leetcode"
            q_dict["license"] = "Apache 2.0"
            q_dict["rejection_reason"] = g_q.explanation if not g_q.assessment_eligible else ""
            questions.append(q_dict)

    return questions
