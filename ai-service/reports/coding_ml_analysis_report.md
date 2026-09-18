# CodeBuddy Production Coding Module ML & Static Analysis Report

- **Report Date**: 2026-09-16
- **Version**: `v3.0.0`
- **Engine**: Hybrid C++ AST/Token Static Analysis + Scikit-Learn TF-IDF Cosine Similarity + LLM Semantic Refinement

---

## 1. Static C++ AST Complexity Analysis Engine

### Methodology
Combines C++ tokenization & AST loop nesting depth detection with execution metrics ($N$, execution time in ms, memory allocation in KB) to classify time & space complexity deterministically:

- **$O(1)$**: Direct lookup without loops.
- **$O(\log N)$**: Binary search boundary halving (`lower_bound`, `binary_search`).
- **$O(N)$**: Single pass loop iteration with `unordered_map` expected $O(1)$ lookups.
- **$O(N \log N)$**: Comparison-based sorting calls (`std::sort`, `std::stable_sort`).
- **$O(N^2)$**: Dual nested loop iteration.
- **$O(N^3)$**: Triple nested loop iteration.
- **$O(2^N)$**: Recursive branching tree traversal without memoization.

---

## 2. Code-Grounded Dynamic AI Viva Question Engine

### Pipeline Architecture
1. **C++ Variable & Feature Extractor**: Identifies exact user variables (e.g., `unordered_map<int,int> seen`, `vector<int>& nums`, loop iterator `int i`).
2. **Candidate Viva Question Generator**: Creates targeted questions inquiring why specific data structures or operations were chosen.
3. **Question Quality Validator**: Validates that every question refers strictly to code elements actually present in the user's submitted solution. Rejects fabricated variables or generic off-topic questions.
4. **Adaptive Scoring**: Calculates understanding score out of 100% and determines solution mastery status.

---

## 3. Persistent Mistake Memory & Error Classifier

- **Error Signature Normalizer**: Maps compiler/runtime faults to `compilation_error`, `runtime_error`, `time_limit_exceeded`, `memory_limit_exceeded`, `wrong_answer`, `output_format_error`.
- **Mistake Memory Classifier**: Persists mistake patterns (`off_by_one`, `incorrect_hash_logic`, `duplicate_handling`, `inefficient_loop`) with occurrence counts.
- **Intervention Trigger**: Flags recurring errors (3+ occurrences) with constructive guidance banners in the UI.

---

## 4. Problem Recommendation Engine

- **Model**: Content-Based TF-IDF + Problem Topic Cosine Similarity
- **Features**: Current problem topic, user weak topics, mistake history, target difficulty, solved problem exclusion.
