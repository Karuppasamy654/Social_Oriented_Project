import os
import sys
import json
import csv
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR_PRIMARY = os.path.join(BASE_DIR, "company", "raw")
RAW_DIR_EXTRACTED = os.path.join(BASE_DIR, "company", "raw_extracted", "leetcode-companywise-interview-questions-master")
NORMALIZED_DIR = os.path.join(BASE_DIR, "company", "normalized")
COMPANIES_FILE = os.path.join(BASE_DIR, "company", "companies.json")
CURRICULUM_FILE = os.path.join(BASE_DIR, "leetcode", "curriculum-500.json")

curriculum_by_slug = {}
curriculum_by_title = {}
if os.path.exists(CURRICULUM_FILE):
    with open(CURRICULUM_FILE, 'r', encoding='utf-8') as f:
        curr_data = json.load(f)
        for item in curr_data:
            curriculum_by_slug[item.get('slug')] = item
            curriculum_by_title[item.get('title', '').lower()] = item

def slugify(title):
    s = title.lower()
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'[\s_]+', '-', s)
    return s.strip('-')

RECENCY_MAP = {
    'thirty-days.csv': 'thirty-days',
    'three-months.csv': 'three-months',
    'six-months.csv': 'six-months',
    'more-than-six-months.csv': 'more-than-six-months',
    'all.csv': 'all-time'
}

def get_raw_dir():
    if os.path.exists(RAW_DIR_PRIMARY) and len(os.listdir(RAW_DIR_PRIMARY)) >= 15:
        return RAW_DIR_PRIMARY
    if os.path.exists(RAW_DIR_EXTRACTED):
        return RAW_DIR_EXTRACTED
    return RAW_DIR_PRIMARY

def normalize():
    os.makedirs(NORMALIZED_DIR, exist_ok=True)
    raw_dir = get_raw_dir()

    with open(COMPANIES_FILE, 'r', encoding='utf-8') as f:
        companies_meta = json.load(f)

    all_normalized_records = []
    stats_per_company = {}

    for comp in companies_meta:
        comp_id = comp['id']
        comp_name = comp['name']
        comp_folder = comp['folder']
        comp_raw_dir = os.path.join(raw_dir, comp_folder)

        if not os.path.exists(comp_raw_dir):
            print(f"Warning: Directory for {comp_name} not found at {comp_raw_dir}")
            continue

        records_for_comp = []
        csv_files = ['thirty-days.csv', 'three-months.csv', 'six-months.csv', 'more-than-six-months.csv', 'all.csv']
        seen_problem_slugs_in_comp = set()

        for csv_filename in csv_files:
            csv_path = os.path.join(comp_raw_dir, csv_filename)
            if not os.path.exists(csv_path):
                continue
            
            recency_bucket = RECENCY_MAP.get(csv_filename, 'all-time')

            with open(csv_path, 'r', encoding='utf-8', errors='ignore') as cf:
                reader = csv.DictReader(cf)
                for row in reader:
                    raw_id = row.get('ID', '').strip()
                    title = row.get('Title', '').strip()
                    url = row.get('URL', '').strip()
                    raw_diff = row.get('Difficulty', '').strip()
                    raw_freq = row.get('Frequency %', '').replace('%', '').strip()

                    if not title:
                        continue

                    slug = ''
                    if url and '/problems/' in url:
                        slug = url.split('/problems/')[1].strip('/').split('/')[0]
                    if not slug:
                        slug = slugify(title)

                    if slug in seen_problem_slugs_in_comp:
                        continue
                    seen_problem_slugs_in_comp.add(slug)

                    diff = raw_diff.capitalize()
                    if diff not in ['Easy', 'Medium', 'Hard']:
                        diff = 'Medium'

                    try:
                        freq_val = float(raw_freq) / 100.0 if raw_freq else 0.5
                    except ValueError:
                        freq_val = 0.5
                    freq_val = round(max(0.0, min(1.0, freq_val)), 4)

                    matched_curr = curriculum_by_slug.get(slug) or curriculum_by_title.get(title.lower())
                    topics = matched_curr.get('topics', ['Array', 'Hash Table']) if matched_curr else ['Array']
                    problem_id = str(matched_curr.get('externalId', raw_id)) if matched_curr else str(raw_id or slug)

                    record = {
                        "problemId": problem_id,
                        "title": title,
                        "slug": slug,
                        "difficulty": diff,
                        "topics": topics,
                        "company": comp_name,
                        "companyId": comp_id,
                        "frequency": freq_val,
                        "recency": recency_bucket,
                        "historicalEvidence": True,
                        "evidenceType": "company_tag",
                        "source": {
                            "dataset": "leetcode-companywise-interview-questions",
                            "repository": "snehasishroy/leetcode-companywise-interview-questions",
                            "snapshotDate": "2026-09-15"
                        }
                    }

                    records_for_comp.append(record)
                    all_normalized_records.append(record)

        stats_per_company[comp_name] = len(records_for_comp)

    out_file = os.path.join(NORMALIZED_DIR, "company-problems-raw.json")
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(all_normalized_records, f, indent=2)

    print("==================================================")
    print("COMPANY DATASET NORMALIZATION SUMMARY")
    print("==================================================")
    print(f"Total Normalized Records: {len(all_normalized_records)}")
    print(f"Companies Processed: {len(stats_per_company)}")
    for comp, count in stats_per_company.items():
        print(f"  • {comp:<15}: {count} problems")
    print(f"Saved normalized records to: {out_file}")
    print("==================================================")
    return True

if __name__ == "__main__":
    success = normalize()
    sys.exit(0 if success else 1)
