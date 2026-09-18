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

async function runIntegrityTests() {
  console.log('================================================================');
  console.log('🚀 CODING INTERVIEW EVALUATION — INTEGRITY SEPARATION E2E TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const userData = {
    name: 'Integrity User',
    username: `integ_user_${timestamp}`,
    email: `integ_user_${timestamp}@codebuddy.dev`,
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

  // 3. Log 5 integrity flags without attempting any question
  console.log('\n3️⃣ Logging 5 proctoring integrity flags without question attempts...');
  try {
    for (let i = 1; i <= 5; i++) {
      await axios.post(`${API_BASE}/interviews/integrity-event`, {
        sessionId,
        eventType: 'tab_hidden'
      }, auth);
    }
    assert(true, '5 integrity events logged');
  } catch (err) {
    assert(false, `Logging integrity events failed: ${err.message}`);
  }

  // 4. Verify Technical Score remains N/A (NOT_EVALUATED) despite integrity termination
  console.log('\n4️⃣ Verifying Technical Score remains N/A and separate from integrity signals...');
  try {
    const reportRes = await axios.get(`${API_BASE}/interviews/report/${sessionId}`, auth);
    const report = reportRes.data.report;

    assert(report.scoreStatus === 'NOT_EVALUATED', 'Score status is NOT_EVALUATED for 0 attempts');
    assert(report.scores.overall_score === null, 'Overall Technical Score remains N/A (null) and not penalized into fake number');
    assert(report.proctoring_report.status === 'Integrity Threshold Reached', 'Proctoring report records Integrity Threshold Reached separately');
    assert(report.scores.sub_scores.communication === 'Not Applicable', 'Communication score is "Not Applicable"');
  } catch (err) {
    assert(false, `Integrity report verification failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 INTEGRITY SEPARATION E2E TEST COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runIntegrityTests();
