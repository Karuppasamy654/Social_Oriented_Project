import os
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import cross_validate, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix

def generate_bootstrapped_dataset(n_samples=1200, seed=42):
    np.random.seed(seed)
    
    # 4 classes: 0: Beginner, 1: Intermediate, 2: Advanced, 3: Expert
    labels = np.random.choice([0, 1, 2, 3], size=n_samples, p=[0.3, 0.35, 0.25, 0.1])
    
    data = []
    for label in labels:
        if label == 0: # Beginner
            acc = np.random.uniform(0.2, 0.55)
            speed = np.random.uniform(0.2, 0.7)
            diff_succ = np.random.uniform(0.0, 0.3)
            accepted_rate = np.random.uniform(0.2, 0.5)
            attempt_count = np.random.uniform(4.0, 9.0) / 10.0
            hint_ratio = np.random.uniform(0.4, 0.9)
            topic_m = np.random.uniform(0.1, 0.4)
            edge_succ = np.random.uniform(0.2, 0.5)
            und_score = np.random.uniform(0.3, 0.6)
        elif label == 1: # Intermediate
            acc = np.random.uniform(0.55, 0.75)
            speed = np.random.uniform(0.6, 1.1)
            diff_succ = np.random.uniform(0.3, 0.65)
            accepted_rate = np.random.uniform(0.5, 0.75)
            attempt_count = np.random.uniform(2.0, 5.0) / 10.0
            hint_ratio = np.random.uniform(0.2, 0.5)
            topic_m = np.random.uniform(0.4, 0.7)
            edge_succ = np.random.uniform(0.5, 0.75)
            und_score = np.random.uniform(0.6, 0.8)
        elif label == 2: # Advanced
            acc = np.random.uniform(0.75, 0.9)
            speed = np.random.uniform(1.0, 1.6)
            diff_succ = np.random.uniform(0.65, 0.85)
            accepted_rate = np.random.uniform(0.75, 0.9)
            attempt_count = np.random.uniform(1.0, 3.0) / 10.0
            hint_ratio = np.random.uniform(0.05, 0.25)
            topic_m = np.random.uniform(0.7, 0.9)
            edge_succ = np.random.uniform(0.75, 0.92)
            und_score = np.random.uniform(0.75, 0.92)
        else: # Expert
            acc = np.random.uniform(0.88, 1.0)
            speed = np.random.uniform(1.4, 2.0)
            diff_succ = np.random.uniform(0.85, 1.0)
            accepted_rate = np.random.uniform(0.88, 1.0)
            attempt_count = np.random.uniform(1.0, 2.0) / 10.0
            hint_ratio = np.random.uniform(0.0, 0.1)
            topic_m = np.random.uniform(0.88, 1.0)
            edge_succ = np.random.uniform(0.9, 1.0)
            und_score = np.random.uniform(0.88, 1.0)
            
        data.append([acc, speed, diff_succ, accepted_rate, attempt_count, hint_ratio, topic_m, edge_succ, und_score])
        
    cols = ['accuracy', 'solve_speed', 'diff_success', 'accepted_rate', 'attempt_count', 'hint_ratio', 'topic_mastery', 'edge_success', 'understanding_score']
    df = pd.DataFrame(data, columns=cols)
    df['target'] = labels
    return df

def train_and_evaluate_models():
    print("==================================================")
    print("⚡ CODEBUDDY ML SKILL CLASSIFIER MODEL EVALUATION ⚡")
    print("==================================================")
    
    df = generate_bootstrapped_dataset(n_samples=1500)
    X = df.drop(columns=['target'])
    y = df['target']
    
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000),
        'Decision Tree': DecisionTreeClassifier(max_depth=8, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, random_state=42)
    }
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = ['accuracy', 'precision_weighted', 'recall_weighted', 'f1_weighted']
    
    results = {}
    best_model_name = None
    best_f1 = 0.0
    best_model_obj = None
    
    for name, clf in models.items():
        cv_res = cross_validate(clf, X, y, cv=cv, scoring=scoring)
        acc = float(np.mean(cv_res['test_accuracy']))
        prec = float(np.mean(cv_res['test_precision_weighted']))
        rec = float(np.mean(cv_res['test_recall_weighted']))
        f1 = float(np.mean(cv_res['test_f1_weighted']))
        
        results[name] = {
            'Accuracy': round(acc, 4),
            'Precision': round(prec, 4),
            'Recall': round(rec, 4),
            'F1-Score': round(f1, 4)
        }
        print(f"\n📊 {name}: Accuracy={acc:.4f} | Precision={prec:.4f} | Recall={rec:.4f} | F1-Score={f1:.4f}")
        
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model_obj = clf

    print("\n--------------------------------------------------")
    print(f"🏆 Winning Model Selected: {best_model_name} (F1 = {best_f1:.4f})")
    print("--------------------------------------------------")

    # Train final best model on entire dataset
    best_model_obj.fit(X, y)
    
    # Save model binary
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'app', 'models')
    os.makedirs(models_dir, exist_ok=True)
    model_file = os.path.join(models_dir, 'skill_model.joblib')
    joblib.dump(best_model_obj, model_file)
    print(f"✅ Saved trained ML model binary to: {model_file}")

    # Save model metadata
    metadata = {
        'model_name': best_model_name,
        'version': 'v1.0.0',
        'classes': ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        'metrics': results,
        'features': list(X.columns)
    }
    meta_file = os.path.join(models_dir, 'skill_model_metadata.json')
    with open(meta_file, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✅ Saved model metadata JSON to: {meta_file}")

if __name__ == '__main__':
    train_and_evaluate_models()
