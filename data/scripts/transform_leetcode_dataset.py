import os
import json
from validate_leetcode_dataset import validate_dataset

def transform_and_export():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_path = os.path.join(base_dir, "raw", "leetcode_dataset.json")
    
    if not os.path.exists(raw_path):
        print(f"Error: Raw dataset file not found at {raw_path}")
        return

    with open(raw_path, 'r') as f:
        records = json.load(f)

    report, valid_records = validate_dataset(records)

    processed_dir = os.path.join(base_dir, "processed")
    os.makedirs(processed_dir, exist_ok=True)
    out_file = os.path.join(processed_dir, "leetcode_processed.json")
    
    with open(out_file, 'w') as f:
        json.dump(valid_records, f, indent=2)

    print(f"Successfully transformed {len(valid_records)} problems into {out_file}")

if __name__ == '__main__':
    transform_and_export()
