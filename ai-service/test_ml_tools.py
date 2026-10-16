import sys
sys.path.insert(0, 'd:/Documents/sop/ai-service')

results = {}

# ===== 1. IRT Engine =====
print('='*60)
print('TEST 1: IRT Engine')
print('='*60)
try:
    from app.ml.irt_engine import irt_engine, IRTEngine
    theta = 0.5
    new_theta, p_correct, error = irt_engine.update_ability(theta, 'Medium', True)
    info = irt_engine.calculate_information(theta, 0.0)
    se = irt_engine.calculate_standard_error(theta, [{'difficulty': 'Medium'}, {'difficulty': 'Easy'}])
    diff_b = irt_engine.difficulty_to_b('Hard')
    print(f'  update_ability(0.5, Medium, True): theta={new_theta}, p={p_correct}, err={error}')
    print(f'  calculate_information(0.5, 0.0): {info}')
    print(f'  calculate_standard_error: {se}')
    print(f'  difficulty_to_b(Hard): {diff_b}')
    results['IRT Engine'] = 'PASS'
except Exception as e:
    print(f'  ERROR: {e}')
    results['IRT Engine'] = f'FAIL: {e}'

# ===== 2. Mastery Model =====
print()
print('='*60)
print('TEST 2: TopicMasteryModel')
print('='*60)
try:
    from app.ml.mastery_model import TopicMasteryModel
    m = TopicMasteryModel({'Array': 0.40, 'Graph': 0.20})
    before = m.get_mastery('Array')
    new_val = m.update_mastery('Array', 'Medium', True, 0.5)
    after = m.get_mastery('Array')
    all_m = m.get_all_mastery()
    print(f'  Initial mastery[Array]: {before}')
    print(f'  After update (correct, Medium): {new_val}')
    print(f'  All mastery: {all_m}')
    results['Mastery Model'] = 'PASS'
except Exception as e:
    print(f'  ERROR: {e}')
    results['Mastery Model'] = f'FAIL: {e}'

# ===== 3. Native Models =====
print()
print('='*60)
print('TEST 3: Native Models (TF-IDF, NaiveBayes, SkillClassifier)')
print('='*60)
try:
    from app.ml.native_models import NativeTFIDF, NativeMultiLabelNaiveBayes, NativeSkillClassifier
    tfidf = NativeTFIDF()
    docs = ['binary search sorted array', 'graph traversal bfs dfs', 'dynamic programming knapsack']
    vecs = tfidf.fit_transform(docs)
    print(f'  NativeTFIDF.fit_transform: {len(vecs)} vectors, vocab_size={len(tfidf.vocabulary_)}')

    taxonomy = ['Array', 'Graph', 'Dynamic Programming', 'Binary Search']
    nb = NativeMultiLabelNaiveBayes(taxonomy)
    preds = nb.predict(vecs)
    print(f'  NaiveBayes.predict: {preds}')

    sc = NativeSkillClassifier()
    skill_feat = [[0.80, 0.70, 0.75, 8, 10, 1, 0.78, 0.9, 0.85]]
    proba = sc.predict_proba(skill_feat)
    prediction = sc.predict(skill_feat)
    print(f'  NativeSkillClassifier.predict_proba: {proba}')
    print(f'  NativeSkillClassifier.predict index: {prediction}')
    results['Native Models'] = 'PASS'
except Exception as e:
    print(f'  ERROR: {e}')
    results['Native Models'] = f'FAIL: {e}'

# ===== 4. Model Registry =====
print()
print('='*60)
print('TEST 4: Model Registry')
print('='*60)
try:
    from app.ml.model_registry import model_registry, registry
    patterns = model_registry.predict_pattern({'nested_loop_depth': 2, 'hashing': False, 'sorting': False, 'recursion': False})
    print(f'  predict_pattern (depth=2): {patterns}')
    patterns2 = model_registry.predict_pattern({'nested_loop_depth': 0, 'hashing': True, 'sorting': False, 'recursion': False})
    print(f'  predict_pattern (hashing=True): {patterns2}')
    candidates = [
        {'id': 'q1', 'evidence': True, 'question_type': 'complexity', 'difficulty': 'medium'},
        {'id': 'q2', 'evidence': False, 'question_type': 'mcq', 'difficulty': 'easy'}
    ]
    ranked = model_registry.rank_candidate_questions(candidates, {'skill': 'Intermediate'})
    scores = [r['ranking_score'] for r in ranked]
    print(f'  rank_candidate_questions scores: {scores}')
    print(f'  registry status: {model_registry.registry_status}')
    results['Model Registry'] = 'PASS'
except Exception as e:
    print(f'  ERROR: {e}')
    results['Model Registry'] = f'FAIL: {e}'

# ===== 5. Topic Classifier =====
print()
print('='*60)
print('TEST 5: Topic Classifier')
print('='*60)
try:
    from app.ml.topic_classifier import predict_topics_from_text, TOPIC_TAXONOMY
    detected, unknown, estimate = predict_topics_from_text(
        'I have experience with dynamic programming and graph traversal using bfs and dfs',
        user_selected_topics=['Graph'],
        self_reported_level='Intermediate'
    )
    detected_names = [t['name'] for t in detected[:5]]
    print(f'  Detected topics (top 5): {detected_names}')
    print(f'  Initial estimate: {estimate}')
    print(f'  Taxonomy size: {len(TOPIC_TAXONOMY)}')
    results['Topic Classifier'] = 'PASS'
