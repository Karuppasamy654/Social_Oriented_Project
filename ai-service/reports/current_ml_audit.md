# CodeBuddy — Current ML/AI Architecture Audit Report

- **Date**: 2026-09-16
- **Auditor**: CodeBuddy AI Engineering Team
- **File**: `ai-service/reports/current_ml_audit.md`

---

## Executive Summary

An exhaustive audit of the existing CodeBuddy codebase (`ai-service/`, `server/`, `client/`, `data/`) was conducted. The audit reveals that while external datasets are cited in documentation, the runtime intelligence system relies heavily on **hardcoded Python string-matching heuristics**, **simulated accuracy metrics**, **random question pickers**, and **JavaScript rule fallbacks in Node.js**.

The sections below document the 20 key areas required by the CodeBuddy production ML specification.

---

## 1. Datasets & Provenance Findings

### 1.1 Datasets Currently Cited vs Runtime Usage
1. **IBM Project CodeNet**
   - **Source URL**: `https://github.com/IBM/Project_CodeNet`
   - **License**: Apache License 2.0
   - **Size**: ~14 million submissions across 4,000 problems
   - **Columns**: `problem_id`, `submission_id`, `cpu_time`, `memory`, `status`, `language`
   - **Labels**: Submission correctness / status (`Accepted`, `Wrong Answer`, `Time Limit Exceeded`)
   - **Preprocessing**: Summarized into problem difficulty indices in `data/sources.md`
   - **Runtime Reality**: Not directly loaded into active model training loops; metrics were manually hardcoded in `train_all_models.py`.

2. **CodeSearchNet**
   - **Source URL**: `https://github.com/github/CodeSearchNet`
   - **License**: MIT License
   - **Size**: ~2 million code-comment pairs
   - **Columns**: `code_tokens`, `docstring_tokens`, `func_name_tokens`
   - **Labels**: Semantic search relevance pairs
   - **Runtime Reality**: Cited in `data/sources.md` for semantic retrieval; no active embeddings loaded in `ai-service`.

3. **UCI Student Performance Data Set**
   - **Source URL**: `https://archive.ics.uci.edu/ml/datasets/Student+Performance`
   - **License**: CC BY 4.0
   - **Size**: 649 records
   - **Columns**: `studytime`, `failures`, `absences`, `G1`, `G2`, `G3`
   - **Labels**: Secondary school math/Portuguese final grades
   - **Runtime Reality**: Used as educational benchmark context only; does NOT contain DSA skill labels.

4. **CodeBuddy 500-Problem Curriculum**
   - **Source URL**: Derived from `newfacade/LeetCodeDataset` (Apache 2.0)
   - **Size**: 500 curated DSA problems in `server/scripts/seed.js`
   - **Columns**: `problem_id`, `title`, `difficulty`, `category`, `topics`, `sampleTestCases`, `hiddenTestCases`
   - **Runtime Reality**: Full problem taxonomy present in MongoDB and Node server, but `ai-service` used a 30-question inline array (`QUESTION_BANK` in `assessment_engine.py`).

5. **Company Problem Association Dataset**
   - **Source URL**: `https://github.com/snehasishroy/leetcode-companywise-interview-questions`
   - **License**: Open Community Maintainer
   - **Size**: ~1,200 company-to-problem mappings
   - **Runtime Reality**: Stored under `data/company/`, used in Node API for simple string lookup.

6. **First-Party CodeBuddy Interaction Data**
   - **Runtime Reality**: No structured logging or database collection schema currently exists for user interaction signals (attempt duration, hints requested per question, sub-second typing patterns). Cold-start proxying must be documented explicitly.

---

## 2. Algorithms & Model Training Pipeline Audit

### 2.1 Algorithms Trained vs Evaluated
- **Claimed in `reports/model_comparison.md`**: Logistic Regression, Linear SVM, Naive Bayes, Random Forest, Gradient Boosting evaluated via 5-Fold Stratified K-Fold.
- **Source Code Audit (`ai-service/training/train_all_models.py`)**:
  - Evaluation numbers were **hardcoded dictionary literals** inside lines 63–89 of `train_all_models.py`:
    ```python
    topic_results = {'Logistic Regression': {'Accuracy': 0.8800, 'Macro F1': 0.8650}, ...}
    skill_results = {'Logistic Regression': {'Accuracy': 0.8420, 'Precision': 0.8400}, ...}
    ```
  - No actual `scikit-learn` `cross_val_score` or train/test splits were executed.

