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

async function runHardeningSecurityConcurrencyTests() {
  console.log('================================================================');
  console.log('🛡️ CODEBUDDY FINAL PRODUCTION HARDENING & SECURITY AUDIT TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const userAUsername = `h_userA_${timestamp}`;
  const userAEmail = `h_userA_${timestamp}@codebuddy.dev`;

  const userBUsername = `h_userB_${timestamp}`;
  const userBEmail = `h_userB_${timestamp}@codebuddy.dev`;

  let tokenA = '';
  let tokenB = '';
  let userAId = '';
  let userBId = '';

  // 1. Register User A and User B
  console.log('1️⃣ Registering Test Users A and B...');
  try {
    const regARes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Hardening User A',
      username: userAUsername,
      email: userAEmail,
      password: 'Password123!'
    });
    tokenA = regARes.data.token;
    userAId = regARes.data.user._id || regARes.data.user.id;

    const regBRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Hardening User B',
      username: userBUsername,
      email: userBEmail,
      password: 'Password123!'
    });
    tokenB = regBRes.data.token;
    userBId = regBRes.data.user._id || regBRes.data.user.id;

    assert(tokenA && tokenB, 'User A and User B registered successfully');
  } catch (err) {
    console.error('Registration failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const authA = { headers: { Authorization: `Bearer ${tokenA}` } };
  const authB = { headers: { Authorization: `Bearer ${tokenB}` } };

  // 2. Self-Follow Rejection Audit
  console.log('\n2️⃣ Testing Self-Follow Prevention...');
  try {
    await axios.post(`${API_BASE}/users/${userAUsername}/follow`, {}, authA);
    assert(false, 'Self-follow should have been rejected');
  } catch (err) {
    assert(err.response?.status === 400, 'Self-follow rejected with HTTP 400 Bad Request');
  }

  // 3. Duplicate Follow & Concurrency Idempotency Audit
  console.log('\n3️⃣ Testing Concurrent Follow Idempotency...');
  try {
    // User B sends two follow requests to User A
    const req1 = axios.post(`${API_BASE}/users/${userAUsername}/follow`, {}, authB);
    const req2 = axios.post(`${API_BASE}/users/${userAUsername}/follow`, {}, authB);
    const [res1, res2] = await Promise.all([req1, req2]);

    assert(res1.data.isFollowing && res2.data.isFollowing, 'Concurrent follow requests handled idempotently');
    assert(res1.data.followersCount === 1, 'Followers count remains exactly 1');

    const profARes = await axios.get(`${API_BASE}/users/profile/${userAUsername}`, authA);
    assert(profARes.data.stats.followersCount === 1, 'Persisted follower count is 1 (no double counting)');
  } catch (err) {
    assert(false, `Follow concurrency test failed: ${err.message}`);
  }

  // 4. Multiple Accepted Submissions Idempotency Audit
  console.log('\n4️⃣ Testing Distinct Solved Problems & Idempotency on Multiple Submissions...');
  let problem = null;
  try {
    const probRes = await axios.get(`${API_BASE}/problems/slug/two-sum`, authA);
    problem = probRes.data;
  } catch (err) {
    console.error('Problem load error:', err.message);
  }

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
            if (seen.count(complement)) return {seen[complement], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};`;

  let sub1Id = '';
  let sub2Id = '';

  try {
    // Submit #1 (Accepted)
    const sub1Res = await axios.post(`${API_BASE}/submissions/submit`, {
      problemId: problem._id,
      sourceCode: validCppCode,
      language: 'cpp17'
    }, authA);
    sub1Id = sub1Res.data.submissionId;

    // Submit #2 for SAME problem (Accepted)
    const sub2Res = await axios.post(`${API_BASE}/submissions/submit`, {
      problemId: problem._id,
      sourceCode: validCppCode,
      language: 'cpp17'
    }, authA);
    sub2Id = sub2Res.data.submissionId;

    const profAfterRes = await axios.get(`${API_BASE}/users/profile/${userAUsername}`, authA);
    assert(profAfterRes.data.stats.totalSolved === 1, 'Distinct Solved Problems count is 1 after multiple accepted submissions');
    assert(profAfterRes.data.stats.totalSubmissions === 2, 'Total Submissions count is 2');
  } catch (err) {
    assert(false, `Multiple submission test failed: ${err.message}`);
  }

  // 5. Code Privacy & Unauthorized Report Access Audit
  console.log('\n5️⃣ Testing Code Privacy & Unauthorized Report Access Controls...');
  try {
    // Query User A submission detail as User B (non-owner)
    const detailRes = await axios.get(`${API_BASE}/submissions/${sub1Id}`, authB);
    assert(detailRes.data.isOwner === false, 'User B is identified as non-owner');
    assert(detailRes.data.aiCodeAnalysis === null, 'Private AI analysis masked for non-owner');
    assert(detailRes.data.compilerOutput === null, 'Compiler output masked for non-owner');

    // Query User A submission report as User B (non-owner)
    const reportRes = await axios.get(`${API_BASE}/submissions/report/${sub1Id}`, authB);
    assert(reportRes.data.isOwner === false, 'Report endpoint correctly flags non-owner request');
    assert(reportRes.data.aiCodeAnalysis === null, 'Report endpoint masks AI code analysis for non-owner');
  } catch (err) {
    assert(false, `Privacy check failed: ${err.message}`);
  }

  // 6. User Search Email Privacy Audit
  console.log('\n6️⃣ Testing User Search Email Privacy Settings...');
  try {
    const searchRes = await axios.get(`${API_BASE}/users/search?q=${userAEmail}`, authB);
    // User A has emailDiscoverability = false by default
    assert(searchRes.data.users.length === 0, 'Private email address not discoverable in search');
  } catch (err) {
    assert(false, `Email privacy search test failed: ${err.message}`);
  }

  // 7. Leaderboard Calculation & Me Rank Consistency
  console.log('\n7️⃣ Testing Leaderboard Standings & Me Rank Alignment...');
  try {
    const leaderRes = await axios.get(`${API_BASE}/leaderboard?type=solved`, authA);
    assert(leaderRes.data.me && leaderRes.data.me.username === userAUsername, 'Me rank object returned for authenticated User A');
    assert(leaderRes.data.me.solvedCount === 1, 'Me rank solvedCount matches distinct solved count (1)');
  } catch (err) {
    assert(false, `Leaderboard check failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 HARDENING TEST COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runHardeningSecurityConcurrencyTests();
