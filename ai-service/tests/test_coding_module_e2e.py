import pytest
from app.api.code_analysis import analyze_code, CodeAnalysisRequest
from app.api.understanding import generate_questions, QuestionGenRequest
from app.api.mistake import detect_mistakes, MistakeDetectionRequest

SAMPLE_CPP_ACCEPTED = """#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

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
};"""

SAMPLE_CPP_NESTED = """#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        for (int i = 0; i <= nums.size(); i++) {
            for (int j = 0; j < nums.size(); j++) {
                if (nums[i] + nums[j] == target) {
                    return {i, j};
                }
            }
        }
        return {};
    }
};"""

def test_cpp_static_complexity_analysis():
    req = CodeAnalysisRequest(code=SAMPLE_CPP_ACCEPTED, language="cpp17", problem_title="Two Sum")
    resp = analyze_code(req)
    
    assert resp.estimated_time_complexity == "O(N)"
    assert resp.estimated_space_complexity == "O(N)"
    assert resp.confidence >= 0.85
    assert len(resp.evidence) > 0

def test_cpp_nested_loop_analysis():
    req = CodeAnalysisRequest(code=SAMPLE_CPP_NESTED, language="cpp17", problem_title="Two Sum")
    resp = analyze_code(req)
    
    assert resp.estimated_time_complexity == "O(N^2)"
    assert resp.nested_loop_max_depth == 2
    assert len(resp.potential_anti_patterns) > 0

def test_code_grounded_dynamic_questions():
    req = QuestionGenRequest(user_code=SAMPLE_CPP_ACCEPTED, problem_title="Two Sum", language="cpp17")
    questions = generate_questions(req)
    
    assert len(questions) >= 3
    q_texts = " ".join([q.question for q in questions]).lower()
    
    # Verify questions reference actual variables from user code
    assert "seen" in q_texts or "unordered_map" in q_texts
    assert "target - nums[i]" in q_texts or "complement" in q_texts or "nums" in q_texts

def test_mistake_detection_off_by_one():
    req = MistakeDetectionRequest(
        user_id="user_123",
        code=SAMPLE_CPP_NESTED,
        language="cpp17",
        problem_topic="Array",
        previous_mistakes=[{"mistakeType": "off_by_one", "occurrenceCount": 2}]
    )
    mistakes = detect_mistakes(req)
    
    assert len(mistakes) > 0
    off_by_one_m = next((m for m in mistakes if m.mistake_type == "off_by_one"), None)
    assert off_by_one_m is not None
    assert off_by_one_m.is_recurring is True
    assert off_by_one_m.frequency == 3
