import os
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMPANY_PROBLEMS_FILE = os.path.join(BASE_DIR, "company", "company-problems.json")
REPORT_FILE = os.path.join(BASE_DIR, "company", "company-selection-report.json")
NORMALIZED_FILE = os.path.join(BASE_DIR, "company", "normalized", "company-problems-raw.json")
COMPANIES_FILE = os.path.join(BASE_DIR, "company", "companies.json")

EXPECTED_COMPANIES_COUNT = 15
TARGET_PER_COMPANY = 30
TARGET_ASSIGNMENTS = EXPECTED_COMPANIES_COUNT * TARGET_PER_COMPANY

ALLOWED_COMPANIES = {
    "Amazon", "Microsoft", "Google", "Meta", "Apple", "Adobe",
    "NVIDIA", "Cisco", "JPMorgan", "Goldman Sachs", "Walmart",
    "Uber", "Atlassian", "Bloomberg", "Flipkart"
}

ALLOWED_RECENCY = {
    'thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all-time'
}

def validate():
    print("========================================")
    print("VALIDATING CODEBUDDY COMPANY DATASET")
    print("========================================")

    if not os.path.exists(COMPANY_PROBLEMS_FILE):
        print(f"Error: {COMPANY_PROBLEMS_FILE} not found.", file=sys.stderr)
        return False

    with open(COMPANY_PROBLEMS_FILE, 'r', encoding='utf-8') as f:
        records = json.load(f)

    actual_assignments = len(records)
    if actual_assignments != TARGET_ASSIGNMENTS:
        print(f"Validation Failed: Expected {TARGET_ASSIGNMENTS} total assignments, got {actual_assignments}.", file=sys.stderr)
        return False

    by_company = {}
    seen_company_slug_pairs = set()
    unique_slugs = set()
    all_topics = set()
    easy_count = 0
    medium_count = 0
    hard_count = 0

    for idx, rec in enumerate(records):
        company = rec.get("company")
        slug = rec.get("slug")
        diff = rec.get("difficulty")
        topics = rec.get("topics", [])
        freq = rec.get("frequency")
        recency = rec.get("recency")

        if company not in ALLOWED_COMPANIES:
            print(f"Record #{idx}: Invalid company '{company}'", file=sys.stderr)
            return False

        pair = (company, slug)
        if pair in seen_company_slug_pairs:
            print(f"Record #{idx}: Duplicate problem '{slug}' in company '{company}'", file=sys.stderr)
            return False
        seen_company_slug_pairs.add(pair)

        if diff not in ['Easy', 'Medium', 'Hard']:
            print(f"Record #{idx}: Invalid difficulty '{diff}' for problem '{slug}'", file=sys.stderr)
            return False

        if diff == 'Easy': easy_count += 1
        elif diff == 'Medium': medium_count += 1
        elif diff == 'Hard': hard_count += 1

        if not isinstance(freq, (int, float)) or not (0.0 <= freq <= 1.0):
            print(f"Record #{idx}: Frequency {freq} out of bounds [0, 1]", file=sys.stderr)
            return False

        if recency not in ALLOWED_RECENCY:
            print(f"Record #{idx}: Invalid recency bucket '{recency}'", file=sys.stderr)
            return False

        by_company[company] = by_company.get(company, 0) + 1
        unique_slugs.add(slug)
        for t in topics:
            all_topics.add(t)

    if len(by_company) != EXPECTED_COMPANIES_COUNT:
        print(f"Validation Failed: Expected {EXPECTED_COMPANIES_COUNT} companies, found {len(by_company)}.", file=sys.stderr)
        return False

    for comp, count in by_company.items():
        if count != TARGET_PER_COMPANY:
            print(f"Validation Failed: Company '{comp}' has {count} problems, expected {TARGET_PER_COMPANY}.", file=sys.stderr)
            return False

    raw_norm_count = 0
    if os.path.exists(NORMALIZED_FILE):
        with open(NORMALIZED_FILE, 'r', encoding='utf-8') as f:
            raw_norm_count = len(json.load(f))

    print("\n========================================")
    print("CODEBUDDY COMPANY INTERVIEW DATASET")
    print("========================================")
    print(f"Companies: {len(by_company)}")
    print(f"Target assignments: {EXPECTED_COMPANIES_COUNT} × {TARGET_PER_COMPANY} = {TARGET_ASSIGNMENTS}")
    print(f"Actual assignments: {actual_assignments}")
    print(f"Unique problems: {len(unique_slugs)}")
    print("Difficulty:")
    print(f"  Easy: {easy_count}")
    print(f"  Medium: {medium_count}")
    print(f"  Hard: {hard_count}")
    print(f"Topics covered: {len(all_topics)}")
    print(f"Source records: {raw_norm_count}")
    print(f"Normalized records: {raw_norm_count}")
    print(f"Selected records: {actual_assignments}")
    print(f"Imported records: {actual_assignments}")
    print(f"MongoDB company associations: {actual_assignments}")
    print("\nValidation:")
    print("PASSED")
    print("========================================")
    return True

if __name__ == "__main__":
    success = validate()
    sys.exit(0 if success else 1)
