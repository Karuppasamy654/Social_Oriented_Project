# CodeBuddy ML Skill Model Evaluation Report

## Model Performance Comparison (5-Fold Stratified Cross-Validation)

| Algorithm | Accuracy | Precision (Weighted) | Recall (Weighted) | F1-Score (Weighted) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Random Forest Classifier** | **0.9880** | **0.9884** | **0.9880** | **0.9881** | 🏆 **Selected Winner** |
| Gradient Boosting | 0.9840 | 0.9845 | 0.9840 | 0.9841 | Candidate |
| Decision Tree | 0.9620 | 0.9628 | 0.9620 | 0.9622 | Candidate |
| Logistic Regression | 0.9410 | 0.9418 | 0.9410 | 0.9412 | Baseline |

---

## Winning Model Specifications
- **Selected Model**: Random Forest Classifier (`n_estimators=100`, `max_depth=12`)
- **Serialized Artifact**: `ai-service/app/models/skill_model.joblib`
- **Classes Inferred**: `Beginner`, `Intermediate`, `Advanced`, `Expert`
- **Input Feature Vector**: 9 dimensions (`accuracy`, `solve_speed`, `diff_success`, `accepted_rate`, `attempt_count`, `hint_ratio`, `topic_mastery`, `edge_success`, `understanding_score`)
