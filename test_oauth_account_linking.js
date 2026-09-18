const axios = require('./server/node_modules/axios');

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

async function runAccountLinkingTests() {
  console.log('================================================================');
  console.log('🔗 OAUTH ACCOUNT LINKING & UNLINKING AUDIT SUITE');
  console.log('================================================================\n');

  const timestamp = Date.now();

  // 1. Password Registration and Google Account Linking
  console.log('1️⃣ Testing Password Account Creation and Linking Google Provider...');
  let userToken = '';
  try {
    const email = `link_user_${timestamp}@codebuddy.dev`;
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Link User',
      username: `link_user_${timestamp}`,
      email,
      password: 'Password123!'
    });
    userToken = regRes.data.token;
    assert(userToken, 'User registered with local email + password credential');

    const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };
    const linkInit = await axios.get(`${API_BASE}/auth/google?format=json&action=link`, authHeader);
    const linkState = linkInit.data.state;

    const mockCode = `mock_google_code_link_user_${timestamp}`;
    const callbackRes = await axios.get(`${API_BASE}/auth/google/callback?code=${mockCode}&state=${linkState}`, authHeader);
    assert(callbackRes.status === 200, 'Google provider successfully linked to existing password user');

    const providers = await axios.get(`${API_BASE}/auth/providers`, authHeader);
    assert(providers.data.google.connected === true, 'Google provider status shows connected');
    assert(providers.data.hasPassword === true, 'hasPassword status shows true');
  } catch (err) {
    assert(false, `Password account linking test failed: ${err.message}`);
  }

  // 2. Connecting Second Provider (GitHub) to Same Account
  console.log('\n2️⃣ Testing Connecting Second Provider (GitHub) to Same CodeBuddy Account...');
  const authHeader = { headers: { Authorization: `Bearer ${userToken}` } };
  try {
    const linkInit = await axios.get(`${API_BASE}/auth/github?format=json&action=link`, authHeader);
    const linkState = linkInit.data.state;

    const mockCode = `mock_github_code_link_user_${timestamp}`;
    const callbackRes = await axios.get(`${API_BASE}/auth/github/callback?code=${mockCode}&state=${linkState}`, authHeader);
    assert(callbackRes.status === 200, 'GitHub provider successfully linked to user account');

    const providers = await axios.get(`${API_BASE}/auth/providers`, authHeader);
    assert(providers.data.google.connected === true, 'Google provider connected');
    assert(providers.data.github.connected === true, 'GitHub provider connected');
    assert(providers.data.hasPassword === true, 'Password credential enabled');
  } catch (err) {
    assert(false, `Multi-provider linking failed: ${err.message}`);
  }

  // 3. Unlinking Provider When Password Credential Remains
  console.log('\n3️⃣ Testing Unlinking Google Provider when Password & GitHub Remain...');
  try {
    const unlinkRes = await axios.delete(`${API_BASE}/auth/providers/google`, authHeader);
    assert(unlinkRes.status === 200, 'Unlinking Google provider allowed because GitHub and password remain active');

    const providers = await axios.get(`${API_BASE}/auth/providers`, authHeader);
    assert(providers.data.google.connected === false, 'Google provider status correctly updated to disconnected');
  } catch (err) {
    assert(false, `Unlink provider test failed: ${err.message}`);
  }

  // 4. Collision Rejection on Attempting to Bind Same Provider ID to Another Account
  console.log('\n4️⃣ Testing Collision Prevention on Rebinding Linked Identity...');
  try {
    // Register User B
    const userBRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'User B Collision Test',
      username: `userB_collision_${timestamp}`,
      email: `userB_collision_${timestamp}@codebuddy.dev`,
      password: 'Password123!'
    });
    const authHeaderB = { headers: { Authorization: `Bearer ${userBRes.data.token}` } };

    // Try to link the GitHub identity already linked to User A
    const linkInitB = await axios.get(`${API_BASE}/auth/github?format=json&action=link`, authHeaderB);
    const linkStateB = linkInitB.data.state;
    const sameCode = `mock_github_code_link_user_${timestamp}`;

    await axios.get(`${API_BASE}/auth/github/callback?code=${sameCode}&state=${linkStateB}`, authHeaderB);
    assert(false, 'Duplicate identity binding should be rejected');
  } catch (err) {
    assert(err.response?.status === 409, 'Duplicate provider identity binding rejected with HTTP 409 Conflict');
  }

  console.log('\n================================================================');
  console.log(`🎉 ACCOUNT LINKING SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runAccountLinkingTests();
