import os
import sys
import urllib.request
import zipfile
import io
import shutil

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

REPO_ZIP_URL = "https://github.com/snehasishroy/leetcode-companywise-interview-questions/archive/refs/heads/master.zip"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(BASE_DIR, "company", "raw")
TEMP_EXTRACT = os.path.join(BASE_DIR, "company", "raw_temp")

def download_and_extract():
    os.makedirs(RAW_DIR, exist_ok=True)
    
    # Check if raw extracted files exist in RAW_DIR or in RAW_DIR/leetcode-companywise-interview-questions-master
    existing = [f for f in os.listdir(RAW_DIR) if os.path.isdir(os.path.join(RAW_DIR, f))]
    if len(existing) >= 15 or (len(existing) == 1 and 'leetcode-companywise' in existing[0]):
        print(f"Company dataset already present in {RAW_DIR}. Skipping download.")
        return True

    print(f"Downloading company-wise dataset zip archive from: {REPO_ZIP_URL}")
    try:
        req = urllib.request.Request(
            REPO_ZIP_URL,
            headers={'User-Agent': 'Mozilla/5.0 (CodeBuddy Data Pipeline)'}
        )
        with urllib.request.urlopen(req) as response:
            zip_bytes = response.read()
        
        print(f"Downloaded {len(zip_bytes) / (1024*1024):.2f} MB. Extracting archive...")
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            z.extractall(TEMP_EXTRACT)
            
        extracted_root = os.path.join(TEMP_EXTRACT, "leetcode-companywise-interview-questions-master")
        if not os.path.exists(extracted_root):
            subdirs = os.listdir(TEMP_EXTRACT)
            if subdirs:
                extracted_root = os.path.join(TEMP_EXTRACT, subdirs[0])

        print(f"Moving company folders to {RAW_DIR}...")
        for item in os.listdir(extracted_root):
            src_item = os.path.join(extracted_root, item)
            dst_item = os.path.join(RAW_DIR, item)
            if os.path.isdir(src_item):
                if os.path.exists(dst_item):
                    shutil.rmtree(dst_item)
                shutil.copytree(src_item, dst_item)

        shutil.rmtree(TEMP_EXTRACT, ignore_errors=True)
        print(f"Company dataset downloaded and extracted successfully to {RAW_DIR}")
        return True
    except Exception as e:
        print(f"Error downloading company dataset: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = download_and_extract()
    sys.exit(0 if success else 1)
