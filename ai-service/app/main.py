import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.api.skill import router as skill_router
from app.api.recommendation import router as rec_router
from app.api.code_analysis import router as code_router
from app.api.mistake import router as mistake_router
from app.api.understanding import router as understanding_router
from app.api.interview import router as interview_router
from app.api.analytics import router as analytics_router
from app.agents.study_buddy_agent import generate_study_buddy_response

from app.api.onboarding import router as onboarding_router

app = FastAPI(
    title="CodeBuddy AI/ML Microservice",
    description="Production Python service for scikit-learn model inference, feature engineering, and Gemini AI Agent orchestration.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(onboarding_router)
app.include_router(skill_router)
app.include_router(rec_router)
app.include_router(code_router)
app.include_router(mistake_router)
app.include_router(understanding_router)
app.include_router(interview_router)
app.include_router(analytics_router)

@app.get("/")
def read_root():
    return {
        "service": "CodeBuddy Python AI/ML Microservice",
        "status": "healthy",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.post("/ai/study-buddy")
def study_buddy_endpoint(payload: dict):
    user_prompt = payload.get("userPrompt", "")
    problem_title = payload.get("currentProblemTitle", "")
    user_code = payload.get("userCode", "")
    page_context = payload.get("pageContext", "global")
    hint_level = payload.get("hintLevel", 1)
    
    reply = generate_study_buddy_response(
        user_prompt=user_prompt,
        problem_title=problem_title,
        user_code=user_code,
        page_context=page_context,
        hint_level=hint_level
    )
    return {"response": reply}
