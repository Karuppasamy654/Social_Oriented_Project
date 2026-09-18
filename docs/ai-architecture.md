# CodeBuddy — AI Architecture & Agent Specification

This document details the multi-agent AI architecture, skill classification pipelines, recommendation algorithms, and Judge0 code execution integration within CodeBuddy.

---

## 1. AI Agents Overview

CodeBuddy incorporates 4 distinct specialized AI agents:

1. **Adaptive Skill Assessment Agent**:
   - Diagnoses initial student proficiency level across **Beginner, Intermediate, and Advanced**.
   - Generates 3 adaptive diagnostic questions and evaluates answer performance.

2. **Adaptive Company Interview Agent**:
   - Manages company-specific technical mock interview sessions.
   - Selects Question 1 at interview start and **dynamically re-ranks and selects Question $N+1$** post-submission based on Judge0 execution outcome, code analysis, and mistake memory.

3. **AI Code Understanding & Follow-up Agent**:
   - Analyzes submitted student code structure post-execution.
   - Generates 2–5 solution-specific code understanding questions (e.g. data structure choice, average vs worst-case complexity, edge case handling).

4. **Global Persistent AI Study Buddy (`Ask AI Buddy`)**:
   - Persistent learning assistant available across all pages for context-aware code explanation, hint generation, and roadmap coaching.

---

## 2. ML Skill Classifier & Mistake Memory

- **Model**: Random Forest Classifier / Multi-Feature Skill Model.
- **Features**: Accepted rate, accuracy, average solve time, hint requests, topic mastery, assessment score, understanding score, edge-case success.
- **Mistake Memory**: Records specific mistake patterns (e.g., *HashMap key existence check missing*, *Sliding window boundary off-by-one*, *BFS visited-state handling*).
- **Feedback Loop**: Identified mistakes dynamically boost candidate ranking scores for remedial problems in subsequent practice and interview sessions.

---

## 3. Judge0 Execution Integration

- **Primary Sandbox**: Judge0 API / Local sandbox runner.
- **Languages Supported**: C++ (GCC 9.2), JavaScript (Node.js), Python 3.
- **Source of Truth**: Judge0 execution results (`Accepted`, `Wrong Answer`, `Time Limit Exceeded`, `Runtime Error`, `Compilation Error`) serve as the authoritative signal for performance scoring and adaptation. Gemini LLM is strictly prohibited from fabricating execution results.
