"""
Layer C — Adaptive Assessment Engine Orchestration
Coordinates multi-layer adaptive assessment workflow:
- Student State Management (ability theta, per-topic Bayesian mastery, mistake history, question history)
- IRT 1PL/2PL Rasch statistical ability updates
- Primary vs Exploration candidate pools
- Multi-factor question ranking & Softmax candidate selection
- Evidence-based adaptive stopping criteria (10-15 questions)
- Final multi-dimensional student skill profile generation
"""

import uuid
import math
from typing import List, Dict, Any, Optional
from app.data.question_bank_loader import load_assessment_question_bank
from app.ml.topic_classifier import predict_topics_from_text, TOPIC_TAXONOMY
from app.ml.skill_classifier import predict_skills_from_text, predict_final_skill_profile
from app.ml.mastery_model import TopicMasteryModel
from app.ml.irt_engine import irt_engine
from app.ml.question_ranker import question_ranker

QUESTION_BANK = load_assessment_question_bank()
active_sessions = {}

def build_candidate_pools(detected_topics: list, unknown_topics: list, all_questions: list, self_reported_level: str = 'Beginner'):
    primary_names = {t['name'] for t in detected_topics if t.get('name')}
    if not primary_names:
        primary_names = {'Array', 'String'}

    unknown_names = {t['name'] for t in unknown_topics if t.get('name') not in primary_names}

    # Only include human-readable assessment questions verified by quality audit
    eligible_questions = [q for q in all_questions if q.get('assessment_eligible', True)]

    # Filter primary pool: questions matching student's reported topics
    primary_pool = [
        q for q in eligible_questions
        if q.get('topic') in primary_names or any(t in primary_names for t in q.get('topics', []))
    ]

    # Prioritize self-reported difficulty level within primary pool
    target_diff = self_reported_level.capitalize() if self_reported_level else 'Easy'
    primary_level_matched = [q for q in primary_pool if q.get('difficulty', 'Medium').capitalize() == target_diff]

    if primary_level_matched:
        primary_pool_ordered = primary_level_matched + [q for q in primary_pool if q not in primary_level_matched]
    else:
        primary_pool_ordered = primary_pool

    exploration_pool = [
        q for q in eligible_questions
        if q.get('topic') not in primary_names
    ]

    # Combine: Primary pool ordered first, followed by exploration pool
    combined_pool = primary_pool_ordered + exploration_pool
    return combined_pool, primary_names, unknown_names

def count_candidates_by_difficulty(candidate_pool):
    counts = {'Easy': 0, 'Medium': 0, 'Hard': 0}
    for q in candidate_pool:
        diff = q.get('difficulty', 'Medium')
        counts[diff] = counts.get(diff, 0) + 1
    return counts

def start_assessment_session(user_id: str, experience_text: str, self_reported_level: str = 'Beginner', selected_topics: list = None):
    session_id = f"session_{uuid.uuid4().hex[:12]}"

    # 1. Run Multi-Label Topic Classifier & Skill Predictor
    detected_topics, unknown_topics, initial_estimate = predict_topics_from_text(
        experience_text=experience_text,
        user_selected_topics=selected_topics,
        self_reported_level=self_reported_level
    )
    predicted_skills = predict_skills_from_text(experience_text)

    # 2. Build Primary + Exploration candidate pools with topic and level prioritization
    candidate_pool, primary_names, unknown_names = build_candidate_pools(
        detected_topics, unknown_topics, QUESTION_BANK, self_reported_level=self_reported_level
    )

    # 3. Initialize per-topic Bayesian mastery model
    mastery_dict = {}
    for t in detected_topics:
        mastery_dict[t['name']] = t['probability']
    for t in unknown_topics:
        mastery_dict[t['name']] = t['probability']

    mastery_model = TopicMasteryModel(mastery_dict)
    
    # Self-reported level is only an initial prior (theta_0)
    level_prior_map = {"Beginner": -0.80, "Intermediate": 0.00, "Expert": 0.80}
    student_ability = level_prior_map.get(self_reported_level.capitalize(), 0.00)

    diff_counts = count_candidates_by_difficulty(candidate_pool)

    # 4. Rank & select Question 1
    ranked_candidates = question_ranker.rank_questions(
        candidate_questions=candidate_pool,
        detected_topics=detected_topics,
        topic_mastery=mastery_model.get_all_mastery(),
        student_ability=student_ability,
        asked_ids=[],
        asked_types=[],
        exploration_topic_set=unknown_names
    )

    chosen_item = question_ranker.select_top_weighted_candidate(ranked_candidates, top_n=3, temperature=0.10)
    if not chosen_item:
        chosen_item = {'question': candidate_pool[0], 'reasons': ['initial assessment candidate']}

    q1 = chosen_item['question']
    reasons = chosen_item['reasons']

    print(f"\n[Diagnostic] Started Session '{session_id}' | Level Prior: '{self_reported_level}' (theta_0: {student_ability:.2f})")
    print(f"[Diagnostic] Candidate Counts: {diff_counts}")
    print(f"[Diagnostic] Selected Q1: [{q1.get('difficulty', 'Medium')} | {q1.get('topic')}] {q1.get('title', q1.get('question_id'))}")

    session_data = {
        "sessionId": session_id,
        "userId": user_id,
        "experienceText": experience_text,
        "selfReportedLevel": self_reported_level,
        "detectedTopics": detected_topics,
        "unknownTopics": unknown_topics,
        "predictedSkills": predicted_skills,
        "initialEstimate": initial_estimate,
        "candidatePool": candidate_pool,
        "explorationTopics": unknown_names,
        "masteryModel": mastery_model,
        "studentAbility": student_ability,
        "askedQuestionIds": [q1.get("id") or q1.get("question_id")],
        "askedQuestionTypes": [q1.get("question_type", "algorithm_selection")],
        "questions": [q1],
        "answers": [],
        "mistakeTopics": [],
        "adaptationTraceLog": [],
        "currentQuestionIndex": 0,
        "totalQuestions": 12,
        "status": "IN_PROGRESS",
        "currentQuestion": q1,
        "adaptationExplanation": reasons
    }
    active_sessions[session_id] = session_data

    return {
        "sessionId": session_id,
        "userId": user_id,
        "status": "IN_PROGRESS",
        "currentQuestionIndex": 0,
        "totalQuestions": 12,
        "currentQuestion": q1,
        "detectedTopics": detected_topics,
        "unknownTopics": unknown_topics,
        "predictedSkills": predicted_skills,
        "initialEstimate": initial_estimate,
        "adaptationExplanation": reasons
    }

