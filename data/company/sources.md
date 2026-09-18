# CodeBuddy Company-Wise Interview Dataset Provenance

This document records the official source, citations, licensing terms, and metadata definitions for the company-wise interview problem intelligence dataset integrated into CodeBuddy.

---

## Dataset Overview

- **Dataset Name**: LeetCode Company-Wise Interview Questions Dataset
- **Primary Source Repository**: `snehasishroy/leetcode-companywise-interview-questions`
- **Primary Source URL**: [https://github.com/snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions)
- **Secondary Reference Source**: [https://github.com/liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems)
- **Snapshot Date**: 2026-09-15
- **License**: MIT License / Open Data
- **Redistribution & Use**: Permitted under MIT License for educational, analytical, and production software integration with proper attribution.

---

## Time-Period Buckets & Frequency Signals

The raw dataset aggregates community-reported company interview occurrences into standard recency windows:

1. `thirty-days`: Questions reported in company interviews within the past 30 days.
2. `three-months`: Questions reported within 3 months.
3. `six-months`: Questions reported within 6 months.
4. `more-than-six-months`: Questions reported beyond 6 months.
5. `all-time`: Historical compilation across all recorded timeframes.

---

## Company Scope (15 Target Companies)

The integrated pipeline normalizes and targets 15 premier technology and financial institutions:

1. **Amazon** (`amazon`)
2. **Microsoft** (`microsoft`)
3. **Google** (`google`)
4. **Meta** (`meta`)
5. **Apple** (`apple`)
6. **Adobe** (`adobe`)
7. **NVIDIA** (`nvidia`)
8. **Cisco** (`cisco`)
9. **JPMorgan** (`jpmorgan`)
10. **Goldman Sachs** (`goldman-sachs`)
11. **Walmart** (`walmart-labs`)
12. **Uber** (`uber`)
13. **Atlassian** (`atlassian`)
14. **Bloomberg** (`bloomberg`)
15. **Flipkart** (`flipkart`)

---

## Schema Fields & Metadata Mapping

Each normalized record conforms to the following strict schema:

- `problemId`: Standard problem ID matching central `Problem` collection (e.g., `"1"`).
- `title`: Original problem title (e.g., `"Two Sum"`).
- `slug`: URL slug (e.g., `"two-sum"`).
- `difficulty`: Validated difficulty level (`"Easy"`, `"Medium"`, `"Hard"`).
- `topics`: Array of standard DSA topic tags (e.g., `["Array", "Hash Table"]`).
- `company`: Normalized company name (e.g., `"Amazon"`).
- `frequency`: Floating-point frequency score normalized between `0.0` and `1.0`.
- `recency`: Recency bucket identifier (`"thirty-days"`, `"three-months"`, `"six-months"`, `"more-than-six-months"`, `"all-time"`).
- `historicalEvidence`: Boolean flag (`true` indicates verified historical presence in dataset).
- `evidenceType`: Signal classification (`"company_tag"`, `"community_report"`).
- `source`: Provenance tracking block containing dataset name, repository URL, snapshot date, and commit.
