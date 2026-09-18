const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '../leetcode/source');
fs.mkdirSync(targetDir, { recursive: true });

const candidateUrls = [
  'https://raw.githubusercontent.com/newfacade/LeetCodeDataset/main/LeetCodeDataset.json',
  'https://raw.githubusercontent.com/newfacade/LeetCodeDataset/main/data/LeetCodeDataset.json',
  'https://raw.githubusercontent.com/newfacade/LeetCodeDataset/main/leetcode.json',
  'https://huggingface.co/datasets/newfacade/LeetCodeDataset/raw/main/LeetCodeDataset.json',
  'https://huggingface.co/datasets/newfacade/LeetCodeDataset/resolve/main/LeetCodeDataset.json'
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        fs.unlink(dest, () => {});
        return reject(new Error(`HTTP status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(dest));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function runDownload() {
  console.log('Fetching raw newfacade/LeetCodeDataset dataset...');
  let downloadedCount = 0;
  for (let i = 0; i < candidateUrls.length; i++) {
    const url = candidateUrls[i];
    const filename = `raw_dataset_${i + 1}.json`;
    const dest = path.join(targetDir, filename);
    try {
      await downloadFile(url, dest);
      const stat = fs.statSync(dest);
      if (stat.size > 1000) {
        console.log(`✅ Downloaded ${url} (${stat.size} bytes) -> ${filename}`);
        downloadedCount++;
      }
    } catch (err) {
      // ignore 404s
    }
  }
  console.log(`Downloaded ${downloadedCount} source dataset files.`);
}

if (require.main === module) {
  runDownload();
}
