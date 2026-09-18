# CodeBuddy — JavaScript Intelligence Audit Report

- **Date**: 2026-09-16
- **File**: `reports/javascript_intelligence_audit.md`

---

## Violating JavaScript Decision Logic Audit

This document records all instances where JavaScript code in the Node.js server (`server/`) or React client (`client/`) improperly performed ML decision-making tasks (topic detection, skill level estimation, question selection, level classification), violating the strict Python ML architecture rule.

---

## 1. Node.js Express Server (`server/routes/aiOnboarding.js`)

| Line Numbers | Current JS Logic | Architecture Violation | Replacement Python API Endpoint |
| :--- | :--- | :--- | :--- |
| **L97–L120** | `function extractTopicsFromText(text)` using `lower.includes('array')`, `lower.includes('string')` | Hardcoded keyword-matching topic detection | `POST /api/ai/onboarding/analyze-experience` |
| **L123–L131** | `function predictMlSkillLevelFromText(text)` returning `'Expert'` if text contains `'graph'` | Hardcoded skill level classifier in JS | `POST /api/ai/onboarding/analyze-experience` |
| **L82–L94** | `function selectDynamicQuestion(...)` calling `Math.floor(Math.random() * matched.length)` | Random un-adaptive question selection | `POST /api/ai/onboarding/assessment/start` & `/answer` |
| **L354–L363** | `if (accScore >= 75) verifiedLevel = 'Expert'` | Hardcoded score thresholding for student level classification | `POST /api/ai/onboarding/assessment/{session_id}/answer` |
| **L143–L155** | `function computeExperienceMatch()` producing hardcoded alignment scores `95`, `72` | Hardcoded confidence & match logic in Node | Python `onboarding.py` ML inference |

---

## 2. React Client (`client/src/pages/OnboardingPage.jsx`)

| Line Numbers | Current JS Logic | Architecture Violation | Replacement Python API Endpoint |
| :--- | :--- | :--- | :--- |
| **L81–L89** | `setAnalyzedProfile({ topics: selectedTopics.map(t => ({ confidence: 0.90 })) })` inside catch block | Client JS fabricating ML confidence scores | Forward error directly from Python microservice |
| **L134–L141** | `setFinalProfile({ verifiedLevel: selfReportedLevel, accuracyScore: 82 })` fallback | Client JS fabricating student skill metrics | Python `/assessment/{id}/answer` result |

---

## Remediation Plan
1. **Remove `extractTopicsFromText`**, **`predictMlSkillLevelFromText`**, and **`selectDynamicQuestion`** completely from `server/routes/aiOnboarding.js`.
2. Update Express routes to make HTTP `axios` requests strictly to `http://localhost:8000/api/ai/onboarding/*`.
3. Require Python FastAPI service to respond with all calculated levels, topic probabilities, adaptive next questions, and final skill profiles.
