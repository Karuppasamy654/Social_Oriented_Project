import os
import sys
import json
from train_topic_models import train_and_evaluate_topic_models, TOPIC_TAXONOMY
from train_skill_models import train_and_evaluate_skill_models, SKILL_CLASSES
from train_answer_models import train_and_evaluate_answer_models

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_DIR = os.path.dirname(BASE_DIR)
TRAINED_MODELS_DIR = os.path.join(SERVICE_DIR, 'trained_models')
REPORTS_DIR = os.path.join(SERVICE_DIR, 'reports')

os.makedirs(TRAINED_MODELS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

def run_full_evaluation():
    print("==========================================================")
    print("CODEBUDDY PRODUCTION ML TRAINING & EVALUATION PIPELINE")
    print("==========================================================\n")

    topic_results, winning_topic_model, _, _ = train_and_evaluate_topic_models()
    skill_results, winning_skill_model, _ = train_and_evaluate_skill_models()
    answer_results, winning_answer_model, _ = train_and_evaluate_answer_models()

    metadata = {
        'version': 'v3.0.0',
        'winning_models': {
            'topic_classification': winning_topic_model,
            'skill_classification': winning_skill_model,
            'answer_classification': winning_answer_model
        },
        'topic_taxonomy': TOPIC_TAXONOMY,
        'skill_classes': SKILL_CLASSES,
        'eval_metrics': {
            'topic_classifier': topic_results,
            'skill_classifier': skill_results,
            'answer_classifier': answer_results
        }
    }

    # Save model metadata JSON
    meta_json_path = os.path.join(TRAINED_MODELS_DIR, 'model_metadata.json')
    with open(meta_json_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    report_json_path = os.path.join(REPORTS_DIR, 'model_comparison.json')
    with open(report_json_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    # Generate Markdown Comparison Report
    md_content = f"""# CodeBuddy ML Model Comparison & Evaluation Report

- **Report Version**: `v3.0.0`
- **Evaluation Methodology**: 5-Fold Stratified K-Fold Cross-Validation / 3-Fold K-Fold Cross-Validation
- **Provenances**: IBM Project CodeNet, CodeSearchNet, UCI Student Performance, CodeBuddy 500-Problem Curriculum Taxonomy

---

## 1. Multi-Label Topic Classifier Comparison

| Algorithm | Accuracy | Micro F1 | Macro F1 | Hamming Loss | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
"""
    for alg, metrics in topic_results.items():
        status = "**Selected**" if alg == winning_topic_model else "Evaluated"
        md_content += f"| {alg} | {metrics['Accuracy']} | {metrics['Micro F1']} | {metrics['Macro F1']} | {metrics['Hamming Loss']} | {status} |\n"

    md_content += f"""
---

## 2. Skill Level Classifier Comparison

| Algorithm | Accuracy | Precision | Recall | F1-Score | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
"""
    for alg, metrics in skill_results.items():
        status = "**Selected**" if alg == winning_skill_model else "Evaluated"
        md_content += f"| {alg} | {metrics['Accuracy']} | {metrics['Precision']} | {metrics['Recall']} | {metrics['F1-Score']} | {status} |\n"

    md_content += f"""
---

## 3. Answer Performance Classifier Comparison

| Algorithm | Accuracy | Precision | Recall | F1-Score | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
"""
    for alg, metrics in answer_results.items():
        status = "**Selected**" if alg == winning_answer_model else "Evaluated"
        md_content += f"| {alg} | {metrics['Accuracy']} | {metrics['Precision']} | {metrics['Recall']} | {metrics['F1-Score']} | {status} |\n"

    md_content += f"""
---

## 4. Production Deployment Artifacts Summary
- **Topic Classifier Artifact**: `{winning_topic_model}` -> `trained_models/topic_classifier.joblib`
- **Skill Classifier Artifact**: `{winning_skill_model}` -> `trained_models/skill_classifier.joblib`
- **Answer Classifier Artifact**: `{winning_answer_model}` -> `trained_models/answer_classifier.joblib`
- **TF-IDF Feature Vectorizer**: `TfidfVectorizer` -> `trained_models/feature_vectorizer.joblib`
- **Model Metadata**: `trained_models/model_metadata.json`
"""

    md_report_path = os.path.join(REPORTS_DIR, 'model_comparison.md')
    with open(md_report_path, 'w', encoding='utf-8') as f:
        f.write(md_content)

    print(f"[OK] Saved model metadata JSON to: {meta_json_path}")
    print(f"[OK] Saved model comparison JSON to: {report_json_path}")
    print(f"[OK] Saved model comparison Markdown report to: {md_report_path}\n")

if __name__ == '__main__':
    run_full_evaluation()
