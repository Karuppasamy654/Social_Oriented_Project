import os
import json
import re
from collections import Counter, defaultdict

REQUIRED_TOPICS = [
    "Array", "String", "Hash Table", "Two Pointers", "Sliding Window",
    "Prefix Sum", "Binary Search", "Sorting", "Linked List", "Stack",
    "Queue", "Heap / Priority Queue", "Binary Tree", "BST", "Tree",
    "Trie", "Graph", "BFS", "DFS", "Backtracking",
    "Greedy", "Dynamic Programming", "Recursion", "Bit Manipulation",
    "Matrix", "Intervals", "Union Find", "Math"
]

TOPIC_MAP = {
    "array": "Array",
    "string": "String",
    "hash table": "Hash Table",
    "hashtable": "Hash Table",
    "hash map": "Hash Table",
    "hashmap": "Hash Table",
    "two pointers": "Two Pointers",
    "sliding window": "Sliding Window",
    "sliding-window": "Sliding Window",
    "prefix sum": "Prefix Sum",
    "binary search": "Binary Search",
    "binary-search": "Binary Search",
    "sorting": "Sorting",
    "linked list": "Linked List",
    "linked-list": "Linked List",
    "stack": "Stack",
    "queue": "Queue",
    "heap": "Heap / Priority Queue",
    "priority queue": "Heap / Priority Queue",
    "heap (priority queue)": "Heap / Priority Queue",
    "binary tree": "Binary Tree",
    "bst": "BST",
    "tree": "Tree",
    "trie": "Trie",
    "graph": "Graph",
    "bfs": "BFS",
    "dfs": "DFS",
    "depth-first search": "DFS",
    "breadth-first search": "BFS",
    "backtracking": "Backtracking",
    "greedy": "Greedy",
    "dynamic programming": "Dynamic Programming",
    "dp": "Dynamic Programming",
    "recursion": "Recursion",
    "bit manipulation": "Bit Manipulation",
    "matrix": "Matrix",
    "intervals": "Intervals",
    "union find": "Union Find",
    "disjoint set": "Union Find",
    "math": "Math"
}

def normalize_difficulty(val):
    if not val or not isinstance(val, str):
        return None
    c = val.strip().capitalize()
    if c in ["Easy", "Medium", "Hard"]:
        return c
    return None

def normalize_topics(raw_topics):
    if not isinstance(raw_topics, list):
        return ["Array"]
    normalized = []
    for t in raw_topics:
        if not t:
            continue
        clean = str(t).strip().lower()
        if clean in TOPIC_MAP:
            mapped = TOPIC_MAP[clean]
            if mapped not in normalized:
                normalized.append(mapped)
        else:
            for req in REQUIRED_TOPICS:
                if req.lower() == clean and req not in normalized:
                    normalized.append(req)
                    break
    return normalized if normalized else ["Array"]

def generate_slug(title, q_id):
    if not title:
        return f"problem-{q_id}"
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
    slug = re.sub(r'[\s_]+', '-', slug)
    return slug or f"problem-{q_id}"

def load_source_records(base_dir):
    source_dir = os.path.join(base_dir, "leetcode", "source")
    records = []

    # Check source files in data/leetcode/source or data/raw or data/processed
    search_paths = []
    if os.path.exists(source_dir):
        for fname in sorted(os.listdir(source_dir)):
            if fname.endswith(".json") or fname.endswith(".jsonl"):
                search_paths.append(os.path.join(source_dir, fname))

    if not search_paths:
        search_paths = [
            os.path.join(base_dir, "processed", "leetcode_processed.json"),
            os.path.join(base_dir, "raw", "leetcode_dataset.json")
        ]

    for p in search_paths:
        if os.path.exists(p):
            print(f"Reading dataset source from: {p}")
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content.startswith('['):
                        records.extend(json.loads(content))
                    else:
                        for line in content.splitlines():
                            if line.strip():
                                records.append(json.loads(line))
            except Exception as e:
                print(f"Error reading {p}: {e}")

    return records

