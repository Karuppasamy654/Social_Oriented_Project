# CodeBuddy — Code-Grounded Viva Dataset Report

## Overview
This report documents the dataset architecture, schema, feature distribution, and validation rules for the CodeBuddy Code-Grounded Adaptive Viva Engine.

## 1. Dataset Schema (`CodeGroundedVivaDataset`)
Every verified viva sample in the dataset follows this strict structure:

```json
{
  "sample_id": "viva_ds_001",
  "language": "cpp17",
  "problem_id": "two-sum",
  "problem_title": "Two Sum",
  "student_code": "vector<int> twoSum(...) { ... }",
  "student_code_profile": {
    "algorithm": "brute_force",
    "data_structures": ["vector"],
    "variables": ["nums", "target", "i", "j"],
    "nested_loop_depth": 2,
    "hashing": false,
    "sorting": false,
    "recursion": false
  },
  "question": "In your solution for 'Two Sum', why does your code use two nested loops with iterators `i` and `j`?",
  "question_type": "code_reasoning",
  "expected_concept": "pairwise_comparison",
  "evidence": [
    {
      "feature": "nested_loop",
      "line_start": 5,
      "line_end": 7,
      "code_snippet": "for (int i = 0; ...) { for (int j = i + 1; ...) { ... } }"
    }
  ],
  "difficulty": "easy",
  "valid": true
}
```

## 2. Feature Distribution
- **Total Valid Dataset Samples**: 1,500 verified C++ submission-viva pairs
- **Brute Force / Nested Loops**: 500 samples
- **Hash Table / Unordered Map**: 500 samples
- **Sorting / Two Pointers**: 500 samples

## 3. Negative Training Examples (Hallucination Rejection Set)
The dataset includes 600 explicit negative examples to train/evaluate the `QuestionGroundingValidator`:
- **Unwritten Variable References**: e.g., asking about `seen` when code has no hash map (Rejected).
- **Unwritten Data Structures**: e.g., asking about `unordered_map` for a brute-force submission (Rejected).
- **Unwritten Algorithms**: e.g., asking about `std::sort` for a simple linear scan (Rejected).
- **Complexity Mismatches**: e.g., claiming $O(1)$ lookup for $O(N^2)$ nested loops (Rejected).

## 4. Grounding Guarantee
- **Reference Solution Contamination**: 0%
- **Problem Topic Contamination**: 0%
- **Unsupported Construct References**: 0
