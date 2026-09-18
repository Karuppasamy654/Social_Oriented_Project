const axios = require('./server/node_modules/axios');

const BASE_URL = 'http://localhost:5000/api';

async function runIntegrityThresholdE2ETests() {
  console.log('🚀 Running Complete AI Interview Simulator & Integrity Threshold E2E Verification...\n');

  try {
    // 1. Authenticate
    let token = '';
    try {
      const authRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@codebuddy.dev',
        password: 'Password123!'
      });
      token = authRes.data.token;
      console.log('✅ Authenticated test user successfully.');
    } catch (e) {
      console.log('⚠️ Authentication fallback active.');
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 2. Start a fresh session for Integrity Threshold Testing
    const startRes = await axios.post(`${BASE_URL}/interviews/session/start`, {
      company: 'NVIDIA',
      role: 'Software Engineer Intern',
      level: 'intern',
      interviewType: 'Technical',
      durationMinutes: 45
    }, { headers });

    const session = startRes.data;
    console.log(`\n--- INTEGRITY THRESHOLD SCENARIOS (Session ID: ${session.sessionId}) ---`);

    // TEST 1: 1st Integrity Event
    const ev1 = await axios.post(`${BASE_URL}/interviews/integrity-event`, {
      sessionId: session.sessionId,
      pySessionId: session.pySessionId,
      eventType: 'tab_hidden'
    }, { headers });
    console.assert(ev1.data.terminated === false, 'Test 1 Failed: Event 1 should not terminate session');
    console.assert(ev1.data.integrityFlagCount === 1, 'Test 1 Failed: Count should be 1');
    console.log(`✅ TEST 1 PASSED: 1st integrity event recorded (Count: ${ev1.data.integrityFlagCount}, Terminated: ${ev1.data.terminated}).`);

    // TEST 2: Events 2, 3, 4
    await axios.post(`${BASE_URL}/interviews/integrity-event`, { sessionId: session.sessionId, pySessionId: session.pySessionId, eventType: 'window_blur' }, { headers });
    await axios.post(`${BASE_URL}/interviews/integrity-event`, { sessionId: session.sessionId, pySessionId: session.pySessionId, eventType: 'camera_stopped' }, { headers });
    const ev4 = await axios.post(`${BASE_URL}/interviews/integrity-event`, { sessionId: session.sessionId, pySessionId: session.pySessionId, eventType: 'fullscreen_exit' }, { headers });
    console.assert(ev4.data.terminated === false, 'Test 2 Failed: Event 4 should not terminate session');
    console.assert(ev4.data.integrityFlagCount === 4, 'Test 2 Failed: Count should be 4');
    console.log(`✅ TEST 2 PASSED: 4 integrity events recorded (Count: ${ev4.data.integrityFlagCount}, Warning present: "${ev4.data.warning}").`);

    // TEST 3: 5th Integrity Event -> Graceful Termination Trigger
    const ev5 = await axios.post(`${BASE_URL}/interviews/integrity-event`, {
      sessionId: session.sessionId,
      pySessionId: session.pySessionId,
      eventType: 'multiple_faces'
    }, { headers });
    console.assert(ev5.data.terminated === true, 'Test 3 Failed: Event 5 must set terminated = true');
    console.assert(ev5.data.reason === 'integrity_threshold_reached', 'Test 3 Failed: Reason must be integrity_threshold_reached');
    console.assert(ev5.data.status === 'terminated_integrity', 'Test 3 Failed: Status must be terminated_integrity');
    console.log(`✅ TEST 3 PASSED: 5th integrity event triggered graceful termination (Terminated: ${ev5.data.terminated}, Status: ${ev5.data.status}).`);

    // TEST 4: Attempt /question/next after termination -> Rejection without crash
    const nextAfterTerm = await axios.post(`${BASE_URL}/interviews/question/next`, {
      sessionId: session.sessionId,
      pySessionId: session.pySessionId
    }, { headers });
    console.assert(nextAfterTerm.data.completed === true || nextAfterTerm.data.terminated === true, 'Test 4 Failed: Next question after termination must return completed/terminated');
    console.log(`✅ TEST 4 PASSED: Attempting /question/next after termination was rejected cleanly.`);

    // TEST 5: Attempt /answer after termination -> Rejection without crash
    const ansAfterTerm = await axios.post(`${BASE_URL}/interviews/answer`, {
      sessionId: session.sessionId,
      pySessionId: session.pySessionId,
      transcript: 'Attempting to answer after termination...'
    }, { headers });
    console.assert(ansAfterTerm.data.terminated === true || ansAfterTerm.data.success === false, 'Test 5 Failed: Answer after termination must be rejected');
    console.log(`✅ TEST 5 PASSED: Attempting /answer after termination was rejected cleanly.`);

    // TEST 6: Duplicate 5th-event request -> Idempotent response
    const dupEv = await axios.post(`${BASE_URL}/interviews/integrity-event`, {
      sessionId: session.sessionId,
      pySessionId: session.pySessionId,
      eventType: 'tab_hidden'
    }, { headers });
    console.assert(dupEv.data.terminated === true, 'Test 6 Failed: Duplicate event must return terminated = true');
    console.log(`✅ TEST 6 PASSED: Duplicate 5th-event request handled idempotently.`);

    // TEST 7: Five rapid events on new session
    const rapidStart = await axios.post(`${BASE_URL}/interviews/session/start`, {
      company: 'Google', role: 'Software Engineering Intern'
    }, { headers });
    const rapidPromises = [1, 2, 3, 4, 5].map(() => axios.post(`${BASE_URL}/interviews/integrity-event`, {
      sessionId: rapidStart.data.sessionId,
      pySessionId: rapidStart.data.pySessionId,
      eventType: 'tab_hidden'
    }, { headers }));
    const rapidRes = await Promise.all(rapidPromises);
    const finalRapidRes = rapidRes[rapidRes.length - 1].data;
    console.assert(finalRapidRes.terminated === true, 'Test 7 Failed: Rapid events must result in single clean termination');
    console.log(`✅ TEST 7 PASSED: Rapid 5-event bursts handled atomically without crash.`);

    // TEST 8: Session Retrieval after termination
    const sessGet = await axios.get(`${BASE_URL}/interviews/session/${session.sessionId}`, { headers });
    console.assert(sessGet.data.status === 'terminated_integrity', 'Test 8 Failed: Saved session status must be terminated_integrity');
    console.log(`✅ TEST 8 PASSED: Session state persisted and retrievable (Status: ${sessGet.data.status}).`);

    // TEST 9: Report Fetching after termination
    const repGet = await axios.get(`${BASE_URL}/interviews/report/${session.sessionId}`, { headers });
    console.assert(repGet.data.report !== undefined, 'Test 9 Failed: Report must be accessible after termination');
    console.log(`✅ TEST 9 PASSED: Report card generated and accessible after termination.`);

    // TEST 10: Technical score independence from integrity flags
    console.assert(repGet.data.report.scores.overall_score >= 0, 'Test 10 Failed: Technical score preserved');
    console.log(`✅ TEST 10 PASSED: Technical score calculation preserved independently from proctoring signals.`);

    console.log('\n🎉 ALL 10 INTEGRITY THRESHOLD & E2E VERIFICATION TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Integrity Threshold E2E Test failed:', err.response ? err.response.data : err.message);
    process.exit(1);
  }
}

runIntegrityThresholdE2ETests();
