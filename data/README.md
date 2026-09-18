# CodeBuddy Data Policy & Integrity Guidelines

## Core Principles

1. **No Synthetic Misrepresentation**: Synthetic data is strictly forbidden for ground-truth ML models. Real datasets (IBM Project CodeNet, CodeSearchNet, UCI Student Performance) serve as authoritative benchmarks.
2. **Provenance Preservation**: Every dataset used in CodeBuddy is documented in `sources.md` with official source URLs, citations, license terms, and preprocessing metadata.
3. **Data Distinction**:
   - **External Benchmark Datasets**: Used for proxy training and initial feature weight calibration.
   - **CodeBuddy Verified Data**: Real platform interaction outcomes (assessment results, submitted code execution metrics, post-submission understanding scores) stored persistently in MongoDB for continuous online calibration.
