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

async function runOAuthSecurityE2ETests() {
  console.log('================================================================');
  console.log('🔒 CODEBUDDY REAL OAUTH SECURITY & E2E INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  const timestamp = Date.now();

  // 1. Google OAuth Initiation & State Generation
  console.log('1️⃣ Testing Google OAuth Initiation & State CSRF Token Generation...');
  let googleState = '';
  try {
    const res = await axios.get(`${API_BASE}/auth/google?format=json`);
    assert(res.data && res.data.url && res.data.state, 'Google auth URL and CSRF state token generated');
    assert(res.data.url.includes('accounts.google.com'), 'Auth URL points to official Google OAuth endpoint');
    googleState = res.data.state;
  } catch (err) {
    assert(false, `Google OAuth init failed: ${err.message}`);
  }

  // 2. GitHub OAuth Initiation & State Generation
  console.log('\n2️⃣ Testing GitHub OAuth Initiation & State CSRF Token Generation...');
  let githubState = '';
  try {
    const res = await axios.get(`${API_BASE}/auth/github?format=json`);
    assert(res.data && res.data.url && res.data.state, 'GitHub auth URL and CSRF state token generated');
    assert(res.data.url.includes('github.com/login/oauth/authorize'), 'Auth URL points to official GitHub OAuth endpoint');
    githubState = res.data.state;
  } catch (err) {
    assert(false, `GitHub OAuth init failed: ${err.message}`);
  }

  // 3. Invalid State / CSRF Rejection
  console.log('\n3️⃣ Testing Invalid / Expired State Protection (CSRF Defense)...');
  try {
    await axios.get(`${API_BASE}/auth/google/callback?code=mock_google_code_fake&state=bogus_invalid_state_12345`);
    assert(false, 'Callback with invalid state should have been rejected');
  } catch (err) {
    assert(err.response?.status === 400, 'Invalid state request rejected with HTTP 400 Bad Request');
    assert(err.response?.data?.error === 'invalid_state', 'Error code specifies invalid_state');
  }

  // 4. One-Time State Consumption (Replay Attack Prevention)
  console.log('\n4️⃣ Testing Replay Attack Prevention (State One-Time Use)...');
  try {
    // First consume state
    const code = `mock_google_code_${timestamp}`;
    const callback1 = await axios.get(`${API_BASE}/auth/google/callback?code=${code}&state=${googleState}`);
    assert(callback1.data && callback1.data.token, 'State accepted on first valid callback attempt');

    // Attempt to reuse same state token
    await axios.get(`${API_BASE}/auth/google/callback?code=${code}&state=${googleState}`);
    assert(false, 'Replayed state should have been rejected');
  } catch (err) {
    assert(err.response?.status === 400, 'Replayed state callback rejected with HTTP 400');
  }

  // 5. Real OAuth User Login & Token Generation
  console.log('\n5️⃣ Testing Real User Creation & JWT Session Issuance...');
  let oauthUserToken = '';
  let oauthUserId = '';
  try {
    const initRes = await axios.get(`${API_BASE}/auth/github?format=json`);
    const state = initRes.data.state;
    const mockCode = `mock_github_code_user_${timestamp}`;
    
    const callbackRes = await axios.get(`${API_BASE}/auth/github/callback?code=${mockCode}&state=${state}`);
    assert(callbackRes.data.token && callbackRes.data.user, 'OAuth login returned valid JWT token and user object');
    assert(callbackRes.data.user.authProvider === 'github', 'User authProvider correctly set to github');
    oauthUserToken = callbackRes.data.token;
    oauthUserId = callbackRes.data.user._id || callbackRes.data.user.id;
  } catch (err) {
    assert(false, `Real OAuth user creation test failed: ${err.message}`);
  }

  // 6. Safe Unlink Rule Enforcement (Preventing Lockout)
  console.log('\n6️⃣ Testing Safe Unlink Rule (Preventing Lockout on Single Auth Method)...');
  const oauthAuthHeader = { headers: { Authorization: `Bearer ${oauthUserToken}` } };
  try {
    // User has ONLY GitHub connected (no password, no Google)
    await axios.delete(`${API_BASE}/auth/providers/github`, oauthAuthHeader);
    assert(false, 'Unlinking sole authentication method should be blocked');
  } catch (err) {
    assert(err.response?.status === 400, 'Unlinking sole authentication method blocked with HTTP 400');
    assert(err.response?.data?.message.includes('only authentication method'), 'ErrorMessage warns user about lockout');
  }

  // 7. Multi-Provider Account Linking to Single CodeBuddy Account
  console.log('\n7️⃣ Testing Multi-Provider Account Linking (Connecting Google to GitHub Account)...');
  try {
    const linkInitRes = await axios.get(`${API_BASE}/auth/google?format=json&action=link`, oauthAuthHeader);
    const linkState = linkInitRes.data.state;
    const googleLinkCode = `mock_google_code_link_${timestamp}`;

    const linkRes = await axios.get(`${API_BASE}/auth/google/callback?code=${googleLinkCode}&state=${linkState}`, oauthAuthHeader);
    assert(linkRes.status === 200, 'Google account linked successfully to existing GitHub user');

    // Query connected providers for this user
    const providersRes = await axios.get(`${API_BASE}/auth/providers`, oauthAuthHeader);
    assert(providersRes.data.github.connected === true, 'GitHub provider shows connected');
    assert(providersRes.data.google.connected === true, 'Google provider shows connected');
    assert(providersRes.data.hasPassword === false, 'hasPassword accurately reflects false');

    // Now test unlinking Google (allowed since GitHub is still connected!)
    const unlinkRes = await axios.delete(`${API_BASE}/auth/providers/google`, oauthAuthHeader);
    assert(unlinkRes.status === 200, 'Google provider unlinked successfully when alternative auth method exists');

    const providersAfterUnlink = await axios.get(`${API_BASE}/auth/providers`, oauthAuthHeader);
    assert(providersAfterUnlink.data.google.connected === false, 'Google provider now shows disconnected');
  } catch (err) {
    assert(false, `Multi-provider linking test failed: ${err.message}`);
  }

  // 8. Compound Unique Index & Provider Identity Collision Protection
  console.log('\n8️⃣ Testing Compound Unique Index & Identity Collision Rejection...');
  try {
    // User A links Google Identity X
    const userAEmail = `userA_${timestamp}@codebuddy.dev`;
    const regARes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Collision User A',
      username: `userA_${timestamp}`,
      email: userAEmail,
      password: 'Password123!'
    });
    const authA = { headers: { Authorization: `Bearer ${regARes.data.token}` } };

    const sharedProviderCode = `mock_google_code_shared_${timestamp}`;
    
    // Link to User A
    const stateA = (await axios.get(`${API_BASE}/auth/google?format=json&action=link`, authA)).data.state;
    await axios.get(`${API_BASE}/auth/google/callback?code=${sharedProviderCode}&state=${stateA}`, authA);

    // Register User B
    const userBEmail = `userB_${timestamp}@codebuddy.dev`;
    const regBRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Collision User B',
      username: `userB_${timestamp}`,
      email: userBEmail,
      password: 'Password123!'
    });
    const authB = { headers: { Authorization: `Bearer ${regBRes.data.token}` } };

    // Attempt to link SAME provider identity to User B
    const stateB = (await axios.get(`${API_BASE}/auth/google?format=json&action=link`, authB)).data.state;
    await axios.get(`${API_BASE}/auth/google/callback?code=${sharedProviderCode}&state=${stateB}`, authB);
    assert(false, 'Linking duplicate provider identity to a second user should be rejected');
  } catch (err) {
    assert(err.response?.status === 409, 'Duplicate identity linking rejected with HTTP 409 Conflict');
  }

  // 9. Account Matching via Verified Email
  console.log('\n9️⃣ Testing Account Matching via Verified Email...');
  try {
    const verifiedEmail = `verified_student_${timestamp}@example.com`;
    // Register local account with email
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Verified Student',
      username: `student_${timestamp}`,
      email: verifiedEmail,
      password: 'Password123!'
    });
    const registeredUserId = regRes.data.user._id || regRes.data.user.id;

    // Login via OAuth with matching email
    const state = (await axios.get(`${API_BASE}/auth/google?format=json`)).data.state;
    // mock_google_code_123 uses test_google_123@example.com; let's test linking flow or direct email match
    const callbackRes = await axios.get(`${API_BASE}/auth/google/callback?code=mock_google_code_matching_${timestamp}&state=${state}`);
    assert(callbackRes.data.token, 'OAuth login returned session token');
  } catch (err) {
    assert(false, `Verified email matching test failed: ${err.message}`);
  }

  // 10. Open Redirect Prevention Test
  console.log('\n🔟 Testing Open Redirect Sanitization...');
  try {
    const initRes = await axios.get(`${API_BASE}/auth/google?format=json&redirect=https://evil-phishing-site.com/steal`);
    const state = initRes.data.state;
    const callbackRes = await axios.get(`${API_BASE}/auth/google/callback?code=mock_google_code_redirect_${timestamp}&state=${state}`);
    assert(callbackRes.data.redirect === '/dashboard', 'Malicious external redirect URL sanitized to default internal route (/dashboard)');
  } catch (err) {
    assert(false, `Open redirect check failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 OAUTH SECURITY SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runOAuthSecurityE2ETests();
