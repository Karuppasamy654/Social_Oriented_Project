const axios = require('./server/node_modules/axios');
const { generatePKCE } = require('./server/services/oauthService');

const API_BASE = process.env.API_BASE_URL || 'http://127.0.0.1:5000/api';

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

async function runPKCETests() {
  console.log('================================================================');
  console.log('🔑 GITHUB PKCE S256 (PROOF KEY FOR CODE EXCHANGE) AUDIT TEST');
  console.log('================================================================\n');

  // 1. PKCE Cryptographic Pair Generation Unit Test
  console.log('1️⃣ Testing PKCE S256 Pair Generator (Verifier & Challenge)...');
  try {
    const pkce = generatePKCE();
    assert(pkce.verifier && pkce.verifier.length >= 43, 'Verifier meets RFC 7636 minimum length requirement (>= 43 chars)');
    assert(pkce.challenge && pkce.challenge.length > 0, 'SHA-256 base64url code challenge generated');
    assert(!pkce.verifier.includes('+') && !pkce.verifier.includes('/'), 'Verifier uses URL-safe base64 encoding');
    assert(!pkce.challenge.includes('+') && !pkce.challenge.includes('/'), 'Challenge uses URL-safe base64 encoding');
  } catch (err) {
    assert(false, `PKCE generator test failed: ${err.message}`);
  }

  // 2. GitHub Auth Initiation PKCE Parameters Test
  console.log('\n2️⃣ Testing GitHub OAuth Initiation for PKCE S256 Parameters...');
  try {
    const res = await axios.get(`${API_BASE}/auth/github?format=json`);
    assert(res.data && res.data.url, 'GitHub authorization URL generated');
    assert(res.data.url.includes('code_challenge='), 'URL contains code_challenge parameter');
    assert(res.data.url.includes('code_challenge_method=S256'), 'URL specifies S256 code_challenge_method');
  } catch (err) {
    assert(false, `GitHub PKCE initiation failed: ${err.message}`);
  }

  // 3. Callback State Verification with PKCE Context
  console.log('\n3️⃣ Testing Callback Execution with Active PKCE State Context...');
  try {
    const initRes = await axios.get(`${API_BASE}/auth/github?format=json`);
    const state = initRes.data.state;
    const mockCode = `mock_github_code_pkce_${Date.now()}`;

    const callbackRes = await axios.get(`${API_BASE}/auth/github/callback?code=${mockCode}&state=${state}`);
    assert(callbackRes.data.token && callbackRes.data.user, 'Code exchange with bound PKCE verifier completed successfully');
  } catch (err) {
    assert(false, `PKCE callback execution test failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 PKCE AUDIT SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runPKCETests();
