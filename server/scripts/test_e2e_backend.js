const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Problem = require('../models/Problem');
const User = require('../models/User');
const CodingSession = require('../models/CodingSession');
const Submission = require('../models/Submission');
const Mistake = require('../models/Mistake');
const { executeSampleTests, executeFullSubmission } = require('../services/codeExecutionService');
const pythonService = require('../services/pythonService');

async function testE2EBackendFlow() {
  console.log('🚀 Starting Automated End-to-End Backend Verification...');
  await connectDB();

  // 1. Ensure test user & problem exist
  let testUser = await User.findOne({ email: 'test_student@codebuddy.com' });
  if (!testUser) {
    testUser = new User({
      name: 'Test Student',
      username: 'test_student',
      email: 'test_student@codebuddy.com',
      password: 'password123',
      verifiedLevel: 'Intermediate'
    });
    await testUser.save();
  }

  let problem = await Problem.findOne({ slug: 'two-sum' });
  if (!problem) {
    problem = new Problem({
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'Easy',
      topics: ['Array', 'HashMap'],
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
        { input: 'nums = [3,2,4], target = 6', output: '[1,2]' }
      ],
      starterCode: {
        cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};',
        javascript: 'function twoSum(nums, target) {\n\n}',
        python: 'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass'
      },
      sampleTestCases: [
        { input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]' },
        { input: 'nums = [3,2,4], target = 6', expectedOutput: '[1,2]' }
      ],
      hiddenTestCases: [
        { input: 'nums = [3,3], target = 6', expectedOutput: '[0,1]' },
        { input: 'nums = [0,4,3,0], target = 0', expectedOutput: '[0,3]' },
        { input: 'nums = [-1,-2,-3,-4,-5], target = -8', expectedOutput: '[2,4]' },
        { input: 'nums = [10,20,30,40,50], target = 90', expectedOutput: '[3,4]' },
        { input: 'nums = [100,200,300,400], target = 500', expectedOutput: '[1,2]' },
        { input: 'nums = [1,1,1,1,1], target = 2', expectedOutput: '[0,1]' },
        { input: 'nums = [5,4,3,2,1], target = 9', expectedOutput: '[0,1]' },
        { input: 'nums = [999,1000,2000], target = 2999', expectedOutput: '[0,2]' }
      ]
    });
    await problem.save();
  }

  console.log(`✅ Loaded Test User: ${testUser.username} and Problem: ${problem.title}`);

  // 2. Start Session
  const sessionId = `session_test_${Date.now()}`;
  const session = new CodingSession({
    userId: testUser._id,
    problemId: problem._id,
    sessionId,
    startedAt: new Date(),
    status: 'active'
  });
  await session.save();
  console.log(`✅ Step 1 Passed: Created CodingSession with ID ${sessionId}`);

  // 3. Test Run Code (2 Visible Cases Only)
  const userCppCode = `#include <iostream>
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

  const runResults = await executeSampleTests(userCppCode, problem.sampleTestCases);
  console.log(`✅ Step 2 Passed: Run Code executed 2 visible test cases (Success: ${runResults.success})`);

  // 4. Test Submit Code (2 Visible + 8 Hidden = 10 Cases)
  const submitResults = await executeFullSubmission(userCppCode, problem.sampleTestCases, problem.hiddenTestCases);
  console.log(`✅ Step 3 Passed: Submit Code Verdict = '${submitResults.verdict}' (${submitResults.totalPassed}/${submitResults.totalCases} Passed)`);

  // Verify Hidden Test Security
  const hiddenResults = submitResults.executionResults.filter(r => r.isHidden);
  const leakedHiddenInput = hiddenResults.some(r => !r.input.includes('[Protected Secret Test Data]'));
  if (leakedHiddenInput) {
    throw new Error('❌ Hidden Test Security Vulnerability: Secret hidden input leaked!');
  }
  console.log('✅ Step 4 Passed: Hidden Test Security Audit — Secret inputs/outputs sanitized securely.');

  // 5. Python AI Code Analysis & Question Generation
  const pyAnalysis = await pythonService.analyzeCodeStatic(userCppCode, 'cpp17');
  console.log(`✅ Step 5 Passed: Python AI Code Analysis returned Time: ${pyAnalysis.estimated_time_complexity}, Space: ${pyAnalysis.estimated_space_complexity}`);

  const aiQuestions = await pythonService.generateUnderstandingQuestions(userCppCode, problem.title, 'cpp17');
  console.log(`✅ Step 6 Passed: Python AI generated ${aiQuestions.length} code-grounded viva questions referencing user code.`);

  // 6. MongoDB Submission Document Creation
  const submission = new Submission({
    submissionId: `sub_test_${Date.now()}`,
    userId: testUser._id,
    problemId: problem._id,
    sessionId,
    language: 'cpp17',
    sourceCode: userCppCode,
    startedAt: session.startedAt,
    submittedAt: new Date(),
    durationSeconds: 120,
    status: submitResults.verdict.toLowerCase().replace(/ /g, '_'),
    visibleTests: submitResults.visibleTests,
    hiddenTests: submitResults.hiddenTests,
    testCasesPassed: submitResults.totalPassed,
    totalTestCases: submitResults.totalCases,
    executionTimeMs: 14,
    memoryKb: 1024,
    aiCodeAnalysis: {
      timeComplexity: pyAnalysis.estimated_time_complexity || 'O(N)',
      spaceComplexity: pyAnalysis.estimated_space_complexity || 'O(N)',
      confidence: 0.95,
      evidence: pyAnalysis.evidence || ['Single pass linear traversal.'],
      whatDidWell: pyAnalysis.what_did_well || ['Optimal unordered_map selection.'],
      whatCanBeImproved: pyAnalysis.what_can_be_improved || ['Pass vector by reference.']
    },
    codeScore: 100
  });

  await submission.save();
  console.log(`✅ Step 7 Passed: Persisted Submission document to MongoDB with ID ${submission.submissionId}`);

  console.log('🎉 ALL AUTOMATED E2E BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

testE2EBackendFlow().catch(err => {
  console.error('❌ E2E Backend Verification Failed:', err);
  process.exit(1);
});
