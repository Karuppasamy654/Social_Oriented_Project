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

async function runZeroAttemptTests() {
  console.log('================================================================');
  console.log('🚀 CODING INTERVIEW EVALUATION — ZERO-ATTEMPT E2E TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const userData = {
    name: 'Zero Attempt User',
    username: `zero_user_${timestamp}`,
    email: `zero_user_${timestamp}@codebuddy.dev`,
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

  // 3. Finish session immediately WITHOUT making any attempts or code submissions
  console.log('\n3️⃣ Finishing Interview Session with ZERO attempts...');
  let finishReport = null;
  try {
    const finishRes = await axios.post(`${API_BASE}/interviews/session/finish`, {
      sessionId
    }, auth);

    finishReport = finishRes.data.report;
    assert(finishRes.status === 200, 'Session finished successfully with zero attempts');
  } catch (err) {
    assert(false, `Finish session failed: ${err.message}`);
  }

  // 4. Verify Report Data Contract for Zero Attempt
  console.log('\n4️⃣ Verifying Zero-Attempt Report Data Contract...');
  try {
    const reportRes = await axios.get(`${API_BASE}/interviews/report/${sessionId}`, auth);
    const report = reportRes.data.report;

    assert(report.scoreStatus === 'NOT_EVALUATED', 'Score status is NOT_EVALUATED');
    assert(report.scores.overall_score === null, 'Overall Technical Score is N/A (null)');
    assert(report.scores.sub_scores.technical_knowledge === null, 'Technical Knowledge sub-score is N/A (null)');
    assert(report.scores.sub_scores.problem_solving === null, 'Problem Solving sub-score is N/A (null)');
    assert(report.scores.sub_scores.coding === null, 'Coding Execution sub-score is N/A (null)');
    assert(report.scores.sub_scores.communication === 'Not Applicable', 'Communication score is "Not Applicable"');
    
    assert(Array.isArray(report.feedback.strengths) && report.feedback.strengths[0] === 'Insufficient evidence', 'Strengths returns ["Insufficient evidence"]');
    assert(Array.isArray(report.feedback.weaknesses) && report.feedback.weaknesses[0] === 'Insufficient evidence', 'Weaknesses returns ["Insufficient evidence"]');
    
    assert(report.evidenceSummary.questionsAttempted === 0, 'Evidence summary records 0 questions attempted');
    assert(report.evidenceSummary.questionsEvaluated === 0, 'Evidence summary records 0 questions evaluated');
    assert(report.evidenceSummary.codingSubmissions === 0, 'Evidence summary records 0 coding submissions');
    assert(report.mlPrediction.status === 'unavailable', 'ML prediction status is unavailable');
  } catch (err) {
    assert(false, `Report verification failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 ZERO-ATTEMPT E2E TEST COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runZeroAttemptTests();
