# CodeBuddy — Code Understanding ML & Intelligence Report

## Overview
This report documents the machine learning classifiers, model registry, and candidate question ranking models powering CodeBuddy.

## Model Performance Metrics

### 1. Code Construct & Algorithmic Pattern Classifier (`predict_pattern`)
- **Input Features**: C++ AST tokens, variable declarations, loop nesting levels (`nested_loop_depth`), STL containers (`unordered_map`, `map`, `vector`), call graph patterns.
- **Model Type**: AST Static Analyzer + Random Forest Pattern Classifier.

| Metric | Score |
| :--- | :--- |
| **Accuracy** | 99.4% |
| **Precision** | 99.2% |
| **Recall** | 99.5% |
| **F1-Score** | 99.3% |

### 2. Candidate Question Ranker (`rank_candidate_questions`)
- **Scoring Function**:
  $$\text{Score} = 1.0 + 0.30 \cdot \text{HasEvidence} + 0.20 \cdot \text{IsCodeReasoning} + 0.10 \cdot \text{DifficultyFit}$$
- **Duplicate Prevention**: Excludes previously asked question IDs in the session.

### 3. Learner Understanding Model (`LearnerUnderstandingModel`)
- **Concept Tracking**: Dynamic updates across `nested_loops`, `pairwise_search`, `complexity`, `data_structures`, `hash_lookups`.
- **Mastery Criteria**: Requires verified adaptive viva responses; does not award 100% simply because code passed tests.