### 2.2 Model Selection & Saved Artifacts
- **Saved Artifacts**:
  - `trained_models/topic_classifier.joblib`
  - `trained_models/skill_classifier.joblib`
  - `trained_models/answer_classifier.joblib`
  - `trained_models/feature_vectorizer.joblib`
- **Artifact Analysis**:
  - Saved files were serialized custom Python classes (`NativeMultiLabelNaiveBayes`, `NativeSkillClassifier`, `NativeTFIDF`) from `app/ml/native_models.py`.
  - Size of `.joblib` files: **127 bytes** each (pickle header only).
  - No genuine `scikit-learn` estimator binary trees or weight matrices were stored.

---

## 3. Runtime Inference & Decision Logic Audit

### 3.1 Topic Detection (`ai-service/app/ml/native_models.py`)
- **Implementation**:
  ```python
  class NativeMultiLabelNaiveBayes:
      def predict_proba(self, text):
          words = set(text.lower().split())
          # Hardcoded keyword count:
          match_count = sum(1 for kw in kws if kw in words)
          prob = min(0.95, 0.25 + (match_count * 0.35))
          return probs
  ```
- **Violation**: Disguised keyword matching masquerading as Naive Bayes. Does not use TF-IDF vectors or learned probabilities.

### 3.2 Skill Prediction (`ai-service/app/ml/native_models.py`)
- **Implementation**:
  ```python
  class NativeSkillClassifier:
      def predict(self, feature_vector):
          acc = feature_vector[0]
          if acc >= 85: return 'Expert', 0.94
          elif acc >= 70: return 'Advanced', 0.89
          elif acc >= 50: return 'Intermediate', 0.85
          else: return 'Beginner', 0.82
  ```
- **Violation**: Pure hardcoded `if-elif` ladder. No decision tree or ML classifier executed.

### 3.3 Question Selection (`ai-service/app/services/assessment_engine.py`)
- **Implementation**:
  ```python
  def select_next_question(target_topic, target_difficulty, asked_ids):
      matched = [q for q in candidates if q["topic"] == target_topic and q["difficulty"] == target_difficulty]
      return random.choice(matched)
  ```
  - Topic progression: `target_topic = topics[next_idx % len(topics)]`
- **Violation**: Uses `random.choice()` and round-robin modulo indexing. No information gain, uncertainty reduction, or student ability model.

---

## 4. JavaScript Intelligence Audit (Node.js & React)

### 4.1 Node.js Server (`server/routes/aiOnboarding.js`)
- **Violations Found**:
  1. `extractTopicsFromText()` (lines 97–120): Hardcoded `lower.includes('array')`, `lower.includes('string')` keyword parser.
  2. `predictMlSkillLevelFromText()` (lines 123–131): Hardcoded `if (lower.includes('graph')) return 'Expert'` level classifier.
  3. `selectDynamicQuestion()` (lines 82–94): Hardcoded `Math.random()` question selection in JS.
  4. Answer Grading & Level Classification (lines 354–363): `if (accScore >= 75) verifiedLevel = 'Expert'` score thresholding in JS.

### 4.2 React Client (`client/src/pages/OnboardingPage.jsx`)
- **Violations Found**:
  1. Client-side fallback state constructing topic confidence scores `0.90` when API fails.
  2. Fixed 12-question step counter independent of dynamic Python recommendation.

---

## 5. Audit Summary Matrix

| Module / Feature | Current Implementation | Violates Rules? | Required Remediation |
| :--- | :--- | :---: | :--- |
| **Topic Detection** | String keyword search in Python & JS | **YES** | Train TF-IDF + Multi-label scikit-learn model |
| **Skill Prediction** | `if (acc >= 85)` rule ladder | **YES** | Train scikit-learn Random Forest / Gradient Boosting |
| **Question Ranking** | `random.choice()` & `index % topics.length` | **YES** | Build Python uncertainty & information-gain ranker |
| **Model Evaluation** | Hardcoded JSON dictionary report | **YES** | Execute real 5-Fold Stratified Cross-Validation |
| **Node.js Gateway** | JS fallback functions executing logic | **YES** | Delegate all logic exclusively to Python HTTP APIs |
