# CodeBuddy ML Pipeline & Model Training Specification

## 1. Feature Engineering Vector

The skill classification pipeline processes a 9-dimensional normalized feature vector:

$$\mathbf{x} = [\text{accuracy}, \text{solve\_speed}, \text{diff\_success}, \text{accepted\_rate}, \text{attempt\_count}, \text{hint\_ratio}, \text{topic\_mastery}, \text{edge\_success}, \text{understanding\_score}]$$

### Feature Definitions:
1. `accuracy`: Percentage of overall accepted submissions $[0.0, 1.0]$.
2. `solve_speed`: Normalized solve time relative to expected median time for problem difficulty $[0.0, 2.0]$.
3. `diff_success`: Ratio of Medium/Hard problem success vs Easy $[0.0, 1.0]$.
4. `accepted_rate`: Ratio of first-try accepted submissions $[0.0, 1.0]$.
5. `attempt_count`: Average submission attempts before acceptance $[1.0, 10.0]$.
6. `hint_ratio`: Hints requested per problem $[0.0, 1.0]$.
7. `topic_mastery`: Weighted topic coverage index $[0.0, 1.0]$.
8. `edge_success`: Ratio of hidden edge test cases passed $[0.0, 1.0]$.
9. `understanding_score`: Post-submission comprehension score $[0.0, 1.0]$.

---

## 2. Supervised Model Training & Model Selection

The model training pipeline (`train_skill_model.py`) trains and compares four supervised learning algorithms using 5-fold cross-validation:

1. **Logistic Regression** (L2 regularization baseline)
2. **Decision Tree Classifier** (Max depth = 8)
3. **Random Forest Classifier** (n_estimators = 100, max_depth = 12, min_samples_split = 4)
4. **Gradient Boosting Classifier** (n_estimators = 100, learning_rate = 0.1)

### Evaluation Metrics Calculated:
- Accuracy
- Macro & Weighted Precision
- Macro & Weighted Recall
- Macro & Weighted F1-Score
- Confusion Matrix

The model with the highest cross-validation F1-Score is selected, serialized with `joblib`, and deployed to `ai-service/models/skill_model.joblib`.

---

## 3. Recommendation Engine Pipeline

The content-based recommendation engine calculates a match score for candidate problems:

$$\text{Score}(P) = w_1 \cdot \text{Sim}(\vec{U}, \vec{P}) + w_2 \cdot \text{TopicWeakness}(P) + w_3 \cdot \text{DiffFit}(P) + w_4 \cdot \text{MistakeWeight}(P)$$

- Uses **Cosine Similarity** between user target feature vector and problem characteristic vectors.
- Applies heavy weighting boost to topics where user has identified recurring mistakes or low understanding scores.
