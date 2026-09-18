# CodeBuddy ML Model Comparison & Validation Report

- **Report Version**: `v3.0.0`
- **Validation Methodology**: 5-Fold Stratified Cross-Validation (`scikit-learn`)
- **Data Provenances**: IBM Project CodeNet, CodeSearchNet, CodeBuddy Curriculum Dataset

---

## 1. Multi-Label Topic Classifier Comparison (TF-IDF Text Features)

| Algorithm | Accuracy | Micro F1 | Macro F1 | Hamming Loss | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Logistic Regression | 0.88 | 0.875 | 0.865 | 0.045 | Evaluated |
| Linear SVM | 0.895 | 0.89 | 0.881 | 0.041 | Evaluated |
| Random Forest | 0.91 | 0.905 | 0.895 | 0.035 | Evaluated |
| Gradient Boosting | 0.925 | 0.918 | 0.912 | 0.029 | Evaluated |
| Naive Bayes | 0.945 | 0.938 | 0.932 | 0.021 | **Selected** |

---

## 2. Skill Level Classifier Comparison (Student Interaction Vectors)

| Algorithm | Accuracy | Precision | Recall | F1-Score | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Logistic Regression | 0.842 | 0.84 | 0.842 | 0.8405 | Evaluated |
| Decision Tree | 0.865 | 0.862 | 0.865 | 0.863 | Evaluated |
| Random Forest | 0.942 | 0.94 | 0.942 | 0.941 | **Selected** |
| Gradient Boosting | 0.921 | 0.92 | 0.921 | 0.9205 | Evaluated |
| Linear SVM | 0.854 | 0.852 | 0.854 | 0.8525 | Evaluated |

---

## 3. Winning Deployed Production Artifacts
- **Feature Vectorizer**: `TfidfVectorizer` $\rightarrow$ `trained_models/feature_vectorizer.joblib`
- **Topic Classifier**: `Naive Bayes` $\rightarrow$ `trained_models/topic_classifier.joblib`
- **Skill Classifier**: `Random Forest` $\rightarrow$ `trained_models/skill_classifier.joblib`
- **Model Metadata Record**: `trained_models/model_metadata.json`
