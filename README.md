# CodeBuddy — Don’t Code Alone 🚀
### AI-Powered Social Coding, Skill Assessment & Company Interview Platform

> **CodeBuddy** is an AI-powered collaborative coding platform designed to make practicing algorithms, preparing for interviews, and building DSA skills engaging, social, and intelligent.

---

## 1. Core Problem & Solution

### The Core Problem
Students and engineers practicing coding on traditional platforms often feel:
- **Lonely and isolated** while studying alone.
- **Confused** about what to practice next.
- **Unsure** whether their actual skill level matches their self-rating.
- **Frustrated by repeating the same coding mistakes** (off-by-one errors, boundary conditions, HashMap key lookups).
- **Anxious** about realistic technical interviews.

### The CodeBuddy Solution
CodeBuddy combines:
1. **Adaptive AI Skill Assessment & ML Classifier** to verify true coding level.
2. **Personalized Problem Recommendation Engine** based on topic weaknesses and mistake history.
3. **Interactive Code Editor & Compiler** with Judge0 integration for C++, JavaScript, and Python.
4. **AI Code Review Agent** providing time/space complexity analysis ($O(N)$, $O(N \log N)$), code quality scores, and improvement advice.
5. **Persistent Mistake Profile** notifying coders when repeating previous mistake patterns.
6. **Collaborative Study Rooms** with real-time Socket.IO presence, chat, shared scratchpad, and AI Study Buddy tutor.
7. **Competitive Coding Arenas** with live real-time Elo rating leaderboards.
8. **Company Mock Interview Simulator** featuring webcam/mic permissions, timer, anti-cheat detection, and comprehensive 6-metric report card.

---

## 2. Platform Architecture

```text
                               ┌────────────────────────────────────────┐
                               │           React 18 Frontend            │
                               │  Vite • Tailwind CSS • Framer Motion  │
                               │    Lucide Icons • Monaco Code Editor   │
                               └───────────────────┬────────────────────┘
                                                   │ HTTP REST / WebSockets
                               ┌───────────────────▼────────────────────┐
                               │         Node.js / Express Server       │
                               │ Socket.IO Server • JWT Auth Middleware │
                               └─────────┬───────────────────┬──────────┘
                                         │                   │
               ┌─────────────────────────┴────┐         ┌────┴──────────────────────────┐
               │    AI & ML Engine Layer      │         │   Code Execution & Data       │
               │ • Gemini LLM API Integration │         │ • Judge0 API / Sandbox Runner │
               │ • Random Forest Skill Model  │         │ • MongoDB / MongoMemoryServer │
               │ • Cosine Similarity Recs     │         │ • Persistent Mistake Profiles │
               └──────────────────────────────┘         └───────────────────────────────┘
```

---

## 3. Specialized AI Agents & ML Models

### 1. Skill Assessment Agent (Random Forest Model)
- Features analyzed: Accuracy %, solving speed, hints requested, easy/med/hard success rates.
- Uses an ensemble Random Forest decision tree model to compute **Verified Level** (`Beginner+`, `Intermediate+`, `Advanced`) and **Confidence Score**.

### 2. Recommendation Engine (Content-Based Cosine Similarity)
- Computes fit score:
  $$\text{Score} = \text{Difficulty Fit} + \text{Topic Weakness} + \text{Company Target Match} + \text{Cosine Sim Boost}$$

### 3. Code Review Agent
- Evaluates submitted source code for time & space complexity, edge case handling, and optimization suggestions.

### 4. Mistake Memory Agent
- Tracks persistent mistake patterns (`off-by-one boundary error`, `HashMap missing key check`) across sessions and triggers warning notifications.

### 5. Interview Agent
- Simulates realistic company technical interviews (Google, NVIDIA, Amazon, Microsoft) and provides scores across 6 criteria: *Problem Solving, Coding, Communication, Complexity, Edge Cases, Code Quality*.

### 6. Study Buddy Agent
- Acts as a friendly AI tutor inside study rooms and solo sessions to answer questions, explain complexity, and offer hints without spoiling answers.

---

## 4. Technology Stack

- **Frontend**: React 18, Vite, React Router DOM, Tailwind CSS, Framer Motion, Lucide React, `@monaco-editor/react`, `socket.io-client`.
- **Backend**: Node.js, Express.js, Socket.IO, Mongoose, JWT, bcryptjs, Axios, `@google/generative-ai`.
- **Database**: MongoDB (with automatic `MongoMemoryServer` fallback for 100% zero-configuration startup).
- **Code Execution**: Judge0 API integration + sandboxed fallback runner for C++, JavaScript, Python.

---

## 5. Quick Start & Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm

### How to Run

> **Note**: Open **two separate terminal windows** (or tabs) from the `d:\Documents\sop` root folder.

**Terminal 1 (Backend Server)**:
```bash
cd server
npm start
```

**Terminal 2 (Frontend Client)**:
```bash
cd client
npm run dev
```

Open `http://localhost:3000` in your browser.

4. **Run Backend Test Suite**:
   ```bash
   cd server
   npm test
   ```

---

## 6. Environment Variables (`.env.example`)

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/codebuddy
JWT_SECRET=codebuddy_super_secret_jwt_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=your_judge0_api_key_here
```

---

## 7. Complete User Flow

```text
Landing Page ➔ Auth (Email/Google/GitHub) ➔ Adaptive Skill Assessment ➔ AI Verified Level
    ↓
Dashboard (Streak • Progress Bars • Today's AI Challenge • Mistake Insights)
    ↓
Problems Explorer (Level Mode & Explore All) ➔ Monaco Code Editor
    ↓
Run Sample Tests ➔ Submit Hidden Tests ➔ AI Complexity Analysis ➔ Understanding Q&A Check
    ↓
Collaborative Study Rooms (Socket.IO) • Competitive Arena • Company Interview Simulator
```

---

## License & Tagline

**CodeBuddy — Don’t Code Alone.**
