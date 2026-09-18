# Interview ML & Retrieval Evaluation Report

**Generated Date:** 2026-09-17T21:00:58.150565

## Task & Architecture
- **Task:** Multi-feature ranking & semantic retrieval for candidate company questions.
- **Features Used:** `company_match`, `role_match`, `level_fit`, `weakness_relevance`, `difficulty_fit`, `source_confidence`, `repetition_penalty`.

## Benchmark Performance Metrics
- **Recall@5:** 0.95
- **Recall@10:** 1.0
- **Mean Reciprocal Rank (MRR):** 0.916
- **NDCG@10:** 0.942

## Validation & Leakage Controls
- **Data Split:** No overlapping report sources between evaluation queries and candidate pools.
- **Deterministic Fallback:** Active when ML inference service is unavailable.
