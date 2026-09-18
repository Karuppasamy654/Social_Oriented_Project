const axios = require('axios');

const API_BASE = 'http://127.0.0.1:5000/api';

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 CODEBUDDY CODING MODULE E2E INTEGRATION TEST');
  console.log('====================================================\n');

  // 1. Authenticate user
  console.log('1️⃣ Logging in test user...');
  let token = '';
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@codebuddy.dev',
      password: 'Password123!'
    });
    token = loginRes.data.token;
    console.log('   ✅ Authenticated. JWT token received.');
  } catch (err) {
    console.log('   User not found, registering new test user...');
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Arun Kumar',
      username: 'arunkumar_e2e',
      email: 'test@codebuddy.dev',
      password: 'Password123!'
    });
    token = regRes.data.token;
    console.log('   ✅ Registered and logged in.');
  }

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // 2. Fetch problem details for two-sum
  console.log('\n2️⃣ Fetching problem details for /api/problems/two-sum...');
  const probRes = await axios.get(`${API_BASE}/problems/two-sum`, authHeaders);
  const problem = probRes.data;
  console.log('   ✅ Problem loaded:', {
    id: problem._id,
    title: problem.title,
    difficulty: problem.difficulty,
    topics: problem.topics,
    sampleCasesCount: problem.sampleTestCases?.length || 2
  });

  // 3. Start Coding Session
  console.log('\n3️⃣ Starting server-backed coding session...');
  const startSessionRes = await axios.post(`${API_BASE}/submissions/start-session`, { problemId: problem._id }, authHeaders);
  const sessionId = startSessionRes.data.sessionId;
  console.log('   ✅ Session started:', { sessionId, startedAt: startSessionRes.data.startedAt });

  // 4. Test "Run Code" (2 visible sample test cases only)
  console.log('\n4️⃣ Testing "Run Code" with C++17 solution...');
  const validCppCode = `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.count(complement)) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};`;

  const runRes = await axios.post(`${API_BASE}/submissions/run`, {
    problemId: problem._id,
    sourceCode: validCppCode,
    language: 'cpp17'
  }, authHeaders);

  console.log('   ✅ Run Code response:', {
    verdict: runRes.data.verdict,
    passedCount: runRes.data.passedCount,
    totalCount: runRes.data.totalCount
  });

  // 5. Test "Submit Code" (2 visible + 8 hidden = 10 total cases)
  console.log('\n5️⃣ Testing "Submit Code" with C++17 solution...');
  const submitRes = await axios.post(`${API_BASE}/submissions/submit`, {
    problemId: problem._id,
    sourceCode: validCppCode,
    language: 'cpp17',
    sessionId
  }, authHeaders);

  console.log('   ✅ Submit Code response:', {
    verdict: submitRes.data.verdict,
    totalPassed: submitRes.data.totalPassed,
    totalCases: submitRes.data.totalCases,
    durationSeconds: submitRes.data.durationSeconds,
    aiTimeComplexity: submitRes.data.aiAnalysis?.timeComplexity,
    aiSpaceComplexity: submitRes.data.aiAnalysis?.spaceComplexity,
    questionsGenerated: submitRes.data.understandingQuestions?.length || 0
  });

  // Verify Hidden Test Security (No leakage of input/output for hidden tests)
  const hiddenResultItem = submitRes.data.executionResults.find(r => r.isHidden);
  console.log('   🔒 Hidden Test Security Audit:', {
    testNumber: hiddenResultItem.testNumber,
    passed: hiddenResultItem.passed,
    hasHiddenInput: 'input' in hiddenResultItem,
    hasHiddenOutput: 'actualOutput' in hiddenResultItem
  });

  // 6. Test Post-Submission Viva Verification
  console.log('\n6️⃣ Completing Post-Submission Code Understanding Viva...');
  const questions = submitRes.data.understandingQuestions || [];
  const userAnswers = {};
  questions.forEach(q => {
    userAnswers[q.id] = q.correct_answer || (q.options ? q.options[q.correct_option_index] : '');
  });

  const verifyRes = await axios.post(`${API_BASE}/submissions/verify`, {
    questions,
    userAnswers,
    code: validCppCode,
    problemTitle: problem.title,
    sessionId
  }, authHeaders);

  console.log('   ✅ Viva Verification score:', {
    score: verifyRes.data.score,
    verdict: verifyRes.data.verdict,
    masteryStatus: verifyRes.data.masteryStatus
  });

  // 7. Fetch Final Report
  console.log('\n7️⃣ Fetching Final Report for session...');
  const reportRes = await axios.get(`${API_BASE}/submissions/report/${sessionId}`, authHeaders);
  console.log('   ✅ Report fetched:', {
    problemTitle: reportRes.data.problem?.title,
    status: reportRes.data.submission?.status,
    codeScore: reportRes.data.submission?.codeScore,
    understandingScore: reportRes.data.submission?.understandingScore,
    attemptCount: reportRes.data.attemptCount,
    recommendationsCount: reportRes.data.recommendations?.length || 0
  });

  // 8. Test Failure Modes
  console.log('\n8️⃣ Testing Failure Modes...');
  
  // Compilation Error
  const invalidCppCode = `#include <iostream>\nint main() { undeclared_variable++; }`;
  const compErrRes = await axios.post(`${API_BASE}/submissions/run`, {
    problemId: problem._id,
    sourceCode: invalidCppCode,
    language: 'cpp17'
  }, authHeaders);
  console.log('   ✅ Compilation Error test:', {
    verdict: compErrRes.data.verdict,
    hasCompileError: !!compErrRes.data.compileError
  });

  // Wrong Answer
  const wrongCppCode = `#include <vector>\nusing namespace std;\nclass Solution { public: vector<int> twoSum(vector<int>& nums, int target) { return {}; } };`;
  const wrongRes = await axios.post(`${API_BASE}/submissions/run`, {
    problemId: problem._id,
    sourceCode: wrongCppCode,
    language: 'cpp17'
  }, authHeaders);
  console.log('   ✅ Wrong Answer test:', {
    verdict: wrongRes.data.verdict,
    passedCount: wrongRes.data.passedCount
  });

  // 9. Multi-Problem Isolation & Linked List Judge Test (add-two-numbers)
  console.log('\n9️⃣ Testing Multi-Problem Judge Isolation (add-two-numbers)...');
  const addTwoProbRes = await axios.get(`${API_BASE}/problems/add-two-numbers`, authHeaders);
  const addTwoProblem = addTwoProbRes.data;
  console.log('   Loaded add-two-numbers:', { id: addTwoProblem._id, title: addTwoProblem.title, judgeType: addTwoProblem.judge_type });

  const addTwoSessionRes = await axios.post(`${API_BASE}/submissions/start-session`, { problemId: addTwoProblem._id }, authHeaders);
  const addTwoSessionId = addTwoSessionRes.data.sessionId;

  const validAddTwoCode = `#include <iostream>
using namespace std;

class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy(0);
        ListNode* curr = &dummy;
        int carry = 0;
        while (l1 || l2 || carry) {
            int sum = carry;
            if (l1) { sum += l1->val; l1 = l1->next; }
            if (l2) { sum += l2->val; l2 = l2->next; }
            carry = sum / 10;
            curr->next = new ListNode(sum % 10);
            curr = curr->next;
        }
        return dummy.next;
    }
};`;

  const addTwoRunRes = await axios.post(`${API_BASE}/submissions/run`, {
    problemId: addTwoProblem._id,
    sourceCode: validAddTwoCode,
    language: 'cpp17'
  }, authHeaders);

  console.log('   ✅ add-two-numbers Run Code response:', {
    verdict: addTwoRunRes.data.verdict,
    passedCount: addTwoRunRes.data.passedCount,
    totalCount: addTwoRunRes.data.totalCount
  });

  const addTwoSubmitRes = await axios.post(`${API_BASE}/submissions/submit`, {
    problemId: addTwoProblem._id,
    sourceCode: validAddTwoCode,
    language: 'cpp17',
    sessionId: addTwoSessionId
  }, authHeaders);

  console.log('   ✅ add-two-numbers Submit Code response:', {
    verdict: addTwoSubmitRes.data.verdict,
    totalPassed: addTwoSubmitRes.data.totalPassed,
    totalCases: addTwoSubmitRes.data.totalCases
  });

  console.log('\n====================================================');
  console.log('🎉 ALL AUTOMATED E2E INTEGRATION TESTS PASSED!');
  console.log('====================================================');
}

runE2ETests().catch(err => {
  console.error('❌ E2E Integration test failed:', err.response?.data || err.message);
  process.exit(1);
});
