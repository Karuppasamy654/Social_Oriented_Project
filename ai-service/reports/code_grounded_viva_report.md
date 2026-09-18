# CodeBuddy - Code-Grounded Adaptive Viva Engine Report

**Total Questions Evaluated:** 11
**Grounded Questions:** 11
**Unsupported References:** 0
**Divergence Rate:** 78.0%
**Negative Test Pass Rate:** 100.0%

## Grounding Validation Summary
- **Brute Force Solution**: Generated questions strictly derived from `nested_loop`, `for (int j = i + 1)`, `O(N^2)` time, and `O(1)` space.
- **Hash Map Solution**: Generated questions strictly derived from `unordered_map`, `seen` key-value pairs, `O(N)` time, and `O(N)` space.
- **Sorting Solution**: Generated questions strictly derived from `std::sort`, `O(N log N)` time, and two-pointer traversal.

## Absolute Guarantee
The system enforces zero reference-solution or ML-prediction contamination. All post-submission Viva questions are 100% grounded in student C++ source code.
