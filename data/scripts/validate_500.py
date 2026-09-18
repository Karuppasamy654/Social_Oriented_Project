import os
import sys
import json

REQUIRED_FIELDS = [
    "externalSource", "externalId", "questionId", "title", 
    "slug", "difficulty", "topics", "description", 
    "starterCode", "sourceMetadata"
]

EXPECTED_DIFFICULTY = {
    "Easy": 200,
    "Medium": 250,
    "Hard": 50
}

def validate_500():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "leetcode", "curriculum-500.json")

    if not os.path.exists(json_path):
        print(f"❌ VALIDATION ERROR: File not found at {json_path}")
        sys.exit(1)

    with open(json_path, 'r', encoding='utf-8') as f:
        records = json.load(f)

    errors = []

    # 1. Total records check
    if len(records) != 500:
        errors.append(f"Expected 500 total records, got {len(records)}")

    # 2. Unique problem IDs check
    seen_ids = set()
    seen_slugs = set()
    diff_counts = {"Easy": 0, "Medium": 0, "Hard": 0}

    for idx, r in enumerate(records):
        q_id = r.get("questionId") or r.get("externalId")
        if not q_id:
            errors.append(f"Record #{idx} missing questionId/externalId")
        elif q_id in seen_ids:
            errors.append(f"Duplicate problem ID found: {q_id}")
        else:
            seen_ids.add(q_id)

        # Schema fields check
        for field in REQUIRED_FIELDS:
            if field not in r or r[field] is None:
                errors.append(f"Record #{q_id} missing required field: {field}")

        # Difficulty check
        diff = r.get("difficulty")
        if diff not in EXPECTED_DIFFICULTY:
            errors.append(f"Record #{q_id} invalid difficulty: {diff}")
        else:
            diff_counts[diff] += 1

        # Source metadata check
        meta = r.get("sourceMetadata")
        if not isinstance(meta, dict) or not meta.get("dataset"):
            errors.append(f"Record #{q_id} missing or invalid sourceMetadata")

    # 3. Difficulty counts check
    for diff, expected in EXPECTED_DIFFICULTY.items():
        actual = diff_counts.get(diff, 0)
        if actual != expected:
            errors.append(f"Difficulty quota mismatch for {diff}: expected {expected}, got {actual}")

    if errors:
        print("❌ VALIDATION FAILED WITH ERRORS:")
        for err in errors[:10]:
            print(f"  - {err}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more errors.")
        sys.exit(1)

    print("VALIDATION: PASSED")
    return True

if __name__ == '__main__':
    validate_500()
