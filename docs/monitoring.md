# CodeBuddy Observability & Monitoring Specification

## Health Check Endpoints

1. **Express Server**:
   - `GET /api/health` -> Returns `200 OK` with JSON status, stack summary, and timestamp.
2. **Python AI Microservice**:
   - `GET /` -> Returns `200 OK` with service name, status, and API version.

## Key Performance Indicators (KPIs) Logged
- **API Latency**: Express route processing duration.
- **ML Inference Latency**: Scikit-Learn prediction speed (target: < 50ms).
- **Judge0 Execution Latency**: Sandbox execution turnaround time.
- **AI Agent Fallback Rate**: Percentage of Gemini calls using structured local heuristics fallback.
