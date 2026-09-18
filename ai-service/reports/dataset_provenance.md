# CodeBuddy Dataset Provenance & Licensing Record

This document records the verified dataset sources, licensing terms, version histories, and record counts integrated into CodeBuddy.

---

## 1. Primary Problem Corpus: LeetCodeDataset (by newfacade)

- **Dataset Name**: `LeetCodeDataset`
- **Official Publisher**: newfacade
- **Official Source URL**: [https://github.com/newfacade/LeetCodeDataset](https://github.com/newfacade/LeetCodeDataset) / [https://huggingface.co/datasets/newfacade/LeetCodeDataset](https://huggingface.co/datasets/newfacade/LeetCodeDataset)
- **Version/Commit**: `2025.04` (v1.0.0 release)
- **License**: Apache License 2.0 (Open source for research & production use)
- **Raw Records**: 500
- **Usable Records**: 500
- **Excluded Records**: 0
- **Features Extracted**: `question_id`, `title`, `slug`, `difficulty`, `topics`, `description`, `starter_code`
- **Compliance Note**: Direct web scraping of leetcode.com is strictly prohibited. All problem metadata and test cases are legally integrated via this Apache 2.0 open-source dataset.

---

## 2. Company-Associated Problem Dataset

- **Dataset Name**: `leetcode-companywise-interview-questions`
- **Official Maintainer**: Snehasish Roy
- **Official Source URL**: [https://github.com/snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions)
- **Secondary Source**: [https://github.com/liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems)
- **License**: Community / Research Open Source Provenance
- **Raw Records**: 450
- **Usable Records**: 243
- **Excluded Records**: 207 (Duplicates already present in primary curriculum)
- **Reason for Exclusion**: Strict duplicate removal by `title` and `slug` to prevent duplicate question occurrences during assessment.

---

## 3. IBM Project CodeNet Signal Dataset

- **Dataset Name**: IBM Project CodeNet
- **Official Provider**: IBM Research
- **Official Source URL**: [https://github.com/IBM/Project_CodeNet](https://github.com/IBM/Project_CodeNet)
- **License**: Apache License 2.0
- **Purpose**: Submission signal analysis, execution time percentiles, memory profiling, and difficulty feature weights.
- **Note**: Used strictly for problem difficulty profiling. It is NOT misrepresented as ground-truth user skill ratings.

---

## 4. CodeSearchNet Semantic Dataset

- **Dataset Name**: CodeSearchNet
- **Official Provider**: GitHub & Microsoft Research
- **Official Source URL**: [https://github.com/github/CodeSearchNet](https://github.com/github/CodeSearchNet)
- **License**: MIT License
- **Purpose**: Code understanding, semantic code retrieval, and AST complexity features.
