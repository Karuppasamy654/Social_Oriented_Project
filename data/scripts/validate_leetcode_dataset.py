import os
import json
import re

ALLOWED_DIFFICULTIES = {"Easy", "Medium", "Hard"}

CONTROLLED_TOPICS = {
    "Array", "String", "Hash Table", "Two Pointers", "Binary Search", 
    "Sliding Window", "Linked List", "Stack", "Queue", "Tree", 
    "Binary Tree", "BST", "Heap", "Priority Queue", "Graph", "DFS", 
    "BFS", "Backtracking", "Greedy", "Dynamic Programming", "Bit Manipulation", 
    "Math", "Sorting", "Prefix Sum", "Trie", "Union Find", "Recursion", "Matrix"
}

TOPIC_ALIAS_MAP = {
    "hashtable": "Hash Table",
    "hash map": "Hash Table",
    "hashmap": "Hash Table",
    "binary-search": "Binary Search",
    "sliding-window": "Sliding Window",
    "linked-list": "Linked List",
    "binary tree": "Binary Tree",
    "priority queue": "Priority Queue",
    "depth-first search": "DFS",
    "breadth-first search": "BFS",
    "dynamic programming": "Dynamic Programming",
    "bit manipulation": "Bit Manipulation",
    "prefix sum": "Prefix Sum",
    "union find": "Union Find"
}

def normalize_difficulty(raw_diff):
    if not raw_diff or not isinstance(raw_diff, str):
        return None
    val = raw_diff.strip().capitalize()
    if val in ALLOWED_DIFFICULTIES:
        return val
    return None

def normalize_topic(raw_topic):
    if not raw_topic or not isinstance(raw_topic, str):
        return None
    clean = raw_topic.strip()
    if clean in CONTROLLED_TOPICS:
        return clean
    lower_clean = clean.lower()
    if lower_clean in TOPIC_ALIAS_MAP:
        return TOPIC_ALIAS_MAP[lower_clean]
    for topic in CONTROLLED_TOPICS:
        if topic.lower() == lower_clean:
            return topic
    return None

def generate_slug(title, external_id):
    if not title:
        return f"problem-{external_id}"
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
    slug = re.sub(r'[\s_]+', '-', slug)
    return slug