def record_answer_and_adapt(session_id: str, question_id: str, user_answer: str, execution_result: Optional[Dict[str, Any]] = None):
    session = active_sessions.get(session_id)
    if not session:
        session = start_assessment_session("user_auto", "I know arrays and strings.", "Beginner")
        session_id = session["sessionId"]

    mastery_model: TopicMasteryModel = session["masteryModel"]
    candidate_pool = session.get("candidatePool", QUESTION_BANK)
    asked_ids = session["askedQuestionIds"]
    asked_types = session["askedQuestionTypes"]

    current_q = next((q for q in session["questions"] if (q.get("id") == question_id or q.get("question_id") == question_id)), session["currentQuestion"])
    
    # Evaluate correctness (MCQ string comparison vs Coding Execution Result)
    if current_q.get("question_type") == "implementation" and execution_result:
        is_correct = bool(execution_result.get("all_passed", False))
    else:
        correct_ans = str(current_q.get("correctAnswer") or current_q.get("correct_answer") or "").strip().lower()
        user_ans_clean = str(user_answer or "").strip().lower()
        is_correct = (user_ans_clean == correct_ans) or (correct_ans and correct_ans in user_ans_clean) or (user_ans_clean and user_ans_clean in correct_ans)

    if not is_correct:
        session["mistakeTopics"].append(current_q["topic"])

    theta_before = session["studentAbility"]

    # 1. Bayesian per-topic mastery update
    updated_topic_mastery = mastery_model.update_mastery(
        topic=current_q["topic"],
        difficulty=current_q.get("difficulty", "Medium"),
        is_correct=is_correct,
        user_ability=theta_before
    )

    # 2. IRT Ability Update (theta)
    theta_after, p_correct, pred_error = irt_engine.update_ability(
        current_theta=theta_before,
        question_difficulty=current_q.get("difficulty", "Medium"),
        is_correct=is_correct
    )
    session["studentAbility"] = theta_after

    answer_record = {
        "questionId": question_id,
        "topic": current_q["topic"],
        "questionType": current_q.get("question_type", "algorithm_selection"),
        "difficulty": current_q.get("difficulty", "Medium"),
        "userAnswer": user_answer,
        "isCorrect": is_correct,
        "pCorrect": p_correct,
        "predError": pred_error,
        "thetaBefore": theta_before,
        "thetaAfter": theta_after,
        "updatedTopicMastery": updated_topic_mastery
    }
    session["answers"].append(answer_record)

    next_idx = len(session["answers"])
    session["currentQuestionIndex"] = next_idx

    # 3. Evidence-Based Adaptive Stopping Criteria (10 to 15 questions)
    is_complete = False
    se_theta = irt_engine.calculate_standard_error(theta_after, session["answers"])

    if next_idx >= 15:
        is_complete = True
    elif next_idx >= 10:
        # Check ability convergence (SE < 0.30 or consistent performance)
        recent_thetas = [a["thetaAfter"] for a in session["answers"][-3:]]
        theta_stable = len(recent_thetas) == 3 and (max(recent_thetas) - min(recent_thetas) <= 0.10)
        if se_theta <= 0.30 or theta_stable:
            is_complete = True

    if is_complete:
        session["status"] = "COMPLETED"
        return finish_assessment_session(session_id)

    # 4. Rank candidates for Next Question
    ranked = question_ranker.rank_questions(
        candidate_questions=candidate_pool,
        detected_topics=session["detectedTopics"],
        topic_mastery=mastery_model.get_all_mastery(),
        student_ability=theta_after,
        asked_ids=asked_ids,
        asked_types=asked_types,
        mistake_topics=session["mistakeTopics"],
        exploration_topic_set=session.get("explorationTopics", set())
    )

    chosen_item = question_ranker.select_top_weighted_candidate(ranked, top_n=3, temperature=0.10)
    if not chosen_item:
        chosen_item = {'question': candidate_pool[0], 'reasons': ['adaptive candidate']}

    next_q = chosen_item['question']
    reasons = chosen_item['reasons']

    next_id = next_q.get("id") or next_q.get("question_id")
    next_type = next_q.get("question_type", "algorithm_selection")

    session["askedQuestionIds"].append(next_id)
    session["askedQuestionTypes"].append(next_type)
    session["questions"].append(next_q)
    session["currentQuestion"] = next_q
    session["adaptationExplanation"] = reasons

    return {
        "sessionId": session_id,
        "status": "IN_PROGRESS",
        "currentQuestionIndex": next_idx,
        "totalQuestions": 12,
        "currentQuestion": next_q,
        "adaptationExplanation": reasons,
        "updatedTopicMastery": mastery_model.get_all_mastery(),
        "studentAbility": theta_after,
        "standardError": se_theta
    }

