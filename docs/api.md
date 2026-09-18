# CodeBuddy — REST API Specification

This document details the REST API endpoints available in the CodeBuddy backend.

---

## 1. Authentication Endpoints (`/api/auth`)

- `POST /api/auth/register` — Register a new student user
- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET /api/auth/me` — Fetch current user profile and coding statistics

---

## 2. Problem Corpus Endpoints (`/api/problems`)

- `GET /api/problems/stats/overview` — Fetch dataset distribution summary (500 total, 200 Easy, 250 Med, 50 Hard)
- `GET /api/problems` — Fetch paginated/filtered list of general DSA problems (supports limit up to 500)
- `GET /api/problems/:slug` — Fetch problem details by slug

---

## 3. Company Interview Endpoints (`/api/interviews`)

- `GET /api/interviews/companies` — List 15 supported companies with assignment counts
- `GET /api/interviews/company/:company/stats` — Dynamic MongoDB statistics for target company
- `GET /api/interviews/company/:company/problems` — Filtered problem list for target company
- `GET /api/interviews/company/:company/recommendations` — Personalized company recommendation feed
- `POST /api/interviews/start` — Start adaptive interview session (selects ONLY Question 1)
- `GET /api/interviews/:sessionId` | Fetch interview session state
- `POST /api/interviews/:sessionId/event` — Log anti-cheat integrity event
- `POST /api/interviews/:sessionId/submit-question` — Submit solution, execute Judge0, update mistakes
- `POST /api/interviews/:sessionId/next` — Dynamically re-rank candidate pool and select Question N+1
- `POST /api/interviews/:sessionId/submit` — Finalize interview session & compute overall readiness score
- `GET /api/interviews/:sessionId/result` — Fetch detailed interview readiness report & adaptive question timeline

---

## 4. Recommendation & Progress Endpoints (`/api/recommendations`)

- `GET /api/recommendations` — Fetch personalized problem recommendations using Cosine Similarity
- `GET /api/recommendations/progress` — Fetch dynamic roadmap progress and weekly activity
- `GET /api/recommendations/mistakes` — Fetch user mistake insights
