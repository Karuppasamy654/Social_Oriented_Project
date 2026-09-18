import os
import sys
import json
import math
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_DIR = os.path.dirname(BASE_DIR)
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from training.train_topic_models import train_and_evaluate_topic_models, TOPIC_TAXONOMY
from training.train_skill_models import train_and_evaluate_skill_models, SKILL_CLASSES

TRAINED_MODELS_DIR = os.path.join(SERVICE_DIR, 'trained_models')
REPORTS_DIR = os.path.join(SERVICE_DIR, 'reports')

os.makedirs(TRAINED_MODELS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

def train_and_export_all():
    print("==========================================================")
    print("CODEBUDDY MULTI-MODEL ML TRAINING & COMPARISON PIPELINE")
    print("==========================================================")

    # 1. Train & Evaluate Multi-Label Topic Classifiers
    topic_results, winning_topic_model, vectorizer, topic_clf = train_and_evaluate_topic_models()

    # 2. Train & Evaluate Skill Level Classifiers
    skill_results, winning_skill_model, skill_clf = train_and_evaluate_skill_models()

    # 3. Export Overall Metadata JSON with Actual Validation Metrics
    metadata = {
        'version': 'v3.0.0',
        'winning_models': {
            'topic_classification': winning_topic_model,
            'skill_classification': winning_skill_model
        },
        'topic_taxonomy': TOPIC_TAXONOMY,
        'skill_classes': SKILL_CLASSES,
        'eval_metrics': {
            'topic_classifier': topic_results,
            'skill_classifier': skill_results
        }
    }

    meta_json_path = os.path.join(TRAINED_MODELS_DIR, 'model_metadata.json')
    with open(meta_json_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[OK] Saved overall model metadata JSON to: {meta_json_path}")

    report_json_path = os.path.join(REPORTS_DIR, 'model_comparison.json')
    with open(report_json_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[OK] Saved model comparison JSON report to: {report_json_path}")

    # 4. Generate Non-Fabricated Markdown Comparison Report
    md_content = f"""# CodeBuddy ML Model Comparison & Validation Report

- **Report Version**: `v3.0.0`
- **Validation Methodology**: 5-Fold Stratified Cross-Validation (`scikit-learn`)
- **Data Provenances**: IBM Project CodeNet, CodeSearchNet, CodeBuddy Curriculum Dataset

---

## 1. Multi-Label Topic Classifier Comparison (TF-IDF Text Features)

| Algorithm | Accuracy | Micro F1 | Macro F1 | Hamming Loss | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
"""
    for alg, metrics in topic_results.items():
        status = "**Selected**" if alg == winning_topic_model else "Evaluated"
        md_content += f"| {alg} | {metrics['Accuracy']} | {metrics['Micro F1']} | {metrics['Macro F1']} | {metrics['Hamming Loss']} | {status} |\n"

    md_content += f"""
---

## 2. Skill Level Classifier Comparison (Student Interaction Vectors)

| Algorithm | Accuracy | Precision | Recall | F1-Score | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
"""
    for alg, metrics in skill_results.items():
        status = "**Selected**" if alg == winning_skill_model else "Evaluated"
        md_content += f"| {alg} | {metrics['Accuracy']} | {metrics['Precision']} | {metrics['Recall']} | {metrics['F1-Score']} | {status} |\n"

    md_content += f"""
---

## 3. Winning Deployed Production Artifacts
- **Feature Vectorizer**: `TfidfVectorizer` $\\rightarrow$ `trained_models/feature_vectorizer.joblib`
- **Topic Classifier**: `{winning_topic_model}` $\\rightarrow$ `trained_models/topic_classifier.joblib`
- **Skill Classifier**: `{winning_skill_model}` $\\rightarrow$ `trained_models/skill_classifier.joblib`
- **Model Metadata Record**: `trained_models/model_metadata.json`
"""

    md_report_path = os.path.join(REPORTS_DIR, 'model_comparison.md')
    with open(md_report_path, 'w', encoding='utf-8') as f:
        f.write(md_content)
    print(f"[OK] Saved markdown comparison report to: {md_report_path}\n")

if __name__ == '__main__':
    train_and_export_all()
