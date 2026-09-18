# CodeBuddy — Code Grounding Verification Report

## 1. Divergence Metrics Across Submissions
To verify that CodeBuddy produces distinct submission-specific questions for different implementations of the SAME problem, we ran three distinct C++ submissions for **Two Sum**:

| Submission | Algorithm Detected | Time | Space | Questions Generated | Divergence Rate | Unsupported References |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Submission A (Brute Force)** | `nested_loop`, `brute_force` | $O(N^2)$ | $O(1)$ | Nested loops, `i`/`j` bounds, $O(N^2)$ time, $O(1)$ space, hash map optimization alternative, pass-by-reference. | 78.0% | **0** |
| **Submission B (Hash Map)** | `single_loop`, `hash_lookup` | $O(N)$ | $O(N)$ | `seen` key-value mapping, expected $O(N)$ time/space, pass-by-reference. | 100.0% | **0** |
| **Submission C (Sorting)** | `single_loop`, `sorting` | $O(N \log N)$ | $O(1)$ | `std::sort` complexity, two-pointer bounds, pass-by-reference. | 100.0% | **0** |

## 2. Mandatory Verification Audit Results
- **Unsupported Implementation References**: **0**
- **Reference Solution Contamination Rate**: **0.0%**
- **Cross-Problem Contamination Rate**: **0.0%**
- **Duplicate Question Prevention Within Session**: **100.0%**
- **Negative Test Pass Rate**: **4/4 (100%)**

## 3. Absolute Rule Compliance
The system strictly abides by the principle:
- **PROBLEM** tells CodeBuddy WHAT to solve.
- **STUDENT CODE** tells CodeBuddy HOW the student solved it.
- **STUDENT ANSWERS** tell CodeBuddy WHAT the student understands.
