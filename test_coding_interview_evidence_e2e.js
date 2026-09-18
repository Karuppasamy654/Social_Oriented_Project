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

async function runEvidenceTests() {
  console.log('================================================================');
  console.log('🚀 CODING INTERVIEW EVALUATION — EVIDENCE-BASED E2E TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const userData = {
    name: 'Evidence User',
    username: `ev_user_${timestamp}`,
    email: `ev_user_${timestamp}@codebuddy.dev`,
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

  // 3. Submit real code for Question 1
  console.log('\n3️⃣ Submitting Accepted solution for Question 1...');
  try {
    const validCppCode = `#include <iostream>\nusing namespace std;\nint main() { cout << "6" << endl; return 0; }`;
    const ansRes = await axios.post(`${API_BASE}/interviews/answer`, {
      sessionId,
      userCode: validCppCode,
      durationSeconds: 120
    }, auth);

    assert(ansRes.status === 200, 'Code submission evaluated successfully');
  } catch (err) {
    assert(false, `Code submission failed: ${err.message}`);
  }

  // 4. Verify Provisional Evaluation Report (1 evaluated attempt)
  console.log('\n4️⃣ Verifying Provisional Evaluation Report...');
  try {
    const finishRes = await axios.post(`${API_BASE}/interviews/session/finish`, { sessionId }, auth);
    const report = finishRes.data.report;

    assert(report.scoreStatus === 'PROVISIONAL', 'Report scoreStatus is PROVISIONAL for 1 attempt');
    assert(typeof report.scores.overall_score === 'number', 'Overall Technical Score is calculated from actual submission');
    assert(typeof report.scores.sub_scores.coding === 'number', 'Coding Execution sub-score is calculated');
    assert(report.scores.sub_scores.communication === 'Not Applicable', 'Communication score remains "Not Applicable"');
    assert(report.evidenceSummary.questionsEvaluated === 1, 'Evidence summary records 1 evaluated question');
    const strengths = report.feedback?.strengths || report.strengths || [];
    const weaknesses = report.feedback?.weaknesses || report.weaknesses || [];
    const hasGroundedEvidence = (strengths.length > 0 && strengths[0] !== 'Insufficient evidence') ||
                               (weaknesses.length > 0 && weaknesses[0] !== 'Insufficient evidence');
    assert(hasGroundedEvidence, 'Grounded technical feedback generated for code submission');
  } catch (err) {
    assert(false, `Provisional report verification failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 EVIDENCE-BASED E2E TEST COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runEvidenceTests();
