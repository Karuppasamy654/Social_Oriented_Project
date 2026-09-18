from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "CodeBuddy Python AI/ML Microservice"
    assert data["status"] == "healthy"

def test_skill_predict_endpoint():
    payload = {
        "accuracy": 0.85,
        "solve_speed": 1.2,
        "diff_success": 0.8,
        "accepted_rate": 0.85,
        "attempt_count": 2.0,
        "hint_ratio": 0.1,
        "topic_mastery": 0.8,
        "edge_success": 0.85,
        "understanding_score": 0.9
    }
    response = client.post("/ml/skill/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "level" in data
    assert "confidence" in data
    assert data["level"] in ["Beginner", "Intermediate", "Advanced", "Expert"]

def test_recommendation_endpoint():
    payload = {
        "user_profile": {
            "user_level": "Intermediate",
            "weak_topics": ["HashMap"],
            "mistake_topics": [],
            "solved_problem_ids": [],
            "target_company": "Google"
        },
        "candidates": [
            {
                "id": "p1",
                "title": "Two Sum",
                "difficulty": "Easy",
                "category": "HashMap",
                "tags": ["Array", "HashMap"],
                "company_tags": ["Google", "Amazon"]
            }
        ],
        "top_n": 5
    }
    response = client.post("/ml/recommend", json=payload)
    assert response.status_code == 200
    recs = response.json()
    assert len(recs) == 1
    assert recs[0]["problem_id"] == "p1"

def test_analyze_code_endpoint():
    payload = {
        "code": "def solve(n):\n    for i in range(n):\n        for j in range(n):\n            print(i, j)",
        "language": "python"
    }
    response = client.post("/ml/analyze-code", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["estimated_time_complexity"] == "O(N^2)"
    assert data["loop_count"] == 2
