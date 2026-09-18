import os
import sys
import json
import urllib.request

HF_API_URL = "https://huggingface.co/api/datasets/newfacade/LeetCodeDataset/tree/main"
RAW_BASE_URL = "https://huggingface.co/datasets/newfacade/LeetCodeDataset/resolve/main/"
GITHUB_RAW_URL = "https://raw.githubusercontent.com/newfacade/LeetCodeDataset/main/"

def download_dataset():
    target_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "leetcode", "source")
    os.makedirs(target_dir, exist_ok=True)
    
    print(f"Checking Hugging Face dataset files for newfacade/LeetCodeDataset...")
    files_to_download = []
    
    try:
        req = urllib.request.Request(HF_API_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            tree_data = json.loads(response.read().decode('utf-8'))
            for item in tree_data:
                path_str = item.get("path", "")
                if path_str.endswith(".json") or path_str.endswith(".jsonl") or path_str.endswith(".parquet"):
                    files_to_download.append(path_str)
    except Exception as e:
        print(f"Warning: HF API tree fetch exception: {e}")

    if not files_to_download:
        # Fallback file names standard in dataset repo
        files_to_download = [
            "LeetCodeDataset.json", "LeetCodeDataset.jsonl", "data.json", 
            "data/LeetCodeDataset-train.jsonl", "data/LeetCodeDataset-test.jsonl",
            "leetcode_dataset.json", "train.jsonl", "test.jsonl"
        ]

    downloaded = []
    for rel_path in files_to_download:
        dest_path = os.path.join(target_dir, os.path.basename(rel_path))
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
            print(f"Found existing file: {dest_path} ({os.path.getsize(dest_path)} bytes)")
            downloaded.append(dest_path)
            continue
            
        # Try Hugging Face resolve URL
        url = RAW_BASE_URL + rel_path
        print(f"Attempting download from: {url}")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp, open(dest_path, 'wb') as out_f:
                out_f.write(resp.read())
            if os.path.getsize(dest_path) > 100:
                print(f"✅ Downloaded {dest_path} ({os.path.getsize(dest_path)} bytes)")
                downloaded.append(dest_path)
        except Exception as err:
            # Try GitHub raw URL as fallback
            gh_url = GITHUB_RAW_URL + rel_path
            try:
                req_gh = urllib.request.Request(gh_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req_gh) as resp, open(dest_path, 'wb') as out_f:
                    out_f.write(resp.read())
                if os.path.getsize(dest_path) > 100:
                    print(f"✅ Downloaded from GitHub {dest_path} ({os.path.getsize(dest_path)} bytes)")
                    downloaded.append(dest_path)
            except Exception as err_gh:
                if os.path.exists(dest_path):
                    os.remove(dest_path)

    print(f"Downloaded/Verified {len(downloaded)} raw dataset files into {target_dir}")
    return downloaded

if __name__ == "__main__":
    download_dataset()
