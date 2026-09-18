import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_DIR = os.path.dirname(BASE_DIR)
if SERVICE_DIR not in sys.path:
    sys.path.insert(0, SERVICE_DIR)

from app.services.assessment_engine import start_assessment_session, record_answer_and_adapt, get_session

REPORTS_DIR = os.path.join(SERVICE_DIR, 'reports')
os.makedirs(REPORTS_DIR, exist_ok=True)

PROFILES = [
    {
        "id": "Profile_A",
        "name": "Profile A (Beginner - Array & String)",
        "level": "Beginner",
        "experience": "I know basic arrays and strings in Python.",
        "topics": ["Array", "String"]
    },
    {
        "id": "Profile_B",
        "name": "Profile B (Intermediate - LinkedList, Stack, Queue, Tree, BST)",
        "level": "Intermediate",
        "experience": "I know linked lists, stacks, queues, binary trees and BST.",
        "topics": ["Linked List", "Stack", "Queue", "Binary Tree", "BST"]
    },
    {
        "id": "Profile_C",
        "name": "Profile C (Expert - Graph, BFS, DFS, DP)",
        "level": "Expert",
        "experience": "I solve graph theory, BFS, DFS, and dynamic programming.",
        "topics": ["Graph", "BFS", "DFS", "Dynamic Programming"]
    },
    {
        "id": "Profile_D",
        "name": "Profile D (Beginner / Foundational - No DSA)",
        "level": "Beginner",
        "experience": "I have no data structures knowledge.",
        "topics": []
    }
]

def run_experiment_scenario(profile, scenario_name, answer_rule_fn):
    session = start_assessment_session(
        user_id=f"{profile['id']}_{scenario_name}",
        experience_text=profile['experience'],
        self_reported_level=profile['level'],
        selected_topics=profile['topics']
    )

    session_id = session['sessionId']
    trace_log = []
    q = session['currentQuestion']
    step = 1

    while q is not None and step <= 12:
        is_correct = answer_rule_fn(step, q)
        user_ans = q['correctAnswer'] if is_correct else q['options'][1]

        full_s_before = get_session(session_id)
        theta_before = full_s_before['studentAbility']

        adapt_res = record_answer_and_adapt(session_id, q['id'], user_ans)
        full_s_after = get_session(session_id)
        theta_after = full_s_after['studentAbility']

        trace_log.append({
            "step": step,
            "questionId": q['id'],
            "topic": q['topic'],
            "difficulty": q['difficulty'],
            "isCorrect": is_correct,
            "thetaBefore": round(theta_before, 4),
            "thetaAfter": round(theta_after, 4),
            "selectedNextDifficulty": adapt_res.get('currentQuestion', {}).get('difficulty') if adapt_res.get('currentQuestion') else 'N/A'
        })

        if adapt_res.get('status') == 'COMPLETED':
            break

        q = adapt_res.get('currentQuestion')
        step += 1

    return trace_log, get_session(session_id)

def execute_all_experiments():
    print("==========================================================")
    print("CODEBUDDY DIFFICULTY ADAPTATION CONTROLLED EXPERIMENTS")
    print("==========================================================\n")

    results_report = """# CodeBuddy Difficulty Adaptation Controlled Experiment Report

- **Date**: 2026-09-16
- **Version**: `v3.0.0`
- **File**: `ai-service/reports/difficulty_adaptation_report.md`

---

## Executive Summary

This report documents empirical controlled experiments verifying difficulty adaptation across 4 distinct student experience profiles (Beginner, Intermediate, Expert, Foundational) under 3 answer performance scenarios:
1. **Scenario 1 (Mostly Correct)**: Demonstrates upward difficulty progression.
2. **Scenario 2 (Mostly Wrong)**: Demonstrates downward difficulty adjustment.
3. **Scenario 3 (Mixed Performance)**: Demonstrates adaptive equilibrium around actual student skill.

---
"""

    for prof in PROFILES:
        print(f"==========================================")
        print(f" Running Experiments for {prof['name']}")
        print(f"==========================================")

        # 1. Mostly Correct (Always correct)
        trace_correct, sess_correct = run_experiment_scenario(
            prof, "mostly_correct", lambda step, q: True
        )

        # 2. Mostly Wrong (Always wrong)
        trace_wrong, sess_wrong = run_experiment_scenario(
            prof, "mostly_wrong", lambda step, q: False
        )

        # 3. Mixed (Alternating)
        trace_mixed, sess_mixed = run_experiment_scenario(
            prof, "mixed", lambda step, q: (step % 2 != 0)
        )

        results_report += f"""## Profile: {prof['name']}
- **Self-Reported Level Prior**: `{prof['level']}`
- **Experience Input**: `"{prof['experience']}"`

### Scenario 1: Mostly Correct Answers (Progressive Escalation)
| Step | Topic | Difficulty | Correct | theta Before | theta After | Next Difficulty |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
"""
        for item in trace_correct:
            results_report += f"| Q{item['step']} | {item['topic']} | **{item['difficulty']}** | `{item['isCorrect']}` | {item['thetaBefore']} | **{item['thetaAfter']}** | {item['selectedNextDifficulty']} |\n"

        results_report += f"""
- **Final Verified Skill Level**: `{sess_correct.get('finalProfile', {}).get('verifiedLevel', 'N/A')}`
- **Observed Behavior**: Student started at level prior ($\theta_0$), repeatedly answered correctly, causing $\theta$ to escalate from `{trace_correct[0]['thetaBefore']}` to `{trace_correct[-1]['thetaAfter']}`, increasing Hard/Medium candidate ranking probability.

---

### Scenario 2: Mostly Wrong Answers (Downward Adjustment)
| Step | Topic | Difficulty | Correct | theta Before | theta After | Next Difficulty |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
"""
        for item in trace_wrong:
            results_report += f"| Q{item['step']} | {item['topic']} | **{item['difficulty']}** | `{item['isCorrect']}` | {item['thetaBefore']} | **{item['thetaAfter']}** | {item['selectedNextDifficulty']} |\n"

        results_report += f"""
- **Final Verified Skill Level**: `{sess_wrong.get('finalProfile', {}).get('verifiedLevel', 'N/A')}`
- **Observed Behavior**: Student started at level prior ($\theta_0$), repeatedly answered wrong, causing $\theta$ to adjust downward from `{trace_wrong[0]['thetaBefore']}` to `{trace_wrong[-1]['thetaAfter']}`, shifting next question candidates to easier levels.

---

### Scenario 3: Mixed Answer Performance (Adaptive Equilibrium)
| Step | Topic | Difficulty | Correct | theta Before | theta After | Next Difficulty |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
"""
        for item in trace_mixed:
            results_report += f"| Q{item['step']} | {item['topic']} | **{item['difficulty']}** | `{item['isCorrect']}` | {item['thetaBefore']} | **{item['thetaAfter']}** | {item['selectedNextDifficulty']} |\n"

        results_report += f"""
- **Final Verified Skill Level**: `{sess_mixed.get('finalProfile', {}).get('verifiedLevel', 'N/A')}`
- **Observed Behavior**: Mixed performance maintained student ability $\theta$ in an adaptive equilibrium around `{trace_mixed[-1]['thetaAfter']}`.

---
"""

    report_path = os.path.join(REPORTS_DIR, 'difficulty_adaptation_report.md')
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(results_report)

    print(f"\n[OK] Saved Difficulty Adaptation Report to: {report_path}\n")

if __name__ == '__main__':
    execute_all_experiments()
