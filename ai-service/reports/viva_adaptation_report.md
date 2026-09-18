# CodeBuddy — Viva Adaptation & Divergence Report

## 1. Implementation Divergence Audit
Running the same problem (**Two Sum**) with three different student implementations yields distinct, code-grounded question sets:

| Submission | Detected Pattern | Time Complexity | Question Focus | Divergence Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Student A (Brute Force)** | `nested_loop`, `brute_force` | $O(N^2)$ | Outer/inner loops, $j = i + 1$ invariant, $O(N^2)$ time, $O(1)$ space | **78.0%** |
| **Student B (Hash Map)** | `single_loop`, `hash_lookup` | $O(N)$ | `seen` key-value pairs, complement lookup, expected $O(1)$ time, $O(N)$ space | **100.0%** |
| **Student C (Sorting)** | `single_loop`, `sorting` | $O(N \log N)$ | `std::sort` complexity, two pointers (`left`/`right`) | **100.0%** |

## 2. Adaptive Questioning Workflow
- **Correct Answer**: Advances to deeper implementation trade-offs and complexity analysis.
- **Incorrect Answer**: Adapts to simpler code-flow reinforcement and targeted concept remediation.
- **Refresh Protection**: Re-fetching a viva session returns the active question without random regeneration.
