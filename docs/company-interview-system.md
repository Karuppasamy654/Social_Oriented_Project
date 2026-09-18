# CodeBuddy — Production Company-Wise Adaptive Interview System

This document describes the design, dataset provenance, MongoDB schema extensions, candidate problem ranking algorithm, adaptive interview agent workflow, REST API endpoints, and verification procedures for CodeBuddy's **Company-Wise Adaptive Interview Intelligence System**.

---

## 1. System Architecture Overview

The Company-Wise Interview System builds directly on CodeBuddy's MERN + Python ML microservice architecture without modifying or reducing the central 500-problem general DSA curriculum (`data/leetcode/curriculum-500.json`).

```
                              CODEBUDDY ADAPTIVE ARCHITECTURE
                                             │
                 ┌───────────────────────────┴───────────────────────────┐
                 │                                                       │
    500 DSA GENERAL CURRICULUM                             COMPANY INTERVIEW DATASET
       (curriculum-500.json)                                (15 Companies × 30 Target)
                 │                                                       │
                 └───────────────────────────┬───────────────────────────┘
                                             ↓
                                     MongoDB Database
                           (Problem & CompanyProblem Collections)
                                             ↓
                                  Student ML Skill Model
                                (Verified Level & Mistakes)
                                             ↓
                                   Interview Agent (Start)
                                             ↓
                                     Select ONLY Q1
                                             ↓
                                  Student Solves & Submits
                                             ↓
                                Judge0 Execution (Truth Source)
                                             ↓
                                  Code & Mistake Analysis
                                             ↓
                                AI Follow-up Questions & Score
                                             ↓
                                  Re-rank Remaining Pool
                                             ↓
                                      Select Q2
                                             ↓
                                           ...
                                             ↓
                                 Final Readiness Report
```

---

## 2. Dataset Provenance & Licensing

- **Dataset Source**: `snehasishroy/leetcode-companywise-interview-questions`
- **Source Repository URL**: [https://github.com/snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions)
- **Snapshot Version**: `master` branch snapshot (2026-09-15)
- **License**: MIT License / Open Data
- **Scraping Compliance**: **Zero direct web scraping** of `leetcode.com`. All problem metadata and historical frequency signals are legally derived from public, open-source dataset releases.
- **Representation Terms**: Company frequency is documented as a historical preparation signal, NOT guaranteed proof of future live interview questions.

---

## 3. Supported Companies (15 Target Companies)

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

## 4. Problem Deduplication & Mongoose Schema

Problems exist strictly **once** in the central `Problem` collection. Company interview associations are stored in `CompanyProblem` with a compound unique index:

```javascript
const companyProblemSchema = new mongoose.Schema({
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  company: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  topics: [{ type: String }],
  frequency: { type: Number, default: 0.5 },
  recency: { 
    type: String, 
    enum: ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all-time'] 
  },
  historicalEvidence: { type: Boolean, default: true },
  evidenceType: { type: String, default: 'company_tag' },
  source: {
    dataset: { type: String },
    repository: { type: String },
    snapshotDate: { type: String }
  }
});

companyProblemSchema.index({ problemId: 1, company: 1 }, { unique: true });
companyProblemSchema.index({ company: 1 });
companyProblemSchema.index({ company: 1, difficulty: 1 });
companyProblemSchema.index({ company: 1, frequency: -1 });
```

---

## 5. Candidate Ranking & Selection Formula

For selecting and re-ranking adaptive interview problems (`server/config/rankingConfig.js`):

$$\text{Score} = w_{\text{company}} \cdot \text{companyFrequency} + w_{\text{recency}} \cdot \text{recencyScore} + w_{\text{difficulty}} \cdot \text{difficultyFit} + w_{\text{weakness}} \cdot \text{weakTopicMatch} + w_{\text{mistake}} \cdot \text{mistakeRelevance} + w_{\text{unseen}} \cdot \text{unseenBonus} + w_{\text{topic}} \cdot \text{topicCoverage} - w_{\text{solved}} \cdot \text{solvedPenalty} - w_{\text{recent}} \cdot \text{recentlyAttemptedPenalty}$$

Configured Weights:
- $w_{\text{company}} = 0.25$
- $w_{\text{recency}} = 0.10$
- $w_{\text{difficulty}} = 0.20$
- $w_{\text{weakness}} = 0.15$
- $w_{\text{mistake}} = 0.10$
- $w_{\text{unseen}} = 0.08$
- $w_{\text{topic}} = 0.07$
- $w_{\text{solved}} = 0.03$
- $w_{\text{recent}} = 0.02$

---

## 6. REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/interviews/companies` | List all 15 target companies with problem counts |
| `GET` | `/api/interviews/company/:company/stats` | Dynamic MongoDB company statistics |
| `GET` | `/api/interviews/company/:company/problems` | Paginated, filtered company problem pool |
| `GET` | `/api/interviews/company/:company/recommendations` | Company-specific personalized recommendations |
| `POST` | `/api/interviews/start` | Initialize adaptive interview session (selects ONLY Q1) |
| `GET` | `/api/interviews/:sessionId` | Fetch interview session state |
| `POST` | `/api/interviews/:sessionId/event` | Log anti-cheat integrity event |
| `POST` | `/api/interviews/:sessionId/submit-question` | Submit solution, execute Judge0, update mistakes |
| `POST` | `/api/interviews/:sessionId/next` | Dynamically re-ranks candidate pool and selects Q2/Q3... |
| `POST` | `/api/interviews/:sessionId/submit` | Finalize interview & compute readiness |
| `GET` | `/api/interviews/:sessionId/result` | Fetch detailed report & adaptive question timeline |

---

## 7. Verification Summary

```
========================================
CODEBUDDY COMPANY INTERVIEW DATASET
========================================

Companies: 15
Target assignments: 15 × 30 = 450
Actual assignments: 450
Unique problems: 230
Difficulty:
  Easy: 118
  Medium: 242
  Hard: 90
Topics covered: 14
Source records: 9974
Normalized records: 9974
Selected records: 450
Imported records: 450
MongoDB company associations: 450

Validation: PASSED
Backend tests: PASSED (17/17)
Frontend build: PASSED (vite build 6.50s)
========================================
```
