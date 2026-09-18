import os
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data"))
LEETCODE_JSON = os.path.join(DATA_DIR, "leetcode/curriculum-500.json")
OUTPUT_V2_JSON = os.path.join(DATA_DIR, "processed/coding_problems_v2.json")

VERIFIED_PROBLEMS = [
    {
        "problem_id": "two-sum",
        "title": "Two Sum",
        "slug": "two-sum",
        "difficulty": "Easy",
        "levelTier": "Beginner",
        "topics": ["Array", "Hash Table"],
        "judge_type": "function_array",
        "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        "input_format": "vector<int>& nums, int target",
        "output_format": "vector<int>",
        "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
        "examples": [
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."},
            {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."}
        ],
        "starterCode": {
            "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
            "javascript": "function twoSum(nums, target) {\n    \n}",
            "python": "def twoSum(nums, target):\n    pass"
        },
        "sampleTestCases": [
            {"test_id": "ts_v1", "input": "[2, 7, 11, 15]\n9", "expectedOutput": "[0,1]", "explanation": "Sample case 1"},
            {"test_id": "ts_v2", "input": "[3, 2, 4]\n6", "expectedOutput": "[1,2]", "explanation": "Sample case 2"}
        ],
        "hiddenTestCases": [
            {"hidden_test_id": "ts_h1", "category": "minimum_input", "input": "[3, 3]\n6", "expectedOutput": "[0,1]"},
            {"hidden_test_id": "ts_h2", "category": "duplicates", "input": "[1, 5, 8, 3, 12]\n11", "expectedOutput": "[2,3]"},
            {"hidden_test_id": "ts_h3", "category": "zeros", "input": "[0, 4, 3, 0]\n0", "expectedOutput": "[0,3]"},
            {"hidden_test_id": "ts_h4", "category": "negative_values", "input": "[-1, -2, -3, -4, -5]\n-8", "expectedOutput": "[2,4]"},
            {"hidden_test_id": "ts_h5", "category": "boundary_values", "input": "[10, 20, 30, 40, 50]\n90", "expectedOutput": "[3,4]"},
            {"hidden_test_id": "ts_h6", "category": "large_values", "input": "[100, 200, 300, 400]\n500", "expectedOutput": "[1,2]"},
            {"hidden_test_id": "ts_h7", "category": "repeated_elements", "input": "[1, 1, 1, 1, 1]\n2", "expectedOutput": "[0,1]"},
            {"hidden_test_id": "ts_h8", "category": "reverse_sorted", "input": "[5, 4, 3, 2, 1]\n9", "expectedOutput": "[0,1]"}
        ],
        "reference_solution": "class Solution { public: vector<int> twoSum(vector<int>& nums, int target) { unordered_map<int, int> m; for(int i=0; i<nums.size(); i++) { int diff = target - nums[i]; if(m.count(diff)) return {m[diff], i}; m[nums[i]] = i; } return {}; } };",
        "assessment_eligible": True
    },
    {
        "problem_id": "add-two-numbers",
        "title": "Add Two Numbers",
        "slug": "add-two-numbers",
        "difficulty": "Medium",
        "levelTier": "Intermediate",
        "topics": ["Linked List", "Math"],
        "judge_type": "function_linked_list",
        "description": "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
        "input_format": "ListNode* l1, ListNode* l2",
        "output_format": "ListNode*",
        "constraints": ["The number of nodes in each linked list is in the range [1, 100].", "0 <= Node.val <= 9"],
        "examples": [
            {"input": "l1 = [2,4,3], l2 = [5,6,4]", "output": "[7,0,8]", "explanation": "342 + 465 = 807."},
            {"input": "l1 = [0], l2 = [0]", "output": "[0]", "explanation": "0 + 0 = 0."}
        ],
        "starterCode": {
            "cpp": "#include <iostream>\nusing namespace std;\n\nstruct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n    ListNode(int x, ListNode *next) : val(x), next(next) {}\n};\n\nclass Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        \n    }\n};",
            "javascript": "function ListNode(val, next) {\n    this.val = (val===undefined ? 0 : val);\n    this.next = (next===undefined ? null : next);\n}\nfunction addTwoNumbers(l1, l2) {\n    \n}",
            "python": "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\ndef addTwoNumbers(l1, l2):\n    pass"
        },
        "sampleTestCases": [
            {"test_id": "atn_v1", "input": "[2,4,3]\n[5,6,4]", "expectedOutput": "[7,0,8]", "explanation": "342 + 465 = 807"},
            {"test_id": "atn_v2", "input": "[0]\n[0]", "expectedOutput": "[0]", "explanation": "0 + 0 = 0"}
        ],
        "hiddenTestCases": [
            {"hidden_test_id": "atn_h1", "category": "different_lengths", "input": "[9,9,9,9,9,9,9]\n[9,9,9,9]", "expectedOutput": "[8,9,9,9,0,0,0,1]"},
            {"hidden_test_id": "atn_h2", "category": "single_elements", "input": "[5]\n[5]", "expectedOutput": "[0,1]"},
            {"hidden_test_id": "atn_h3", "category": "carry_propagation", "input": "[9,9]\n[1]", "expectedOutput": "[0,0,1]"},
            {"hidden_test_id": "atn_h4", "category": "zeros", "input": "[0,1]\n[0,2]", "expectedOutput": "[0,3]"},
            {"hidden_test_id": "atn_h5", "category": "asymmetric_lists", "input": "[1,8]\n[0]", "expectedOutput": "[1,8]"},
            {"hidden_test_id": "atn_h6", "category": "large_digits", "input": "[8,9,9]\n[2]", "expectedOutput": "[0,0,0,1]"},
            {"hidden_test_id": "atn_h7", "category": "multi_digit_carry", "input": "[1]\n[9,9,9]", "expectedOutput": "[0,0,0,1]"},
            {"hidden_test_id": "atn_h8", "category": "boundary_length", "input": "[2,4,9]\n[5,6,4,9]", "expectedOutput": "[7,0,4,0,1]"}
        ],
        "reference_solution": "class Solution { public: ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) { ListNode dummy(0); ListNode* tail = &dummy; int carry = 0; while (l1 || l2 || carry) { int sum = carry; if (l1) { sum += l1->val; l1 = l1->next; } if (l2) { sum += l2->val; l2 = l2->next; } carry = sum / 10; tail->next = new ListNode(sum % 10); tail = tail->next; } return dummy.next; } };",
        "assessment_eligible": True
    },
    {
        "problem_id": "contains-duplicate",
        "title": "Contains Duplicate",
        "slug": "contains-duplicate",
        "difficulty": "Easy",
        "levelTier": "Beginner",
        "topics": ["Array", "Hash Table"],
        "judge_type": "function_array",
        "description": "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
        "input_format": "vector<int>& nums",
        "output_format": "bool",
        "constraints": ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
        "examples": [
            {"input": "nums = [1,2,3,1]", "output": "true", "explanation": "1 appears twice."},
            {"input": "nums = [1,2,3,4]", "output": "false", "explanation": "All elements are distinct."}
        ],
        "starterCode": {
            "cpp": "#include <iostream>\n#include <vector>\n#include <unordered_set>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        \n    }\n};",
            "javascript": "function containsDuplicate(nums) {\n    \n}",
            "python": "def containsDuplicate(nums):\n    pass"
        },
        "sampleTestCases": [
            {"test_id": "cd_v1", "input": "[1, 2, 3, 1]", "expectedOutput": "true", "explanation": "1 appears twice"},
            {"test_id": "cd_v2", "input": "[1, 2, 3, 4]", "expectedOutput": "false", "explanation": "All distinct"}
        ],
        "hiddenTestCases": [
            {"hidden_test_id": "cd_h1", "category": "duplicates_end", "input": "[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]", "expectedOutput": "true"},
            {"hidden_test_id": "cd_h2", "category": "single_element", "input": "[99]", "expectedOutput": "false"},
            {"hidden_test_id": "cd_h3", "category": "negative_distinct", "input": "[-5, -4, -3, -2, -1]", "expectedOutput": "false"},
            {"hidden_test_id": "cd_h4", "category": "negative_duplicate", "input": "[-5, -4, -5]", "expectedOutput": "true"},
            {"hidden_test_id": "cd_h5", "category": "zeros", "input": "[0, 0]", "expectedOutput": "true"},
            {"hidden_test_id": "cd_h6", "category": "large_unique", "input": "[10, 20, 30, 40, 50]", "expectedOutput": "false"},
            {"hidden_test_id": "cd_h7", "category": "repeated_boundary", "input": "[100, 200, 300, 100]", "expectedOutput": "true"},
            {"hidden_test_id": "cd_h8", "category": "sorted_distinct", "input": "[1, 2, 3, 4, 5, 6, 7]", "expectedOutput": "false"}
        ],
        "reference_solution": "class Solution { public: bool containsDuplicate(vector<int>& nums) { unordered_set<int> s; for (int x : nums) { if (s.count(x)) return true; s.insert(x); } return false; } };",
        "assessment_eligible": True
    },
    {
        "problem_id": "valid-anagram",
        "title": "Valid Anagram",
        "slug": "valid-anagram",
        "difficulty": "Easy",
        "levelTier": "Beginner",
        "topics": ["String", "Hash Table"],
        "judge_type": "function_string",
        "description": "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.",
        "input_format": "string s, string t",
        "output_format": "bool",
        "constraints": ["1 <= s.length, t.length <= 5 * 10^4"],
        "examples": [
            {"input": "s = \"anagram\", t = \"nagaram\"", "output": "true", "explanation": "Both contain exact character counts."},
            {"input": "s = \"rat\", t = \"car\"", "output": "false", "explanation": "Frequencies differ."}
        ],
        "starterCode": {
            "cpp": "#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        \n    }\n};",
            "javascript": "function isAnagram(s, t) {\n    \n}",
            "python": "def isAnagram(s: str, t: str) -> bool:\n    pass"
        },
        "sampleTestCases": [
            {"test_id": "va_v1", "input": "anagram\nnagaram", "expectedOutput": "true", "explanation": "Valid anagram"},
            {"test_id": "va_v2", "input": "rat\ncar", "expectedOutput": "false", "explanation": "Invalid anagram"}
        ],
        "hiddenTestCases": [
            {"hidden_test_id": "va_h1", "category": "matching_palindrome", "input": "listen\nsilent", "expectedOutput": "true"},
            {"hidden_test_id": "va_h2", "category": "single_char_match", "input": "a\na", "expectedOutput": "true"},
            {"hidden_test_id": "va_h3", "category": "single_char_mismatch", "input": "a\nb", "expectedOutput": "false"},
            {"hidden_test_id": "va_h4", "category": "length_mismatch", "input": "a\nab", "expectedOutput": "false"},
            {"hidden_test_id": "va_h5", "category": "repeated_chars", "input": "fluster\nrestful", "expectedOutput": "true"},
            {"hidden_test_id": "va_h6", "category": "extra_char", "input": "aa\na", "expectedOutput": "false"},
            {"hidden_test_id": "va_h7", "category": "different_frequency", "input": "aacc\nccac", "expectedOutput": "false"},
            {"hidden_test_id": "va_h8", "category": "large_anagram", "input": "abcdefghijklmnopqrstuvwxyz\nzysrqponmlkjihgfedcba", "expectedOutput": "true"}
        ],
        "reference_solution": "class Solution { public: bool isAnagram(string s, string t) { if (s.length() != t.length()) return false; vector<int> c(26,0); for(int i=0;i<s.length();i++) { c[s[i]-'a']++; c[t[i]-'a']--; } for(int x:c) if(x!=0) return false; return true; } };",
        "assessment_eligible": True
    },
    {
        "problem_id": "longest-substring-without-repeating-characters",
        "title": "Longest Substring Without Repeating Characters",
        "slug": "longest-substring-without-repeating-characters",
        "difficulty": "Medium",
        "levelTier": "Intermediate",
        "topics": ["String", "Sliding Window", "Hash Table"],
        "judge_type": "function_string",
        "description": "Given a string `s`, find the length of the **longest substring** without repeating characters.",
        "input_format": "string s",
        "output_format": "int",
        "constraints": ["0 <= s.length <= 5 * 10^4"],
        "examples": [
            {"input": "s = \"abcabcbb\"", "output": "3", "explanation": "The answer is \"abc\", with the length of 3."},
            {"input": "s = \"bbbbb\"", "output": "1", "explanation": "The answer is \"b\", with the length of 1."}
        ],
        "starterCode": {
            "cpp": "#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        \n    }\n};",
            "javascript": "function lengthOfLongestSubstring(s) {\n    \n}",
            "python": "def lengthOfLongestSubstring(s: str) -> int:\n    pass"
        },
        "sampleTestCases": [
            {"test_id": "lswrc_v1", "input": "abcabcbb", "expectedOutput": "3", "explanation": "Substring 'abc'"},
            {"test_id": "lswrc_v2", "input": "bbbbb", "expectedOutput": "1", "explanation": "Substring 'b'"}
        ],
        "hiddenTestCases": [
            {"hidden_test_id": "lswrc_h1", "category": "overlapping_repeats", "input": "pwwkew", "expectedOutput": "3"},
            {"hidden_test_id": "lswrc_h2", "category": "empty_string", "input": "", "expectedOutput": "0"},
            {"hidden_test_id": "lswrc_h3", "category": "two_chars", "input": "au", "expectedOutput": "2"},
            {"hidden_test_id": "lswrc_h4", "category": "distinct_middle", "input": "tmmzuxt", "expectedOutput": "5"},
            {"hidden_test_id": "lswrc_h5", "category": "all_unique", "input": "abcdefg", "expectedOutput": "7"},
            {"hidden_test_id": "lswrc_h6", "category": "spaces_symbols", "input": "a b c a", "expectedOutput": "3"},
            {"hidden_test_id": "lswrc_h7", "category": "single_char", "input": "z", "expectedOutput": "1"},
            {"hidden_test_id": "lswrc_h8", "category": "repeating_tail", "input": "dvdf", "expectedOutput": "3"}
        ],
        "reference_solution": "class Solution { public: int lengthOfLongestSubstring(string s) { vector<int> lastPos(256, -1); int maxLen = 0, left = 0; for (int right = 0; right < s.length(); right++) { if (lastPos[(unsigned char)s[right]] >= left) { left = lastPos[(unsigned char)s[right]] + 1; } lastPos[(unsigned char)s[right]] = right; maxLen = max(maxLen, right - left + 1); } return maxLen; } };",
        "assessment_eligible": True
    },
    {
        "problem_id": "3sum",
        "title": "3Sum",
        "slug": "3sum",
        "difficulty": "Medium",
        "levelTier": "Intermediate",
        "topics": ["Array", "Two Pointers", "Sorting"],
        "judge_type": "function_array",
        "description": "Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.",
        "input_format": "vector<int>& nums",
        "output_format": "vector<vector<int>>",
        "constraints": ["3 <= nums.length <= 3000"],
        "examples": [
            {"input": "nums = [-1,0,1,2,-1,-4]", "output": "[[-1,-1,2],[-1,0,1]]", "explanation": "Distinct triplets summing to 0."}
        ],
        "starterCode": {
            "cpp": "#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        \n    }\n};",
            "javascript": "function threeSum(nums) {\n    \n}",
            "python": "def threeSum(nums):\n    pass"
        },
        "sampleTestCases": [
            {"test_id": "3s_v1", "input": "[-1, 0, 1, 2, -1, -4]", "expectedOutput": "[[-1,-1,2],[-1,0,1]]", "explanation": "Sample case 1"},
            {"test_id": "3s_v2", "input": "[0, 1, 1]", "expectedOutput": "[]", "explanation": "No valid triplets"}
        ],
        "hiddenTestCases": [
            {"hidden_test_id": "3s_h1", "category": "all_zeros", "input": "[0, 0, 0]", "expectedOutput": "[[0,0,0]]"},
            {"hidden_test_id": "3s_h2", "category": "no_zero_sum", "input": "[1, 2, 3]", "expectedOutput": "[]"},
            {"hidden_test_id": "3s_h3", "category": "duplicates", "input": "[-2, 0, 0, 2, 2]", "expectedOutput": "[[-2,0,2]]"},
            {"hidden_test_id": "3s_h4", "category": "negatives_only", "input": "[-1, -2, -3, -4]", "expectedOutput": "[]"},
            {"hidden_test_id": "3s_h5", "category": "positives_only", "input": "[1, 2, 3, 4, 5]", "expectedOutput": "[]"},
            {"hidden_test_id": "3s_h6", "category": "multiple_solutions", "input": "[-2, 0, 1, 1, 2]", "expectedOutput": "[[-2,0,2],[-2,1,1]]"},
            {"hidden_test_id": "3s_h7", "category": "minimal_input", "input": "[0, 0, 0, 0]", "expectedOutput": "[[0,0,0]]"},
            {"hidden_test_id": "3s_h8", "category": "large_values", "input": "[-100, 50, 50, -50, 0, 50]", "expectedOutput": "[[-100,50,50],[-50,0,50]]"}
        ],
        "reference_solution": "class Solution { public: vector<vector<int>> threeSum(vector<int>& nums) { vector<vector<int>> res; sort(nums.begin(), nums.end()); for(int i=0; i<nums.size(); i++) { if(i>0 && nums[i]==nums[i-1]) continue; int l = i+1, r = nums.size()-1; while(l<r) { int sum = nums[i]+nums[l]+nums[r]; if(sum==0) { res.push_back({nums[i], nums[l], nums[r]}); while(l<r && nums[l]==nums[l+1]) l++; while(l<r && nums[r]==nums[r-1]) r--; l++; r--; } else if(sum<0) l++; else r--; } } return res; } };",
        "assessment_eligible": True
    }
]

def build_canonical_dataset():
    print("Building canonical 500-problem bank...")
    
    raw_problems = []
    if os.path.exists(LEETCODE_JSON):
        with open(LEETCODE_JSON, "r", encoding="utf-8") as f:
            raw_problems = json.load(f)

    problem_map = {}
    
    for vp in VERIFIED_PROBLEMS:
        pid = vp["problem_id"]
        problem_map[pid] = vp

    for idx, raw in enumerate(raw_problems):
        title = raw.get("title") or f"Problem {idx+1}"
        slug = raw.get("slug") or title.lower().replace(" ", "-")
        
        if slug in problem_map:
            continue
            
        topics = raw.get("topics") or ["Array"]
        diff = raw.get("difficulty") or "Medium"
        
        judge_type = "function_array"
        if "Linked List" in topics:
            judge_type = "function_linked_list"
        elif "Tree" in topics or "Binary Tree" in topics or "BST" in topics:
            judge_type = "function_tree"
        elif "String" in topics:
            judge_type = "function_string"
        elif "Matrix" in topics:
            judge_type = "function_matrix"
            
        cpp_starter = f"// Solution for {title}\n#include <vector>\nusing namespace std;\nclass Solution {{\npublic:\n}};"

        record = {
            "problem_id": slug,
            "title": title,
            "slug": slug,
            "difficulty": diff,
            "levelTier": "Beginner" if diff == "Easy" else ("Intermediate" if diff == "Medium" else "Advanced"),
            "topics": topics,
            "judge_type": judge_type,
            "description": raw.get("description") or f"Given input for {title}, design an optimal algorithm.",
            "input_format": raw.get("input_format") or "Standard input",
            "output_format": raw.get("output_format") or "Standard output",
            "constraints": raw.get("constraints") or ["1 <= input.length <= 10^4"],
            "examples": raw.get("examples") or [
                {"input": "sample input 1", "output": "sample output 1"}
            ],
            "starterCode": raw.get("starterCode") or {
                "cpp": cpp_starter,
                "javascript": "function solution() {\n}",
                "python": "def solution():\n    pass"
            },
            "sampleTestCases": raw.get("sampleTestCases") or [
                {"test_id": f"{slug}_v1", "input": "sample 1", "expectedOutput": "output 1"}
            ],
            "hiddenTestCases": raw.get("hiddenTestCases") or [
                {"hidden_test_id": f"{slug}_h{i+1}", "category": "edge_case", "input": f"hidden {i+1}", "expectedOutput": f"out {i+1}"} for i in range(8)
            ],
            "reference_solution": f"// Reference solution for {title}",
            "assessment_eligible": len(raw.get("hiddenTestCases", [])) >= 8
        }
        problem_map[slug] = record

    processed_list = list(problem_map.values())
    
    os.makedirs(os.path.dirname(OUTPUT_V2_JSON), exist_ok=True)
    with open(OUTPUT_V2_JSON, "w", encoding="utf-8") as f:
        json.dump(processed_list, f, indent=2)

    print(f"SUCCESS: Rebuilt {len(processed_list)} canonical problem records -> {OUTPUT_V2_JSON}")

if __name__ == "__main__":
    build_canonical_dataset()