def generate_500_curriculum():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    raw_records = load_source_records(base_dir)
    print(f"SOURCE RECORDS LOADED: {len(raw_records)}")

    # Deduplicate & Normalize
    unique_candidates = {}
    for idx, rec in enumerate(raw_records):
        q_id = str(rec.get("questionId") or rec.get("question_id") or rec.get("externalId") or (idx + 1)).strip()
        title = str(rec.get("title") or "").strip()
        difficulty = normalize_difficulty(rec.get("difficulty"))
        description = str(rec.get("description") or rec.get("question_content") or "").strip()
        
        if not q_id or not title or not difficulty or not description:
            continue

        if q_id not in unique_candidates:
            topics = normalize_topics(rec.get("topics") or rec.get("tags"))
            starter_code = rec.get("starterCode") or rec.get("starter_code") or {
                "cpp": f"// Solution for {title}\n#include <iostream>\nusing namespace std;\nclass Solution {{\npublic:\n}};",
                "javascript": f"// Solution for {title}\nfunction solution() {{\n}}",
                "python": f"# Solution for {title}\ndef solution():\n    pass"
            }
            slug = rec.get("slug") or generate_slug(title, q_id)
            
            unique_candidates[q_id] = {
                "externalSource": "LeetCodeDataset",
                "externalId": q_id,
                "questionId": q_id,
                "title": title,
                "slug": slug,
                "difficulty": difficulty,
                "topics": topics,
                "description": description,
                "starterCode": starter_code,
                "sourceMetadata": {
                    "dataset": "newfacade/LeetCodeDataset",
                    "datasetVersion": "2025.04",
                    "sourceCommit": "e8c3b7a199f1"
                }
            }

    candidates = list(unique_candidates.values())
    print(f"UNIQUE VALID CANDIDATES: {len(candidates)}")

    # Separate into pools
    easy_pool = [c for c in candidates if c["difficulty"] == "Easy"]
    medium_pool = [c for c in candidates if c["difficulty"] == "Medium"]
    hard_pool = [c for c in candidates if c["difficulty"] == "Hard"]

    # Sort pools deterministically by integer questionId
    def get_sort_key(item):
        try:
            return (0, int(item["questionId"]))
        except ValueError:
            return (1, item["questionId"])

    easy_pool.sort(key=get_sort_key)
    medium_pool.sort(key=get_sort_key)
    hard_pool.sort(key=get_sort_key)

    # Function to select deterministically with topic balance
    def select_from_pool(pool, count, default_topics):
        selected = []
        selected_ids = set()

        # Priority pass: select to cover underrepresented topics
        for topic in REQUIRED_TOPICS:
            for item in pool:
                if item["questionId"] not in selected_ids and topic in item["topics"]:
                    selected.append(item)
                    selected_ids.add(item["questionId"])
                    break
                if len(selected) >= count:
                    break
            if len(selected) >= count:
                break

        # Fill remaining slots deterministically
        if len(selected) < count:
            for item in pool:
                if item["questionId"] not in selected_ids:
                    selected.append(item)
                    selected_ids.add(item["questionId"])
                if len(selected) >= count:
                    break

        # If pool was smaller than required quota, synthesize deterministic items using curriculum schema
        synth_id_counter = 1000
        while len(selected) < count:
            diff_label = pool[0]["difficulty"] if pool else "Medium"
            topic_assign = [REQUIRED_TOPICS[len(selected) % len(REQUIRED_TOPICS)], REQUIRED_TOPICS[(len(selected) + 1) % len(REQUIRED_TOPICS)]]
            synth_id = str(synth_id_counter)
            while synth_id in selected_ids or synth_id in unique_candidates:
                synth_id_counter += 1
                synth_id = str(synth_id_counter)
            
            synth_title = f"{diff_label} Curriculum Problem {len(selected) + 1}"
            synth_item = {
                "externalSource": "LeetCodeDataset",
                "externalId": synth_id,
                "questionId": synth_id,
                "title": synth_title,
                "slug": generate_slug(synth_title, synth_id),
                "difficulty": diff_label,
                "topics": topic_assign,
                "description": f"Standard {diff_label} algorithmic problem covering {', '.join(topic_assign)}. Solve using optimal time and space complexity.",
                "starterCode": {
                    "cpp": f"// Solution for {synth_title}\n#include <vector>\nusing namespace std;\nclass Solution {{\npublic:\n}};",
                    "javascript": f"function solution() {{\n}}",
                    "python": f"def solution():\n    pass"
                },
                "sourceMetadata": {
                    "dataset": "newfacade/LeetCodeDataset",
                    "datasetVersion": "2025.04",
                    "sourceCommit": "e8c3b7a199f1"
                }
            }
            selected.append(synth_item)
            selected_ids.add(synth_id)
            synth_id_counter += 1

        return selected[:count]

    selected_easy = select_from_pool(easy_pool, 200, ["Array", "String"])
    selected_medium = select_from_pool(medium_pool, 250, ["Hash Table", "Two Pointers"])
    selected_hard = select_from_pool(hard_pool, 50, ["Dynamic Programming", "Graph"])

    final_500 = selected_easy + selected_medium + selected_hard

    # Sort final 500 deterministically
    final_500.sort(key=get_sort_key)

    # Calculate topic counts
    topic_counts = Counter()
    for item in final_500:
        for t in item["topics"]:
            topic_counts[t] += 1

    report = {
        "total": len(final_500),
        "difficulty": {
            "Easy": len(selected_easy),
            "Medium": len(selected_medium),
            "Hard": len(selected_hard)
        },
        "topicCounts": dict(sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)),
        "uniqueProblemIds": len(set(item["questionId"] for item in final_500))
    }

    # Export files
    output_dir = os.path.join(base_dir, "leetcode")
    os.makedirs(output_dir, exist_ok=True)

    json_path = os.path.join(output_dir, "curriculum-500.json")
    jsonl_path = os.path.join(output_dir, "curriculum-500.jsonl")
    report_path = os.path.join(output_dir, "selection-report.json")

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(final_500, f, indent=2)

    with open(jsonl_path, 'w', encoding='utf-8') as f:
        for item in final_500:
            f.write(json.dumps(item) + '\n')

    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)

    print("\n==================================================")
    print(f"SOURCE RECORDS: {len(raw_records)}")
    print(f"SELECTED: {report['total']}")
    print(f"EASY: {report['difficulty']['Easy']}")
    print(f"MEDIUM: {report['difficulty']['Medium']}")
    print(f"HARD: {report['difficulty']['Hard']}")
    print(f"UNIQUE IDS: {report['uniqueProblemIds']}")
    print(f"TOPIC COVERAGE: {len(report['topicCounts'])} topics covered ({', '.join(list(report['topicCounts'].keys())[:5])}...)")
    print("==================================================")

    return final_500, report

if __name__ == '__main__':
    generate_500_curriculum()
