const fs = require('fs');
const path = require('path');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failedTests++;
  }
}

function scanDirectory(dirPath, fileExts = ['.js', '.jsx', '.html', '.css', '.json']) {
  let filesList = [];
  if (!fs.existsSync(dirPath)) return filesList;

  const items = fs.readdirSync(dirPath);
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.git') {
        filesList = filesList.concat(scanDirectory(fullPath, fileExts));
      }
    } else if (fileExts.includes(path.extname(fullPath))) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

function runTokenExposureAudit() {
  console.log('================================================================');
  console.log('🔎 OAUTH SECRET LEAK & BUILT-ARTIFACT SCANNER AUDIT TEST');
  console.log('================================================================\n');

  const rootDir = path.resolve(__dirname);
  const clientSrcDir = path.join(rootDir, 'client', 'src');
  const clientDistDir = path.join(rootDir, 'client', 'dist');

  // 1. Scan Frontend Source Code for Hardcoded Secrets
  console.log('1️⃣ Scanning Frontend Source Files (client/src)...');
  const clientFiles = scanDirectory(clientSrcDir);
  let foundSecretInClient = false;
  let secretDetails = '';

  const sensitivePattern = /GOOGLE_CLIENT_SECRET|GITHUB_CLIENT_SECRET|client_secret\s*=\s*['"][a-zA-Z0-9_\-]+['"]/i;

  for (const file of clientFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (sensitivePattern.test(content)) {
      foundSecretInClient = true;
      secretDetails = `Found potential secret in ${file}`;
      break;
    }
  }

  assert(!foundSecretInClient, 'No GOOGLE_CLIENT_SECRET or GITHUB_CLIENT_SECRET in frontend source code (client/src)');

  // 2. Scan Built Assets (client/dist) if present
  console.log('\n2️⃣ Scanning Built Distribution Bundles (client/dist)...');
  const distFiles = scanDirectory(clientDistDir);
  let foundSecretInDist = false;

  for (const file of distFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (sensitivePattern.test(content)) {
      foundSecretInDist = true;
      break;
    }
  }

  assert(!foundSecretInDist, 'No client secret or backend API secret exposed in client distribution bundle (client/dist)');

  // 3. Verify Sanitizer Utility Logic
  console.log('\n3️⃣ Testing Audit Log Sanitizer Utility...');
  const { sanitizeMetadata } = require('./server/services/auditLogger');
  const dirtyMeta = {
    client_secret: 'super_secret_123',
    access_token: 'gho_1234567890abcdef',
    refresh_token: 'rfr_999999',
    provider: 'github',
    userId: 'user123'
  };

  const cleanMeta = sanitizeMetadata(dirtyMeta);
  assert(!cleanMeta.client_secret, 'client_secret stripped from audit log metadata');
  assert(!cleanMeta.access_token, 'access_token stripped from audit log metadata');
  assert(!cleanMeta.refresh_token, 'refresh_token stripped from audit log metadata');
  assert(cleanMeta.provider === 'github' && cleanMeta.userId === 'user123', 'Safe metadata properties (provider, userId) preserved');

  console.log('\n================================================================');
  console.log(`🎉 SECRET EXPOSURE AUDIT COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runTokenExposureAudit();