def finish_assessment_session(session_id: str) -> Dict[str, Any]:
    session = active_sessions.get(session_id)
    if not session:
        return {"error": f"Session '{session_id}' not found"}

    session["status"] = "COMPLETED"
    mastery_model: TopicMasteryModel = session["masteryModel"]
    answers = session["answers"]
    n_answered = len(answers)

    acc = sum(1 for a in answers if a["isCorrect"]) / max(1, n_answered)
    final_theta = session["studentAbility"]
    se_theta = irt_engine.calculate_standard_error(final_theta, answers)

    # Derive evidence-based skill tier from final IRT theta
    if final_theta >= 0.80:
        verified_level = "Expert"
    elif final_theta >= 0.20:
        verified_level = "Advanced"
    elif final_theta >= -0.40:
        verified_level = "Intermediate"
    else:
        verified_level = "Beginner"

    all_mastery = mastery_model.get_all_mastery()
    
    # Identify attempted topics vs unattempted topics strictly based on actual answers
    attempted_topics = {a["topic"] for a in answers if a.get("topic")}
    topic_correct = {}
    topic_total = {}
    for a in answers:
        t = a.get("topic")
        if t:
            topic_total[t] = topic_total.get(t, 0) + 1
            if a.get("isCorrect"):
                topic_correct[t] = topic_correct.get(t, 0) + 1

    strengths = []
    weaknesses = []
    for t in attempted_topics:
        t_acc = topic_correct.get(t, 0) / max(1, topic_total.get(t, 1))
        m_val = all_mastery.get(t, 0.50)
        if t_acc >= 0.50 and m_val >= 0.50:
            strengths.append(t)
        elif t_acc <= 0.40 or m_val < 0.45:
            weaknesses.append(t)

    # Untested topics: topics not attempted in assessment session
    untested_topics = [t['name'] for t in session.get("unknownTopics", []) if t.get('name') not in attempted_topics]

    rec_diff = "Hard" if verified_level in ["Advanced", "Expert"] else ("Medium" if verified_level == "Intermediate" else "Easy")

    final_profile = {
        "overall_skill": {
            "level": verified_level,
            "ability_theta": round(final_theta, 4),
            "standard_error": round(se_theta, 4),
            "accuracy": round(acc * 100, 2),
            "confidence": round((1.0 - min(0.9, se_theta)) * 100, 2)
        },
        "selfReportedLevel": session["selfReportedLevel"],
        "verifiedLevel": verified_level,
        "recommended_difficulty": rec_diff,
        "topic_mastery": all_mastery,
        "strengths": strengths if strengths else [list(attempted_topics)[0]] if attempted_topics else ["Array"],
        "weaknesses": weaknesses,  # Evidence-only: strictly empty if learner performed well or never attempted
        "untested_topics": untested_topics,
        "not_assessed_topics": untested_topics,
        "predicted_skills": session.get("predictedSkills", []),
        "totalQuestionsAnswered": n_answered,
        "correctAnswersCount": sum(1 for a in answers if a["isCorrect"]),
        "explanation": {
            "summary": f"IRT Rasch Model evaluated {n_answered}-question adaptive session. Prior: '{session['selfReportedLevel']}' | Final theta: {final_theta:.2f} (SE: {se_theta:.2f}) | Verified: '{verified_level}'."
        }
    }
    session["finalProfile"] = final_profile
    session["currentQuestion"] = None

    return {
        "sessionId": session_id,
        "status": "COMPLETED",
        "currentQuestionIndex": n_answered,
        "totalQuestions": n_answered,
        "currentQuestion": None,
        "finalProfile": final_profile
    }

def get_session(session_id: str):
    return active_sessions.get(session_id)
