import os
import sys
import json
from typing import Dict, Any, List

# Ensure python path can find app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.code_intelligence.code_feature_extractor import extract_student_profile
from app.code_intelligence.code_diff import analyze_code_diff
from app.code_intelligence.code_similarity import compute_code_similarity
from app.code_intelligence.student_implementation_profile import build_student_implementation_profile
from app.code_intelligence.question_grounding import validate_question_grounding
from app.learning.understanding_model import LearnerUnderstandingModel
from app.ml.model_registry import model_registry
from app.api.understanding import build_candidate_questions

# Define test implementations for Two Sum
BRUTE_FORCE_CODE = """
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        for (int i = 0; i < nums.size(); i++) {
            for (int j = i + 1; j < nums.size(); j++) {
                if (nums[i] + nums[j] == target) {
                    return {i, j};
                }
            }
        }
        return {};
    }
};
"""

HASH_MAP_CODE = """
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.count(complement)) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};
"""

SORTING_CODE = """
class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        std::sort(nums.begin(), nums.end());
        int left = 0, right = nums.size() - 1;
        while (left < right) {
            int sum = nums[left] + nums[right];
            if (sum == target) return {left, right};
            else if (sum < target) left++;
            else right--;
        }
        return {};
    }
};
"""


def verify_grounded_viva_engine():
    print("==========================================================")
    print("CODEBUDDY - COMPLETE VIVA & INTELLIGENCE VERIFICATION TEST")
    print("==========================================================")

    # 1. TEST A: Brute Force Two Sum
    print("\n--- TEST A: Brute Force Two Sum ---")
    bf_profile = extract_student_profile(BRUTE_FORCE_CODE, "Two Sum", "two-sum")
    bf_questions = build_candidate_questions(bf_profile, BRUTE_FORCE_CODE)
    bf_diff = analyze_code_diff("class Solution { public: vector<int> twoSum(vector<int>& nums, int target) {} };", BRUTE_FORCE_CODE)

    print(f"Profile: {bf_profile.algorithm_patterns}, Time: {bf_profile.estimated_time_complexity}")
    print(f"Authored features: {bf_diff['student_authored_features']}")
    print(f"Generated {len(bf_questions)} questions:")

    unsupported_references_count = 0
    for idx, q in enumerate(bf_questions, 1):
        print(f"  Q{idx}: {q.question}")
        q_lower = q.question.lower()
        if ("you declared" in q_lower or "in your unordered_map" in q_lower or "declared seen" in q_lower or "in seen" in q_lower) and "unordered_map" not in BRUTE_FORCE_CODE:
            unsupported_references_count += 1
            print(f"  [FAIL] Brute Force question falsely claims student declared map/seen!")

    # 2. TEST B: Hash Map Two Sum
    print("\n--- TEST B: Hash Map Two Sum ---")
    hm_profile = extract_student_profile(HASH_MAP_CODE, "Two Sum", "two-sum")
    hm_questions = build_candidate_questions(hm_profile, HASH_MAP_CODE)
    print(f"Profile: {hm_profile.algorithm_patterns}, Time: {hm_profile.estimated_time_complexity}")
    print(f"Generated {len(hm_questions)} questions:")
    for idx, q in enumerate(hm_questions, 1):
        print(f"  Q{idx}: {q.question}")

    # 3. TEST C: Sorting Two Sum
    print("\n--- TEST C: Sorting Two Sum ---")
    sort_profile = extract_student_profile(SORTING_CODE, "Two Sum", "two-sum")
    sort_questions = build_candidate_questions(sort_profile, SORTING_CODE)
    print(f"Profile: {sort_profile.algorithm_patterns}, Time: {sort_profile.estimated_time_complexity}")
    print(f"Generated {len(sort_questions)} questions:")
    for idx, q in enumerate(sort_questions, 1):
        print(f"  Q{idx}: {q.question}")

    # 4. TEST D: Adaptive Questioning & Learner Understanding Updates
    print("\n--- TEST D: Adaptive Questioning & Learner Model ---")
    learner = LearnerUnderstandingModel()
    res1 = learner.evaluate_response({"correct_option_index": 0, "concept": "nested_loops"}, selected_index=0)
    res2 = learner.evaluate_response({"correct_option_index": 0, "concept": "nested_loops"}, selected_index=1)
    print(f"Learner response 1 (Correct): {res1['is_correct']}, score: {res1['updated_score']}")
    print(f"Learner response 2 (Incorrect): {res2['is_correct']}, score: {res2['updated_score']}")

    # 5. TEST E: Authorship & Similarity Signals
    print("\n--- TEST E: Authorship & Code Similarity Signals ---")
    sim_result = compute_code_similarity(BRUTE_FORCE_CODE, HASH_MAP_CODE)
    print(f"Similarity Signal Result: {sim_result}")

    # 6. NEGATIVE TEST SUITE
    print("\n----------------------------------------------------------")
    print("RUNNING NEGATIVE GROUNDING VALIDATOR TESTS")
    print("----------------------------------------------------------")
    bad_questions = [
        "You declared `seen` as an unordered_map. What is stored as the key and value in `seen`?",
        "Why is your recursive base case important in twoSum?",
        "Why did you call std::sort on nums inside twoSum?",
        "What is stored in listnode next pointer in your brute force loop?",
        "Why is x a hash key in your solution?",
        "What is a hash map?"
    ]

    rejected_count = 0
    for bq in bad_questions:
        valid, reason = validate_question_grounding(bq, BRUTE_FORCE_CODE, bf_profile)
        if not valid:
            rejected_count += 1
            print(f"  [OK] Correctly Rejected: '{bq[:55]}...' Reason: {reason}")
        else:
            print(f"  [FAIL] FAILED to Reject: '{bq}'")

    print(f"\nNegative Test Results: {rejected_count}/{len(bad_questions)} rejected successfully.")

    assert unsupported_references_count == 0, "Unsupported references must be 0!"
    assert rejected_count == len(bad_questions), "All negative tests must pass!"
    print("\n[OK] ALL CODEBUDDY VIVA & INTELLIGENCE VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    verify_grounded_viva_engine()
