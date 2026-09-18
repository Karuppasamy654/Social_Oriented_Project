# CodeBuddy — Code Understanding Dataset Report

## Overview
This report details the composition, schema, and quality assurance metrics of `CodeGroundedVivaDataset`.

## Dataset Manifest & Provenance Summary
- **Dataset Path**: `ai-service/data/code_grounded_viva/`
- **Provenance Classification**: `Curated/Synthetic Development Dataset` (Not real student data)
- **Total Positive Development Samples**: 3 verified canonical development patterns (Brute Force, Hash Table, Sorting)
- **Total Negative Grounding Examples**: 6 explicit hallucination test cases
- **Supported Languages**: C++17

## Pattern Breakdown
| Pattern Category | Sample Count | Primary Constructs |
| :--- | :--- | :--- |
| **Brute Force / Nested Loops** | 1 | `for`, `while`, `i`, `j`, pairwise indexing |
| **Hash Table / Map Lookup** | 1 | `unordered_map`, `seen`, `complement`, `count()` |
| **Sorting & Two Pointers** | 1 | `std::sort`, `left`, `right`, `low`, `high` |

## Negative Dataset Categories
1. `invalid_nonexistent_construct`: Questions referencing unwritten variables like `seen` or `complement`.
2. `invalid_reference_contamination`: Questions assuming optimal reference solution when student used brute force.
3. `invalid_semantic_role`: Questions misidentifying variable arithmetic roles (e.g. calling an integer sum a hash key).
4. `invalid_generic_textbook`: Plain textbook definitions disassociated from user code.
