# CodeBuddy System Architecture Specification

## 1. High-Level Architecture Overview

CodeBuddy is a multi-tier platform combining a MERN application stack with a dedicated Python 3.11 FastAPI AI/ML Microservice, an external execution sandbox (Judge0), and persistent Google Gemini LLM agents.

```text
                               ┌────────────────────────────────────────┐
                               │           React 18 Frontend            │
                               │  Vite • Tailwind CSS • Framer Motion  │
                               │   Monaco Code Editor • Socket.IO Client│
                               └───────────────────┬────────────────────┘
                                                   │ HTTP REST / WebSockets
                               ┌───────────────────▼────────────────────┐
                               │         Node.js / Express Server       │
                               │ Socket.IO Server • JWT Auth Middleware │
                               │  Helmet • Rate Limit • Mongoose ORM    │
                               └─────────┬───────────────────┬──────────┘
                                         │                   │
               ┌─────────────────────────┴────┐         ┌────┴──────────────────────────┐
               │  Python AI/ML Microservice   │         │   Sandbox & Persistence       │
               │ • FastAPI • Scikit-Learn     │         │ • Judge0 Code Execution API   │
               │ • Trained Random Forest ML   │         │ • MongoDB / MongoMemoryServer │
               │ • Cosine Similarity Recs     │         │ • Persistent User Memory      │
               │ • Gemini Multi-Tool AI Agents│         │ • Socket.IO Real-time Engine  │
               └──────────────────────────────┘         └───────────────────────────────┘
```

---

## 2. Technology Rationale

### Why MERN Stack?
- **React 18 & Vite**: Provides ultra-fast rendering, dynamic state management, and smooth UI transitions essential for a real-time IDE and interactive dashboard.
- **Node.js & Express**: Event-driven asynchronous I/O ideal for handling WebSockets (Socket.IO), REST requests, and proxying requests to sandbox/AI microservices.
- **MongoDB**: Schema-flexible JSON document database matching rich user memory structures, code submissions, assessment attempts, and interactive room logs.

### Why Python FastAPI for AI/ML Microservice?
- **Scientific ML Ecosystem**: Python provides native access to `scikit-learn`, `numpy`, `pandas`, `joblib`, and `AST` static code parsers.
- **FastAPI**: Asynchronous high-performance web framework with automatic OpenAPI documentation and native Pydantic schema validation.

### Why Gemini API for AI Reasoning?
- **Multi-modal Reasoning & High Speed**: Delivers fast, low-latency reasoning for AI code reviews, 4-level progressive hints, post-submission understanding evaluation, and mock interview dialogue.

---

## 3. Communication Patterns

1. **Client to Express**: Authenticated REST requests via Axios + standard WebSockets via Socket.IO.
2. **Express to Python AI Microservice**: Internal REST calls (`http://localhost:8000/ml/...`) with secret header authentication and resilient fallback handling.
3. **Express to Judge0 Sandbox**: Code execution submissions over HTTPS with fallback to sandboxed local execution if offline.
4. **Python Microservice to Gemini API**: Structured JSON responses using official Google GenAI SDK.
