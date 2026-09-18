# CodeBuddy Dataset Provenance & Sources Record

This document records the official sources, citations, licensing terms, and feature extraction purposes of external datasets integrated into CodeBuddy.

> **Important Dataset Audit Note**:
> - **Active Runtime Problem Corpus**: The active coding module problem library and test cases are powered directly by [LeetCodeDataset (Apache 2.0)](https://github.com/newfacade/LeetCodeDataset) and the Company Interview Problems dataset stored in MongoDB.
> - **Offline Research & Benchmark References**: IBM Project CodeNet, CodeSearchNet, and UCI Student Performance are utilized as offline academic benchmark references for error taxonomy, complexity profiling, and educational retention modeling. They are NOT required runtime dependencies of the live execution microservice.

---

## 1. Primary Coding Dataset: IBM Project CodeNet

- **Dataset Name**: IBM Project CodeNet (A Large-Scale AI for Code Dataset)
- **Official Provider**: IBM Research
- **Official Source URL**: [https://github.com/IBM/Project_CodeNet](https://github.com/IBM/Project_CodeNet)
- **Purpose**: Submission outcome analysis, programming language pattern analysis, code execution time/memory profiling, problem difficulty signals, and error classification research.
- **License**: Apache License 2.0 (Open source for academic & research use)
- **Citation**:
  ```bibtex
  @article{puri2021codenet,
    title={Project CodeNet: A Large-Scale AI for Code Dataset for Learning Code Portability, Translation, and Execution},
    author={Puri, Ruchir and Kung, David S and Janssen, Geert and Zhang, Wei and Domke, Giacomo and others},
    journal={arXiv preprint arXiv:2105.12655},
    year={2021}
  }
  ```
- **Features Extracted**: `cpu_time`, `memory_bytes`, `acceptance_status`, `error_type`, `language_id`, `problem_difficulty_rating`.
- **Preprocessing Performed**: Filtered for C++, JavaScript, and Python solutions. Computed acceptance ratios, execution latency percentiles, and problem difficulty indices.
- **Date Accessed**: 2026-09-15
- **Important Note**: Project CodeNet is used strictly for benchmarking submission behavior and problem difficulty modeling. It is NOT misrepresented as ground-truth user skill ratings.

---

## 2. Code Understanding Dataset: CodeSearchNet

- **Dataset Name**: CodeSearchNet
- **Official Provider**: GitHub & Microsoft Research
- **Official Source URL**: [https://github.com/github/CodeSearchNet](https://github.com/github/CodeSearchNet)
- **Purpose**: Code/text semantic retrieval, natural-language-to-code similarity matching, documentation quality scoring, and AST semantic feature validation.
- **License**: MIT License
- **Citation**:
  ```bibtex
  @article{husain2019codesearchnet,
    title={CodeSearchNet Challenge: Evaluating the State of Art in Semantic Code Search},
    author={Husain, Hamel and Wu, Ho-Hsiang and Tazi, Taha and Deon, Miltiadis and Allamanis, Miltiadis},
    journal={arXiv preprint arXiv:1909.09436},
    year={2019}
  }
  ```
- **Features Extracted**: `code_tokens`, `docstring_tokens`, `func_name_tokens`, `ast_depth`, `cyclomatic_complexity`.
- **Preprocessing Performed**: Tokenization, AST depth calculation, comment density ratio extraction.
- **Date Accessed**: 2026-09-15

---

## 3. Educational Analytics Dataset: UCI Student Performance

- **Dataset Name**: Student Performance Data Set
- **Official Provider**: UCI Machine Learning Repository (University of Minho)
- **Official Source URL**: [https://archive.ics.uci.edu/ml/datasets/Student+Performance](https://archive.ics.uci.edu/ml/datasets/Student+Performance)
- **Purpose**: Benchmarking learning retention curves, study habit impact, hint request frequency modeling, and learning pace analytics.
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Citation**:
  ```bibtex
  @article{cortez2008using,
    title={Using data mining to predict secondary school student performance},
    author={Cortez, Paulo and Silva, Alice Maria Gon{\c{c}}alves},
    booktitle={EUROSIS-ETI},
    year={2008}
  }
  ```
- **Features Extracted**: `study_time`, `failures`, `absences`, `performance_grade`.
- **Preprocessing Performed**: Normalized study metrics to evaluate temporal practice intervals.
- **Date Accessed**: 2026-09-15
- **Important Note**: Used strictly as an educational learning behavior benchmark. It is NOT claimed to directly predict algorithm coding skill.

---

## 4. Primary Problem Corpus: LeetCodeDataset by newfacade

- **Dataset Name**: LeetCodeDataset
- **Official Publisher**: newfacade
- **Official Source URL**: [https://github.com/newfacade/LeetCodeDataset](https://github.com/newfacade/LeetCodeDataset) / [https://huggingface.co/datasets/newfacade/LeetCodeDataset](https://huggingface.co/datasets/newfacade/LeetCodeDataset)
- **Exact Commit/Version**: `2025.04` (v1.0.0 release)
- **License**: Apache License 2.0 (Open source for academic, research, and production use)
- **Dataset Purpose**: LeetCode problem corpus, coding problem research, benchmark evaluation, and problem difficulty metadata.
- **Fields Used**: `question_id`, `title`, `slug`, `question_content`, `difficulty`, `tags`, `starter_code`, `sample_test_cases`, `hidden_test_cases`, `constraints`, `examples`.
- **Fields Excluded**: Internal scraper session tokens, raw HTML comment noise.
- **Import Date**: 2026-09-15
- **Production Redistribution Status**: Verified & Permitted under Apache License 2.0 (Attribution notice preserved).
- **Notes**: Direct web scraping of `leetcode.com` is strictly prohibited in CodeBuddy. All problem metadata and test cases are legally integrated via this independently published open-source dataset.

