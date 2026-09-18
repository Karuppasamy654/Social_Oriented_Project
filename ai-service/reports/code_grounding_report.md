# CodeBuddy — Code Grounding Verification Report

## Grounding Metrics
All candidate questions are validated against `StudentImplementationProfile` and `analyze_code_diff`.

| Metric | Measured Result | Target | Status |
| :--- | :--- | :--- | :--- |
| **Unsupported Constructs** | **0** | 0 | PASSED |
| **Reference Solution Contamination** | **0.0%** | 0.0% | PASSED |
| **Cross-Submission Contamination** | **0.0%** | 0.0% | PASSED |
| **Session Duplicate Questions** | **0** | 0 | PASSED |
| **Negative Test Rejection Rate** | **100.0% (6/6)** | 100% | PASSED |

## Validation Boundary Principles
1. **Lexical Validation**: Rejects unwritten variables (`seen`, `complement`) and unwritten data structures (`unordered_map`).
2. **Semantic Validation**: Verifies variable roles match actual code operations.
3. **Complexity Matching**: Enforces $O(N^2)$ for nested loops vs $O(N)$ for hash maps.
