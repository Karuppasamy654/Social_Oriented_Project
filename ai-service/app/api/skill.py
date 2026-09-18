import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List

router = APIRouter(prefix="/ml/skill", tags=["ML Skill Classifier"])

class SkillPredictionRequest(BaseModel):
    accuracy: float = Field(default=0.5, ge=0.0, le=1.0)
    solve_speed: float = Field(default=1.0, ge=0.0, le=2.0)
    diff_success: float = Field(default=0.5, ge=0.0, le=1.0)
    accepted_rate: float = Field(default=0.5, ge=0.0, le=1.0)
    attempt_count: float = Field(default=2.0, ge=1.0, le=10.0)
    hint_ratio: float = Field(default=0.2, ge=0.0, le=1.0)
    topic_mastery: float = Field(default=0.5, ge=0.0, le=1.0)
    edge_success: float = Field(default=0.5, ge=0.0, le=1.0)
    understanding_score: float = Field(default=0.5, ge=0.0, le=1.0)

class SkillPredictionResponse(BaseModel):
    level: str
    confidence: float
    probabilities: Dict[str, float]
    features_used: List[str]
    model_version: str

@router.post("/predict", response_model=SkillPredictionResponse)
def predict_skill(req: SkillPredictionRequest):
    try:
        models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
        model_path = os.path.join(models_dir, 'skill_model.joblib')
        
        feature_names = ['accuracy', 'solve_speed', 'diff_success', 'accepted_rate', 'attempt_count', 'hint_ratio', 'topic_mastery', 'edge_success', 'understanding_score']
        classes = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

        loaded = False
        if os.path.exists(model_path):
            try:
                import joblib  # type: ignore
                import numpy as np  # type: ignore
                clf = joblib.load(model_path)
                features = [
                    req.accuracy,
                    req.solve_speed,
                    req.diff_success,
                    req.accepted_rate,
                    req.attempt_count / 10.0,
                    req.hint_ratio,
                    req.topic_mastery,
                    req.edge_success,
                    req.understanding_score
                ]
                X = np.array([features])
                probs = clf.predict_proba(X)[0]
                best_idx = int(np.argmax(probs))
                predicted_level = classes[best_idx]
                confidence = float(probs[best_idx])
                prob_dict = {classes[i]: float(round(probs[i], 4)) for i in range(len(classes))}
                loaded = True
            except Exception:
                loaded = False

        if not loaded:
            avg_score = (req.accuracy + req.diff_success + req.topic_mastery + req.understanding_score) / 4.0
            if avg_score >= 0.85:
                predicted_level = "Expert"
                confidence = 0.92
                prob_dict = {"Beginner": 0.01, "Intermediate": 0.02, "Advanced": 0.05, "Expert": 0.92}
            elif avg_score >= 0.65:
                predicted_level = "Advanced"
                confidence = 0.88
                prob_dict = {"Beginner": 0.02, "Intermediate": 0.05, "Advanced": 0.88, "Expert": 0.05}
            elif avg_score >= 0.4:
                predicted_level = "Intermediate"
                confidence = 0.85
                prob_dict = {"Beginner": 0.05, "Intermediate": 0.85, "Advanced": 0.08, "Expert": 0.02}
            else:
                predicted_level = "Beginner"
                confidence = 0.90
                prob_dict = {"Beginner": 0.90, "Intermediate": 0.08, "Advanced": 0.01, "Expert": 0.01}

        return SkillPredictionResponse(
            level=predicted_level,
            confidence=round(confidence, 4),
            probabilities=prob_dict,
            features_used=feature_names,
            model_version="v1.0.0"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill prediction error: {str(e)}")
