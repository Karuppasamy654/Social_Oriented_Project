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

async function runSubmissionProfileLeaderboardSocialE2E() {
  console.log('================================================================');
  console.log('🚀 CODEBUDDY SUBMISSION + LEADERBOARD + PROFILE + SOCIAL E2E TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const user1Username = `e2e_user1_${timestamp}`;
  const user1Email = `e2e_user1_${timestamp}@codebuddy.dev`;

  const user2Username = `e2e_user2_${timestamp}`;
  const user2Email = `e2e_user2_${timestamp}@codebuddy.dev`;

  let token1 = '';
  let token2 = '';
  let user1Id = '';
  let user2Id = '';

  // 1. Register User 1
  console.log('1️⃣ Registering Real Test User 1...');
  try {
    const reg1Res = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test User One',
      username: user1Username,
      email: user1Email,
      password: 'Password123!'
    });
    token1 = reg1Res.data.token;
    user1Id = reg1Res.data.user._id || reg1Res.data.user.id;
    assert(token1 && user1Id, 'User 1 registered & JWT token received');
  } catch (err) {
    console.error('User 1 registration failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const authHeader1 = { headers: { Authorization: `Bearer ${token1}` } };

  // 2. View User 1's Initial Profile
  console.log('\n2️⃣ Viewing User 1 Profile (Initial Empty State)...');
  try {
    const prof1Res = await axios.get(`${API_BASE}/users/profile/${user1Username}`, authHeader1);
    const { stats, profile, solvedProblems } = prof1Res.data;
    assert(profile.username === user1Username, 'Profile username matches User 1');
    assert(stats.totalSolved === 0, 'Initial totalSolved is 0 (no fake solved counts)');
    assert(stats.followersCount === 0, 'Initial followersCount is 0');
    assert(stats.followingCount === 0, 'Initial followingCount is 0');
    assert(solvedProblems.length === 0, 'Initial solvedProblems list is empty');
  } catch (err) {
    assert(false, `Failed to fetch initial profile: ${err.message}`);
  }

  // 3. Submit Actual C++17 Solution for CodeBuddy Problem (two-sum)
  console.log('\n3️⃣ Submitting C++17 Solution for problem "two-sum"...');
  let problem = null;
  try {
    const probRes = await axios.get(`${API_BASE}/problems/two-sum`, authHeader1);
    problem = probRes.data;
    assert(problem && problem._id, `Problem loaded: ${problem.title} (${problem.difficulty})`);
  } catch (err) {
    assert(false, `Failed to load problem: ${err.message}`);
  }

  const startSessionRes = await axios.post(`${API_BASE}/submissions/start-session`, { problemId: problem._id }, authHeader1);
  const sessionId = startSessionRes.data.sessionId;

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

  let submissionId = '';
  try {
    const submitRes = await axios.post(`${API_BASE}/submissions/submit`, {
      problemId: problem._id,
      sourceCode: validCppCode,
      language: 'cpp17',
      sessionId
    }, authHeader1);

    assert(submitRes.data.verdict === 'Accepted', 'Judge returned Accepted verdict');
    assert(submitRes.data.totalPassed === submitRes.data.totalCases, 'All test cases passed (visible + hidden)');
    submissionId = submitRes.data.submissionId;
    assert(submissionId, 'Submission ID generated and returned');
  } catch (err) {
    assert(false, `Submission execution failed: ${err.message}`);
  }

  // 4. Verify Submission Storage & Submission History
  console.log('\n4️⃣ Verifying Submission Storage & History API...');
  try {
    const historyRes = await axios.get(`${API_BASE}/submissions`, authHeader1);
    assert(historyRes.data.submissions.length >= 1, 'Submission record stored in MongoDB and returned in history');
    const matchedSub = historyRes.data.submissions.find(s => s.submissionId === submissionId || s._id === submissionId);
    assert(matchedSub && matchedSub.status === 'Accepted', 'Submission record status is Accepted');
  } catch (err) {
    assert(false, `Submission history fetch failed: ${err.message}`);
  }

  // 5. Verify User 1 Profile Statistics, Solved Problems & Activity Updates
  console.log('\n5️⃣ Verifying Updated Profile Statistics & Solved Problems...');
  try {
    const updatedProfRes = await axios.get(`${API_BASE}/users/profile/${user1Username}`, authHeader1);
    const { stats, solvedProblems, activityCalendar, activities, achievements } = updatedProfRes.data;

    assert(stats.totalSolved === 1, 'Distinct Solved Problems count updated to 1');
    assert(stats.easySolved === 1, 'Easy Solved count updated to 1');
    assert(stats.currentStreak >= 1, 'Coding streak updated to >= 1 day');
    assert(solvedProblems.some(p => p._id.toString() === problem._id.toString()), 'Problem appears in solvedProblems list');
    
    const todayStr = new Date().toISOString().split('T')[0];
    assert(activityCalendar[todayStr] >= 1, 'Activity calendar records today active timestamp');
    assert(activities.length >= 1, 'Activity feed records submission activity');
    assert(achievements.some(a => a.title === 'First Accepted Problem'), 'Unlocked "First Accepted Problem" badge automatically');
  } catch (err) {
    assert(false, `Profile stats verification failed: ${err.message}`);
  }

  // 6. Verify Leaderboard Calculation
  console.log('\n6️⃣ Verifying Leaderboard Calculation...');
  try {
    const leaderRes = await axios.get(`${API_BASE}/leaderboard?type=solved&timeframe=all_time`, authHeader1);
    assert(leaderRes.data.leaderboard.length >= 1, 'Leaderboard contains real users');
    const user1RankItem = leaderRes.data.leaderboard.find(u => u.username === user1Username);
    assert(user1RankItem && user1RankItem.solvedCount === 1, 'User 1 appears on Leaderboard with correct solvedCount = 1');
    assert(leaderRes.data.me && leaderRes.data.me.username === user1Username, 'Me rank card returns current user position');
  } catch (err) {
    assert(false, `Leaderboard check failed: ${err.message}`);
  }

  // 7. Register User 2 & Perform User Search
  console.log('\n7️⃣ Registering User 2 & Performing User Search...');
  try {
    const reg2Res = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Test User Two',
      username: user2Username,
      email: user2Email,
      password: 'Password123!'
    });
    token2 = reg2Res.data.token;
    user2Id = reg2Res.data.user._id || reg2Res.data.user.id;
    assert(token2 && user2Id, 'User 2 registered');
  } catch (err) {
    assert(false, `User 2 registration failed: ${err.message}`);
  }

  const authHeader2 = { headers: { Authorization: `Bearer ${token2}` } };

  // Search User 1 as User 2
  try {
    const searchRes = await axios.get(`${API_BASE}/users/search?q=${user1Username}`, authHeader2);
    assert(searchRes.data.users.length >= 1, 'Server-side user search returned search result');
    const foundUser = searchRes.data.users[0];
    assert(foundUser.username === user1Username, 'Search matched User 1 username');
    assert(foundUser.isFollowing === false, 'User 2 is not yet following User 1');
  } catch (err) {
    assert(false, `User search failed: ${err.message}`);
  }

  // 8. Test Social Graph: Follow & Unfollow Flow
  console.log('\n8️⃣ Testing Social Graph: Follow & Unfollow Operations...');
  try {
    // User 2 follows User 1
    const followRes = await axios.post(`${API_BASE}/users/${user1Username}/follow`, {}, authHeader2);
    assert(followRes.data.isFollowing === true, 'Follow endpoint returned isFollowing: true');
    assert(followRes.data.followersCount === 1, 'User 1 followers count updated to 1');

    // Verify followers list endpoint
    const followersRes = await axios.get(`${API_BASE}/users/${user1Username}/followers`, authHeader1);
    assert(followersRes.data.followers.length === 1, 'Followers list returns 1 follower');
    assert(followersRes.data.followers[0].username === user2Username, 'Follower is User 2');

    // Verify following list endpoint
    const followingRes = await axios.get(`${API_BASE}/users/${user2Username}/following`, authHeader2);
    assert(followingRes.data.following.length === 1, 'User 2 following list returns 1 user');
    assert(followingRes.data.following[0].username === user1Username, 'Following user is User 1');

    // User 2 unfollows User 1
    const unfollowRes = await axios.delete(`${API_BASE}/users/${user1Username}/follow`, authHeader2);
    assert(unfollowRes.data.isFollowing === false, 'Unfollow endpoint returned isFollowing: false');
    assert(unfollowRes.data.followersCount === 0, 'User 1 followers count reset to 0');
  } catch (err) {
    assert(false, `Follow/Unfollow flow failed: ${err.message}`);
  }

  // 9. Test Submission Access Control & Privacy
  console.log('\n9️⃣ Verifying Submission Access Control & Privacy...');
  try {
    const subDetailRes = await axios.get(`${API_BASE}/submissions/${submissionId}`, authHeader2);
    assert(subDetailRes.data.submissionId === submissionId, 'Submission detail returned');
    assert(subDetailRes.data.sourceCode !== undefined, 'Public submission source code accessible');
  } catch (err) {
    assert(false, `Submission detail access failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`🎉 E2E TEST COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log('================================================================\n');

  if (failedTests > 0) process.exit(1);
}

runSubmissionProfileLeaderboardSocialE2E();
