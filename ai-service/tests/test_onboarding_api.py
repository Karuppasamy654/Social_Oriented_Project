from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_experience_endpoint():
    payload = {
        "experienceText": "I know arrays and strings.",
        "selfReportedLevel": "Beginner",
        "externalPlatformId": "@user1",
        "selectedTopics": ["Array", "String"]
    }
    response = client.post("/api/ai/onboarding/analyze-experience", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "topics" in data
    assert "unknownTopics" in data
    assert "initialSkill" in data
    assert "recommendedAssessmentLength" in data
    assert data["recommendedAssessmentLength"] == 12

def test_assessment_flow_endpoint():
    # 1. Start assessment
    start_payload = {
        "userId": "test_api_user",
        "experienceText": "I know graphs and trees.",
        "selfReportedLevel": "Intermediate",
        "selectedTopics": ["Graph", "Tree"]
    }
    start_resp = client.post("/api/ai/onboarding/assessment/start", json=start_payload)
    assert start_resp.status_code == 200
    start_data = start_resp.json()

    session_id = start_data["sessionId"]
    q1 = start_data["currentQuestion"]
    assert q1 is not None

    # 2. Answer Question 1
    answer_payload = {
        "questionId": q1["id"],
        "userAnswer": q1["options"][0] if (q1.get("options") and len(q1["options"]) > 0) else q1.get("correctAnswer", "def solve(): pass")
    }
    answer_resp = client.post(f"/api/ai/onboarding/assessment/{session_id}/answer", json=answer_payload)
    assert answer_resp.status_code == 200
    answer_data = answer_resp.json()

    assert answer_data["currentQuestionIndex"] == 1
    assert answer_data["currentQuestion"] is not None
    assert answer_data["currentQuestion"]["id"] != q1["id"]

    # 3. Check Session Status
    status_resp = client.get(f"/api/ai/onboarding/assessment/{session_id}")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["sessionId"] == session_id
