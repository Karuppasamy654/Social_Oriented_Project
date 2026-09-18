# CodeBuddy — Authorship & Similarity Signal Report

## Overview
This report details objective code similarity metrics, edit telemetry, and code-explanation consistency signals.

## Signal Specifications
- **Reference Similarity**: Sequence similarity relative to official reference solution ($0.0 - 1.0$).
- **AST Similarity**: Keyword and structural pattern ratio ($0.0 - 1.0$).
- **Token Similarity**: Normalized code token Jaccard similarity ($0.0 - 1.0$).
- **Explanation Consistency**: Agreement between student code implementation features and viva response performance.

## Absolute Ethical Boundary
1. The system **never** accuses a student of cheating or claims mathematical proof of copying.
2. Similarity metrics are reported strictly as `similarity_signal` (e.g. `low_similarity`, `moderate_similarity`, `high_similarity`).
3. Understanding evidence and code similarity signals remain strictly separated.