def validate_dataset(records):
    report = {
        "totalRecords": len(records),
        "valid": 0,
        "invalid": 0,
        "duplicates": 0,
        "missingIDs": 0,
        "missingTitles": 0,
        "missingDifficulty": 0,
        "missingTopics": 0,
        "malformedRecords": 0,
        "invalidDetails": []
    }
    
    seen_ids = set()
    seen_slugs = set()
    valid_records = []

    for idx, rec in enumerate(records):
        errors = []
        ext_id = str(rec.get("question_id") or rec.get("externalId") or "").strip()
        title = str(rec.get("title") or "").strip()
        raw_diff = rec.get("difficulty")
        description = str(rec.get("question_content") or rec.get("description") or "").strip()
        raw_topics = rec.get("tags") or rec.get("topics") or []
        starter_code = rec.get("starter_code") or rec.get("starterCode") or {}

        if not ext_id:
            errors.append("Missing external ID")
            report["missingIDs"] += 1

        if not title:
            errors.append("Missing title")
            report["missingTitles"] += 1

        norm_diff = normalize_difficulty(raw_diff)
        if not norm_diff:
            errors.append(f"Invalid difficulty: {raw_diff}")
            report["missingDifficulty"] += 1

        if not description:
            errors.append("Missing description")
            report["malformedRecords"] += 1

        norm_topics = []
        if isinstance(raw_topics, list):
            for t in raw_topics:
                nt = normalize_topic(t)
                if nt and nt not in norm_topics:
                    norm_topics.append(nt)

        if not norm_topics:
            errors.append("Missing or unmapped valid topics")
            report["missingTopics"] += 1

        if not isinstance(starter_code, dict):
            errors.append("Starter code must be an object")

        if ext_id in seen_ids:
            errors.append(f"Duplicate external ID: {ext_id}")
            report["duplicates"] += 1

        if errors:
            report["invalid"] += 1
            report["invalidDetails"].append({"recordIndex": idx, "externalId": ext_id, "title": title, "reasons": errors})
        else:
            seen_ids.add(ext_id)
            report["valid"] += 1
            slug = generate_slug(title, ext_id)
            if slug in seen_slugs:
                slug = f"{slug}-{ext_id}"
            seen_slugs.add(slug)

            valid_records.append({
                "externalSource": "LeetCodeDataset",
                "externalId": ext_id,
                "title": title,
                "slug": slug,
                "description": description,
                "difficulty": norm_diff,
                "topics": norm_topics,
                "starterCode": {
                    "cpp": starter_code.get("cpp") or f"// Solution for {title}\n#include <iostream>\nusing namespace std;\nclass Solution {{\npublic:\n}};",
                    "javascript": starter_code.get("javascript") or f"// Solution for {title}\nfunction solution() {{\n}}",
                    "python": starter_code.get("python") or f"# Solution for {title}\ndef solution():\n    pass"
                },
                "supportedLanguages": ["cpp", "javascript", "python"],
                "constraints": rec.get("constraints") or ["Standard execution limits apply."],
                "examples": rec.get("examples") or [],
                "sampleTestCases": rec.get("sample_test_cases") or rec.get("sampleTestCases") or [],
                "hiddenTestCases": rec.get("hidden_test_cases") or rec.get("hiddenTestCases") or [],
                "sourceMetadata": {
                    "dataset": "LeetCodeDataset",
                    "datasetVersion": "2025.04",
                    "importedAt": "2026-09-15"
                }
            })

    return report, valid_records

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_path = os.path.join(base_dir, "raw", "leetcode_dataset.json")
    
    # If raw file doesn't exist yet, we will generate a baseline benchmark dataset file
    if not os.path.exists(raw_path):
        os.makedirs(os.path.dirname(raw_path), exist_ok=True)
        sample_dataset = [
            {
                "question_id": "1",
                "title": "Two Sum",
                "difficulty": "Easy",
                "question_content": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
                "tags": ["Array", "Hash Table"],
                "constraints": ["2 <= nums.length <= 10^4"],
                "examples": [{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]"}],
                "sample_test_cases": [{"input": "[2, 7, 11, 15]\n9", "expectedOutput": "[0, 1]"}],
                "starter_code": {
                    "cpp": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n    }\n};",
                    "javascript": "function twoSum(nums, target) {\n}",
                    "python": "def twoSum(nums, target):\n    pass"
                }
            },
            {
                "question_id": "2",
                "title": "Add Two Numbers",
                "difficulty": "Medium",
                "question_content": "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order.",
                "tags": ["Linked List", "Math", "Recursion"],
                "constraints": ["The number of nodes in each linked list is in the range [1, 100]."],
                "examples": [{"input": "l1 = [2,4,3], l2 = [5,6,4]", "output": "[7,0,8]"}],
                "sample_test_cases": [{"input": "[2,4,3]\n[5,6,4]", "expectedOutput": "[7,0,8]"}],
                "starter_code": {
                    "cpp": "class Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n    }\n};",
                    "javascript": "function addTwoNumbers(l1, l2) {\n}",
                    "python": "def addTwoNumbers(l1, l2):\n    pass"
                }
            },
            {
                "question_id": "3",
                "title": "Longest Substring Without Repeating Characters",
                "difficulty": "Medium",
                "question_content": "Given a string s, find the length of the longest substring without repeating characters.",
                "tags": ["Hash Table", "String", "Sliding Window"],
                "constraints": ["0 <= s.length <= 5 * 10^4"],
                "examples": [{"input": "s = \"abcabcbb\"", "output": "3"}],
                "sample_test_cases": [{"input": "abcabcbb", "expectedOutput": "3"}],
                "starter_code": {
                    "cpp": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n    }\n};",
                    "javascript": "function lengthOfLongestSubstring(s) {\n}",
                    "python": "def lengthOfLongestSubstring(s: str) -> int:\n    pass"
                }
            },
            {
                "question_id": "4",
                "title": "Median of Two Sorted Arrays",
                "difficulty": "Hard",
                "question_content": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
                "tags": ["Array", "Binary Search", "Divide and Conquer"],
                "constraints": ["nums1.length == m", "nums2.length == n"],
                "examples": [{"input": "nums1 = [1,3], nums2 = [2]", "output": "2.00000"}],
                "sample_test_cases": [{"input": "[1,3]\n[2]", "expectedOutput": "2.0"}],
                "starter_code": {
                    "cpp": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n    }\n};",
                    "javascript": "function findMedianSortedArrays(nums1, nums2) {\n}",
                    "python": "def findMedianSortedArrays(nums1, nums2):\n    pass"
                }
            },
            {
                "question_id": "5",
                "title": "Longest Palindromic Substring",
                "difficulty": "Medium",
                "question_content": "Given a string s, return the longest palindromic substring in s.",
                "tags": ["String", "Dynamic Programming"],
                "constraints": ["1 <= s.length <= 1000"],
                "examples": [{"input": "s = \"babad\"", "output": "\"bab\""}],
                "sample_test_cases": [{"input": "babad", "expectedOutput": "bab"}],
                "starter_code": {
                    "cpp": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    string longestPalindrome(string s) {\n    }\n};",
                    "javascript": "function longestPalindrome(s) {\n}",
                    "python": "def longestPalindrome(s: str) -> str:\n    pass"
                }
            },
            {
                "question_id": "11",
                "title": "Container With Most Water",
                "difficulty": "Medium",
                "question_content": "You are given an integer array height of length n. Find two lines that together with the x-axis form a container, such that the container contains the most water.",
                "tags": ["Array", "Two Pointers", "Greedy"],
                "constraints": ["n == height.length", "2 <= n <= 10^5"],
                "examples": [{"input": "height = [1,8,6,2,5,4,8,3,7]", "output": "49"}],
                "sample_test_cases": [{"input": "[1,8,6,2,5,4,8,3,7]", "expectedOutput": "49"}],
                "starter_code": {
                    "cpp": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int maxArea(vector<int>& height) {\n    }\n};",
                    "javascript": "function maxArea(height) {\n}",
                    "python": "def maxArea(height):\n    pass"
                }
            },
            {
                "question_id": "15",
                "title": "3Sum",
                "difficulty": "Medium",
                "question_content": "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.",
                "tags": ["Array", "Two Pointers", "Sorting"],
                "constraints": ["3 <= nums.length <= 3000"],
                "examples": [{"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]"}],
                "sample_test_cases": [{"input": "[-1,0,1,2,-1,-4]", "expectedOutput": "[[-1,-1,2],[-1,0,1]]"}],
                "starter_code": {
                    "cpp": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n    }\n};",
                    "javascript": "function threeSum(nums) {\n}",
                    "python": "def threeSum(nums):\n    pass"
                }
            },
            {
                "question_id": "20",
                "title": "Valid Parentheses",
                "difficulty": "Easy",
                "question_content": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
                "tags": ["String", "Stack"],
                "constraints": ["1 <= s.length <= 10^4"],
                "examples": [{"input": "s = \"()[]{}\"", "output": "true"}],
                "sample_test_cases": [{"input": "()[]{}", "expectedOutput": "true"}],
                "starter_code": {
                    "cpp": "#include <string>\nusing namespace std;\nclass Solution {\npublic:\n    bool isValid(string s) {\n    }\n};",
                    "javascript": "function isValid(s) {\n}",
                    "python": "def isValid(s: str) -> bool:\n    pass"
                }
            },
            {
                "question_id": "21",
                "title": "Merge Two Sorted Lists",
                "difficulty": "Easy",
                "question_content": "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list.",
                "tags": ["Linked List", "Recursion"],
                "constraints": ["The number of nodes in both lists is in the range [0, 50]."],
                "examples": [{"input": "list1 = [1,2,4], list2 = [1,3,4]", "output": "[1,1,2,3,4,4]"}],
                "sample_test_cases": [{"input": "[1,2,4]\n[1,3,4]", "expectedOutput": "[1,1,2,3,4,4]"}],
                "starter_code": {
                    "cpp": "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n    }\n};",
                    "javascript": "function mergeTwoLists(list1, list2) {\n}",
                    "python": "def mergeTwoLists(list1, list2):\n    pass"
                }
            },
            {
                "question_id": "53",
                "title": "Maximum Subarray",
                "difficulty": "Medium",
                "question_content": "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
                "tags": ["Array", "Divide and Conquer", "Dynamic Programming"],
                "constraints": ["1 <= nums.length <= 10^5"],
                "examples": [{"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6"}],
                "sample_test_cases": [{"input": "[-2,1,-3,4,-1,2,1,-5,4]", "expectedOutput": "6"}],
                "starter_code": {
                    "cpp": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n    }\n};",
                    "javascript": "function maxSubArray(nums) {\n}",
                    "python": "def maxSubArray(nums):\n    pass"
                }
            },
            {
                "question_id": "70",
                "title": "Climbing Stairs",
                "difficulty": "Easy",
                "question_content": "You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
                "tags": ["Math", "Dynamic Programming"],
                "constraints": ["1 <= n <= 45"],
                "examples": [{"input": "n = 3", "output": "3"}],
                "sample_test_cases": [{"input": "3", "expectedOutput": "3"}],
                "starter_code": {
                    "cpp": "class Solution {\npublic:\n    int climbStairs(int n) {\n    }\n};",
                    "javascript": "function climbStairs(n) {\n}",
                    "python": "def climbStairs(n: int) -> int:\n    pass"
                }
            },
            {
                "question_id": "121",
                "title": "Best Time to Buy and Sell Stock",
                "difficulty": "Easy",
                "question_content": "You are given an array prices where prices[i] is the price of a given stock on the i-th day. Return the maximum profit you can achieve.",
                "tags": ["Array", "Dynamic Programming"],
                "constraints": ["1 <= prices.length <= 10^5"],
                "examples": [{"input": "prices = [7,1,5,3,6,4]", "output": "5"}],
                "sample_test_cases": [{"input": "[7,1,5,3,6,4]", "expectedOutput": "5"}],
                "starter_code": {
                    "cpp": "#include <vector>\nusing namespace std;\nclass Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n    }\n};",
                    "javascript": "function maxProfit(prices) {\n}",
                    "python": "def maxProfit(prices):\n    pass"
                }
            },
            {
                "question_id": "206",
                "title": "Reverse Linked List",
                "difficulty": "Easy",
                "question_content": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
                "tags": ["Linked List", "Recursion"],
                "constraints": ["The number of nodes in the list is the range [0, 5000]."],
                "examples": [{"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]"}],
                "sample_test_cases": [{"input": "[1,2,3,4,5]", "expectedOutput": "[5,4,3,2,1]"}],
                "starter_code": {
                    "cpp": "class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n    }\n};",
                    "javascript": "function reverseList(head) {\n}",
                    "python": "def reverseList(head):\n    pass"
                }
            }
        ]
        with open(raw_path, 'w') as f:
            json.dump(sample_dataset, f, indent=2)
        print(f"Generated benchmark dataset at {raw_path}")

    with open(raw_path, 'r') as f:
        records = json.load(f)

    report, valid_records = validate_dataset(records)

    report_path = os.path.join(base_dir, "leetcode-validation-report.json")
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"Validation report saved to {report_path}")
    print(f"Validated {report['valid']}/{report['totalRecords']} records.")

    processed_dir = os.path.join(base_dir, "processed")
    os.makedirs(processed_dir, exist_ok=True)
    processed_path = os.path.join(processed_dir, "leetcode_processed.json")
    with open(processed_path, 'w') as f:
        json.dump(valid_records, f, indent=2)
    print(f"Processed valid dataset saved to {processed_path}")
