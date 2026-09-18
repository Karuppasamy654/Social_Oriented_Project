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

async function runAdaptationTests() {
  console.log('================================================================');
  console.log('🚀 CODING INTERVIEW EVALUATION — ADAPTATION E2E TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const userData = {
    name: 'Adaptation User',
    username: `adapt_user_${timestamp}`,
    email: `adapt_user_${timestamp}@codebuddy.dev`,
    password: 'Password123!'
  };

  let token = '';
  let userId = '';

  // 1. Register test user
  console.log('1️⃣ Registering test user...');
  try {
    const reg = await axios.post(`${API_BASE}/auth/register`, userData);
    token = reg.data.token;
    userId = (reg.data.user._id || reg.data.user.id).toString();
    assert(token && userId, 'Test user registered successfully');
  } catch (err) {
    console.error('Registration failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  // 2. Start Coding Interview
  console.log('\n2️⃣ Starting Coding Interview Session...');
  let sessionId = '';
  try {
    const startRes = await axios.post(`${API_BASE}/interviews/session/start`, {
      company: 'NVIDIA',
      role: 'Software Engineer Intern',
      level: 'intern',
      interviewType: 'Coding',
      durationMinutes: 45
    }, auth);

    sessionId = startRes.data.sessionId || startRes.data.session?._id;
    assert(Boolean(sessionId), 'Coding Interview session started successfully');
  } catch (err) {
    assert(false, `Session start failed: ${err.message}`);
  }

  // 3. Submit code for Question 1
  console.log('\n3️⃣ Submitting solution for Question 1...');
  try {
    await axios.post(`${API_BASE}/interviews/answer`, {
      sessionId,
      userCode: '#include <iostream>\nint main() { return 0; }',
      durationSeconds: 90
    }, auth);

    assert(true, 'Answer submitted for Q1');
  } catch (err) {
    assert(false, `Answer Q1 failed: ${err.message}`);
  }

  // 4. Fetch Next Adaptive Question (Q2)
  console.log('\n4️⃣ Fetching Next Adaptive Question (Q2)...');
  try {
    const nextRes = await axios.post(`${API_BASE}/interviews/question/next`, { sessionId }, auth);
    assert(nextRes.data.completed === false, 'Adaptive engine returns Q2');
    assert(Boolean(nextRes.data.nextQuestion), 'Next adaptive question retrieved successfully');
  } catch (err) {
    assert(false, `Fetch Q2 failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 ADAPTATION E2E TEST COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runAdaptationTests();
