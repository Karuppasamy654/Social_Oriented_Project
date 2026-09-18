from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_experience():
    response = client.post("/api/ai/onboarding/analyze-experience", json={
        "experienceText": "I know arrays and strings and solved around 60 coding problems."
    })
    assert response.status_code == 200
    data = response.json()
    assert "topics" in data
    assert any(t["name"] == "Array" for t in data["topics"])
    assert data["recommendedAssessmentLength"] == 12

def test_start_and_adapt_assessment():
    # 1. Start assessment
    start_res = client.post("/api/ai/onboarding/assessment/start", json={
        "userId": "user_test_123",
        "experienceText": "I know arrays and strings."
    })
    assert start_res.status_code == 200
    start_data = start_res.json()
    session_id = start_data["sessionId"]
    assert start_data["status"] == "IN_PROGRESS"
    assert start_data["totalQuestions"] == 12
    assert start_data["currentQuestion"] is not None

    # 2. Answer question 1
    q1_id = start_data["currentQuestion"]["id"]
    q1_ans = start_data["currentQuestion"]["correctAnswer"]
    
    ans_res = client.post(f"/api/ai/onboarding/assessment/{session_id}/answer", json={
        "questionId": q1_id,
        "userAnswer": q1_ans
    })
    assert ans_res.status_code == 200
    ans_data = ans_res.json()
    assert ans_data["currentQuestionIndex"] == 1
    assert ans_data["currentQuestion"]["id"] != q1_id
