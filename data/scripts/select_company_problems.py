import os
import sys
import json
from collections import defaultdict

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NORMALIZED_FILE = os.path.join(BASE_DIR, "company", "normalized", "company-problems-raw.json")
COMPANY_PROBLEMS_FILE = os.path.join(BASE_DIR, "company", "company-problems.json")
REPORT_FILE = os.path.join(BASE_DIR, "company", "company-selection-report.json")
CURRICULUM_FILE = os.path.join(BASE_DIR, "leetcode", "curriculum-500.json")

RECENCY_WEIGHTS = {
    'thirty-days': 1.0,
    'three-months': 0.9,
    'six-months': 0.8,
    'more-than-six-months': 0.6,
    'all-time': 0.5
}

TARGET_PER_COMPANY = 30
TARGET_EASY = 8
TARGET_MEDIUM = 16
TARGET_HARD = 6

def select_company_curriculum(dry_run=False):
    if not os.path.exists(NORMALIZED_FILE):
        print(f"Normalized company dataset missing at {NORMALIZED_FILE}. Run normalization script first.", file=sys.stderr)
        return False

    with open(NORMALIZED_FILE, 'r', encoding='utf-8') as f:
        all_records = json.load(f)

    curriculum_slugs = set()
    if os.path.exists(CURRICULUM_FILE):
        with open(CURRICULUM_FILE, 'r', encoding='utf-8') as f:
            curr = json.load(f)
            curriculum_slugs = {item['slug'] for item in curr}

    by_company = defaultdict(list)
    for rec in all_records:
        by_company[rec['company']].append(rec)

    final_assignments = []
    report_data = {
        "companies": len(by_company),
        "targetProblemsPerCompany": TARGET_PER_COMPANY,
        "targetAssignments": len(by_company) * TARGET_PER_COMPANY,
        "companiesData": {}
    }

    all_unique_slugs = set()
    total_easy = 0
    total_medium = 0
    total_hard = 0
    all_topics = set()

    for comp_name, recs in sorted(by_company.items()):
        easy_pool = [r for r in recs if r['difficulty'] == 'Easy']
        medium_pool = [r for r in recs if r['difficulty'] == 'Medium']
        hard_pool = [r for r in recs if r['difficulty'] == 'Hard']

        def score_record(r, company_topics):
            rec_weight = RECENCY_WEIGHTS.get(r['recency'], 0.5)
            freq_score = r.get('frequency', 0.5) * 40.0
            rec_score = rec_weight * 30.0
            unseen_topics = [t for t in r.get('topics', []) if t not in company_topics]
            topic_bonus = len(unseen_topics) * 5.0
            curr_bonus = 10.0 if r['slug'] in curriculum_slugs else 0.0
            return freq_score + rec_score + topic_bonus + curr_bonus

        selected_for_comp = []
        comp_topics = set()

        def select_from_pool(pool, count):
            nonlocal comp_topics
            if not pool or count <= 0:
                return []
            
            chosen = []
            remaining = list(pool)

            for _ in range(min(count, len(remaining))):
                scored = []
                for item in remaining:
                    s = score_record(item, comp_topics)
                    scored.append((s, item['slug'], item))
                
                scored.sort(key=lambda x: (-x[0], x[1]))
                best_item = scored[0][2]
                
                chosen.append(best_item)
                remaining.remove(best_item)
                for t in best_item.get('topics', []):
                    comp_topics.add(t)

            return chosen

        sel_easy = select_from_pool(easy_pool, TARGET_EASY)
        sel_med = select_from_pool(medium_pool, TARGET_MEDIUM)
        sel_hard = select_from_pool(hard_pool, TARGET_HARD)

        selected_for_comp = sel_easy + sel_med + sel_hard

        if len(selected_for_comp) < TARGET_PER_COMPANY:
            already_selected_slugs = {r['slug'] for r in selected_for_comp}
            remaining_pool = [r for r in recs if r['slug'] not in already_selected_slugs]
            needed = TARGET_PER_COMPANY - len(selected_for_comp)
            fallback = select_from_pool(remaining_pool, needed)
            selected_for_comp.extend(fallback)

        selected_for_comp = selected_for_comp[:TARGET_PER_COMPANY]

        comp_easy = sum(1 for r in selected_for_comp if r['difficulty'] == 'Easy')
        comp_medium = sum(1 for r in selected_for_comp if r['difficulty'] == 'Medium')
        comp_hard = sum(1 for r in selected_for_comp if r['difficulty'] == 'Hard')
        comp_topic_list = sorted(list({t for r in selected_for_comp for t in r.get('topics', [])}))

        report_data["companiesData"][comp_name] = {
            "selected": len(selected_for_comp),
            "easy": comp_easy,
            "medium": comp_medium,
            "hard": comp_hard,
            "topicsCovered": len(comp_topic_list),
            "topics": comp_topic_list
        }

        total_easy += comp_easy
        total_medium += comp_medium
        total_hard += comp_hard
        for r in selected_for_comp:
            all_unique_slugs.add(r['slug'])
            for t in r.get('topics', []):
                all_topics.add(t)

        final_assignments.extend(selected_for_comp)

    report_data["actualAssignments"] = len(final_assignments)
    report_data["uniqueProblems"] = len(all_unique_slugs)
    report_data["difficultyDistribution"] = {
        "Easy": total_easy,
        "Medium": total_medium,
        "Hard": total_hard
    }
    report_data["totalTopicsCovered"] = len(all_topics)

    print("==================================================")
    print("COMPANY SELECTION ALGORITHM SUMMARY")
    print("==================================================")
    print(f"Mode: {'DRY-RUN' if dry_run else 'SELECTION OUTPUT'}")
    print(f"Target Companies: {report_data['companies']}")
    print(f"Target Assignments: {report_data['targetAssignments']}")
    print(f"Actual Assignments: {report_data['actualAssignments']}")
    print(f"Unique Problems:    {report_data['uniqueProblems']}")
    print(f"Difficulty Split:   Easy={total_easy}, Medium={total_medium}, Hard={total_hard}")
    print(f"Total Topics Covered: {len(all_topics)}")
    print("==================================================")

    if not dry_run:
        with open(COMPANY_PROBLEMS_FILE, 'w', encoding='utf-8') as f:
            json.dump(final_assignments, f, indent=2)
        with open(REPORT_FILE, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2)
        print(f"Saved company assignments to: {COMPANY_PROBLEMS_FILE}")
        print(f"Saved selection report to: {REPORT_FILE}")

    return True

if __name__ == "__main__":
    is_dry_run = '--dry-run' in sys.argv
    success = select_company_curriculum(dry_run=is_dry_run)
    sys.exit(0 if success else 1)
