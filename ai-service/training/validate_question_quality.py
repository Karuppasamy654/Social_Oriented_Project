import os
import sys
import json

# Ensure ai-service root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.data.question_bank_loader import load_assessment_question_bank
from app.data.question_schema import VALID_QUESTION_TYPES as SUPPORTED_QUESTION_TYPES
from app.data.problem_schema import CodingProblem

def run_question_quality_validation():
    questions = load_assessment_question_bank()
    total_count = len(questions)

    good_count = 0
    incomplete_count = 0
    invalid_ambiguous_count = 0

    eligible_questions = []
    non_eligible_questions = []

    type_breakdown = {qt: 0 for qt in SUPPORTED_QUESTION_TYPES}
    topic_breakdown = {}
    difficulty_breakdown = {'Easy': 0, 'Medium': 0, 'Hard': 0}
    rejection_reasons_summary = {}

    seen_statements = set()

    for q in questions:
        quality_tier = q.get('quality_tier', 'INCOMPLETE')
        is_eligible = q.get('assessment_eligible', False)
        rej_reason = q.get('rejection_reason', 'Source record incomplete')

        if quality_tier == "GOOD":
            good_count += 1
        elif quality_tier == "INVALID_AMBIGUOUS":
            invalid_ambiguous_count += 1
        else:
            incomplete_count += 1

        if is_eligible:
            eligible_questions.append(q)

            # Type breakdown
            qt = q.get('question_type', 'coding_problem')
            type_breakdown[qt] = type_breakdown.get(qt, 0) + 1

            # Topic breakdown
            t = q.get('topic', 'Uncategorized')
            topic_breakdown[t] = topic_breakdown.get(t, 0) + 1

            # Difficulty breakdown
            d = q.get('difficulty', 'Medium')
            difficulty_breakdown[d] = difficulty_breakdown.get(d, 0) + 1
        else:
            non_eligible_questions.append(q)
            rejection_reasons_summary[rej_reason] = rejection_reasons_summary.get(rej_reason, 0) + 1

    # Benchmark problem audit checks
    benchmarks = [
        "Two Sum",
        "Longest Palindromic Substring",
        "Combination Sum",
        "Valid Parentheses",
        "Reverse Linked List",
        "Binary Tree Inorder Traversal",
        "Binary Search",
        "Number of Islands",
        "Climbing Stairs",
        "Merge Intervals",
        "Kth Largest Element in an Array"
    ]

    benchmark_audits = []
    for b_title in benchmarks:
        match = next((q for q in eligible_questions if b_title.lower() in q.get('title', '').lower()), None)
        if match:
            benchmark_audits.append({
                "title": match['title'],
                "status": "GOOD (Assessment Eligible)",
                "question_type": match['question_type'],
                "topic": match['topic'],
                "difficulty": match['difficulty'],
                "prompt": match.get('question_text') or match.get('questionText') or match.get('title'),
                "statement": match.get('problem_statement') or match.get('problemStatement') or match.get('title'),
                "options": match.get('options', []),
                "correct": match.get('correct_answer') or match.get('correctAnswer', ''),
                "explanation": match.get('explanation', 'Optimal algorithmic solution.')
            })

    # Generate Markdown Report
    reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    report_path = os.path.join(reports_dir, 'question_quality_report.md')

    report_content = f"""# CodeBuddy Assessment Question Quality Validation Report

Generated automatically by `validate_question_quality.py`.

## 1. Executive Dataset Summary

- **Total Questions Audited**: {total_count}
- **Assessment Eligible Questions**: {len(eligible_questions)} ({round(len(eligible_questions)/total_count*100, 1)}%)
- **Non-Eligible Questions**: {len(non_eligible_questions)} ({round(len(non_eligible_questions)/total_count*100, 1)}%)

---

## 2. Quality Taxonomy Classification

- **GOOD (Usable, Unambiguous, Provenance Verified)**: {good_count} ({round(good_count/total_count*100, 1)}%)
- **INCOMPLETE (Missing Problem Statement / Metadata Only)**: {incomplete_count} ({round(incomplete_count/total_count*100, 1)}%)
- **INVALID_AMBIGUOUS (Generic Template / Ambiguous Choices)**: {invalid_ambiguous_count} ({round(invalid_ambiguous_count/total_count*100, 1)}%)

---

## 3. Eligible Question Pool Breakdown

### By Question Type
"""
    for qt_name, count in type_breakdown.items():
        report_content += f"- **{qt_name}**: {count} questions\n"

    report_content += f"""
### By Difficulty
- **Easy**: {difficulty_breakdown.get('Easy', 0)} ({round(difficulty_breakdown.get('Easy', 0)/max(1, len(eligible_questions))*100, 1)}%)
- **Medium**: {difficulty_breakdown.get('Medium', 0)} ({round(difficulty_breakdown.get('Medium', 0)/max(1, len(eligible_questions))*100, 1)}%)
- **Hard**: {difficulty_breakdown.get('Hard', 0)} ({round(difficulty_breakdown.get('Hard', 0)/max(1, len(eligible_questions))*100, 1)}%)

### By Topic
"""
    for t_name, count in sorted(topic_breakdown.items(), key=lambda x: x[1], reverse=True):
        report_content += f"- **{t_name}**: {count} questions\n"

    report_content += """
---

## 4. Rejection Reasons Breakdown

"""
    for reason, count in sorted(rejection_reasons_summary.items(), key=lambda x: x[1], reverse=True):
        report_content += f"- **{reason}**: {count} questions\n"

    report_content += """
---

## 5. Benchmark Problem Verification & Disambiguation Examples

The following key benchmark problems were verified to ensure normal students receive unambiguous, explicit, student-understandable questions:

"""
    for b in benchmark_audits:
        report_content += f"### {b['title']} [{b['difficulty']} • {b['topic']}]\n"
        report_content += f"- **Question Type**: `{b['question_type']}`\n"
        report_content += f"- **Quality Status**: `{b['status']}`\n"
        report_content += f"- **Student Question Prompt**: {b['prompt']}\n"
        report_content += f"- **Problem Statement**: {b['statement'][:200]}...\n"
        report_content += f"- **Choices**: {', '.join(b['options'])}\n"
        report_content += f"- **Correct Answer**: `{b['correct']}`\n"
        report_content += f"- **Explanation**: {b['explanation']}\n\n"

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)

    print(f"[OK] Question Quality Validation Complete!")
    print(f"[INFO] Report saved to: {report_path}")
    print(f"[INFO] Total Audited: {total_count} | GOOD: {good_count} | INCOMPLETE: {incomplete_count} | INVALID_AMBIGUOUS: {invalid_ambiguous_count}")

if __name__ == '__main__':
    run_question_quality_validation()
