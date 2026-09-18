# CodeBuddy Production Deployment Guide

## 1. Deployment Architecture

```text
               ┌───────────────────────────────┐
               │    Vercel / Cloudflare CDN    │ (React 18 Frontend)
               └───────────────┬───────────────┘
                               │ HTTPS API
               ┌───────────────▼───────────────┐
               │    Render / Railway Node.js   │ (Express REST & Sockets)
               └───────┬───────────────┬───────┘
                       │               │
        ┌──────────────▼─┐           ┌─▼──────────────┐
        │ MongoDB Atlas  │           │ Python FastAPI │ (AI/ML Microservice)
        └────────────────┘           └────────────────┘
```

---

## 2. Docker Compose Quickstart

Run all services locally using Docker Compose:

```bash
docker-compose up --build
```

Services started:
- `client`: React 18 frontend on `http://localhost:3000`
- `server`: Node.js Express backend on `http://localhost:5000`
- `ai-service`: Python FastAPI microservice on `http://localhost:8000`
- `mongodb`: MongoDB database on `mongodb://localhost:27017/codebuddy`
