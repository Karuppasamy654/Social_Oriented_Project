const assert = require('assert');
const { getInterviewRoundConfig, deriveRoleKeywords, scoreCodingSubmission } = require('./server/ai/interviewService');

const fifteen = getInterviewRoundConfig(15);
assert.strictEqual(fifteen.problemCount, 2, '15-minute round should ask 2 coding questions');
assert.strictEqual(fifteen.durationMinutes, 15, 'Round duration should remain 15 minutes');

const thirty = getInterviewRoundConfig(30);
assert.strictEqual(thirty.problemCount, 3, '30-minute round should ask 3 coding questions');
assert.strictEqual(thirty.durationMinutes, 30, 'Round duration should remain 30 minutes');

const roleKeywords = deriveRoleKeywords('Front-End Engineer');
assert.ok(roleKeywords.length > 0, 'Role-specific keywords should be available for role matching');

const score = scoreCodingSubmission({
  executionPassed: true,
  passedCases: 3,
  totalCases: 3,
  timeSpentSeconds: 240,
  code: `class Solution {\npublic:\n  int maxSubArray(vector<int>& nums) {\n    int best = nums[0], cur = nums[0];\n    for (int i = 1; i < nums.size(); ++i) {\n      cur = max(nums[i], cur + nums[i]);\n      best = max(best, cur);\n    }\n    return best;\n  }\n};`,
  complexity: { time: 'O(n)', space: 'O(1)' }
});

assert.ok(score >= 80, 'Passing solutions should score highly based on clarity and complexity');
assert.ok(score <= 100, 'Prepared score should stay within the valid range');

console.log('Interview round and scoring checks passed.');