except Exception as e:
    print(f'  ERROR: {e}')
    results['Topic Classifier'] = f'FAIL: {e}'

# ===== 6. Skill Classifier =====
print()
print('='*60)
print('TEST 6: Skill Classifier')
print('='*60)
try:
    from app.ml.skill_classifier import predict_skills_from_text, predict_final_skill_profile, SKILL_TAXONOMY
    skills = predict_skills_from_text('I know dynamic programming and binary search and debugging')
    print(f'  predict_skills_from_text: {skills}')
    feat_vec = [0.75, 0.70, 0.80, 7, 10, 1, 0.72, 0.88, 0.80]
    level, score, confidence, prob_dict = predict_final_skill_profile(feat_vec, 'Intermediate')
    print(f'  predict_final_skill_profile: level={level}, score={score}, conf={confidence}')
    print(f'  prob_dict: {prob_dict}')
    results['Skill Classifier'] = 'PASS'
except Exception as e:
    print(f'  ERROR: {e}')
    results['Skill Classifier'] = f'FAIL: {e}'

# ===== 7. Question Ranker =====
print()
print('='*60)
print('TEST 7: MLInformedQuestionRanker')
print('='*60)
try:
    from app.ml.question_ranker import question_ranker, MLInformedQuestionRanker
    detected_topics = [
        {'name': 'Dynamic Programming', 'probability': 0.85},
        {'name': 'Graph', 'probability': 0.75}
    ]
    topic_mastery = {'Dynamic Programming': 0.40, 'Graph': 0.30, 'Array': 0.60}
    candidates = [
        {'id': 'q1', 'topic': 'Dynamic Programming', 'difficulty': 'Medium', 'question_type': 'complexity'},
        {'id': 'q2', 'topic': 'Graph', 'difficulty': 'Hard', 'question_type': 'algorithm_selection'},
        {'id': 'q3', 'topic': 'Array', 'difficulty': 'Easy', 'question_type': 'mcq'},
    ]
    ranked = question_ranker.rank_questions(candidates, detected_topics, topic_mastery, 0.50, [])
    top_id = ranked[0]['question']['id']
    top_score = ranked[0]['utility_score']
    print(f'  rank_questions: top={top_id}, score={top_score}')
    selected = question_ranker.select_top_weighted_candidate(ranked, top_n=3)
    sel_id = selected['question']['id']
    sel_prob = selected.get('selection_prob')
    print(f'  select_top_weighted_candidate: id={sel_id}, sel_prob={sel_prob}')
    diff_probs = question_ranker.get_difficulty_probabilities(0.50)
    print(f'  get_difficulty_probabilities(0.5): {diff_probs}')
    results['Question Ranker'] = 'PASS'
except Exception as e:
    print(f'  ERROR: {e}')
    results['Question Ranker'] = f'FAIL: {e}'

# ===== 8. Trained Model .joblib Files =====
print()
print('='*60)
print('TEST 8: Trained Model .joblib Files')
print('='*60)
import os, joblib
model_dir = 'd:/Documents/sop/ai-service/trained_models'
for fname in ['feature_vectorizer.joblib', 'topic_classifier.joblib', 'skill_classifier.joblib', 'answer_classifier.joblib']:
    fpath = os.path.join(model_dir, fname)
    fsize = os.path.getsize(fpath)
    try:
        obj = joblib.load(fpath)
        print(f'  {fname}: loaded OK (size={fsize}B, type={type(obj).__name__})')
        results[fname] = 'PASS'
    except Exception as e:
        print(f'  {fname}: FAIL ({e}) (size={fsize}B)')
        results[fname] = f'FAIL: {e}'

# ===== 9. Code Intelligence =====
print()
print('='*60)
print('TEST 9: Code Intelligence (Code Similarity)')
print('='*60)
try:
    sys.path.insert(0, 'd:/Documents/sop/ai-service')
    from app.code_intelligence.code_similarity import compute_code_similarity
    code_a = "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target-n], i]\n        seen[n] = i"
    code_b = "def find_pair(arr, t):\n    d = {}\n    for idx, val in enumerate(arr):\n        if t - val in d:\n            return [d[t-val], idx]\n        d[val] = idx"
    sim = compute_code_similarity(code_a, code_b)
    print(f'  compute_code_similarity result: {sim}')
    results['Code Similarity'] = 'PASS'
except Exception as e:
    print(f'  ERROR: {e}')
    results['Code Similarity'] = f'FAIL: {e}'

# ===== FINAL SUMMARY =====
print()
print('='*60)
print('FINAL SUMMARY')
print('='*60)
passed = 0
failed = 0
for k, v in results.items():
    if v == 'PASS':
        status = '[PASS]'
        passed += 1
    else:
        status = f'[FAIL]'
        failed += 1
    print(f'  {status}  {k}: {v}')
print()
print(f'  Total: {passed} passed, {failed} failed out of {len(results)} tools')
