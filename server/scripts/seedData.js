const Problem = require('../models/Problem');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const initialProblems = [
  {
    title: "Two Sum",
    slug: "two-sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    difficulty: "Easy",
    levelTier: "Beginner",
    topics: ["Array", "HashMap"],
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]", explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]." }
    ],
    starterCode: {
      cpp: `#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your C++ code here\n        unordered_map<int, int> mp;\n        for(int i = 0; i < nums.size(); i++) {\n            int diff = target - nums[i];\n            if(mp.find(diff) != mp.end()) {\n                return {mp[diff], i};\n            }\n            mp[nums[i]] = i;\n        }\n        return {};\n    }\n};\n`,
      javascript: `function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) {\n            return [map.get(diff), i];\n        }\n        map.set(nums[i], i);\n    }\n    return [];\n}`,
      python: `def twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []`
    },
    sampleTestCases: [
      { input: "[2, 7, 11, 15]\n9", expectedOutput: "[0, 1]" },
      { input: "[3, 2, 4]\n6", expectedOutput: "[1, 2]" }
    ],
    hiddenTestCases: [
      { input: "[3, 3]\n6", expectedOutput: "[0, 1]" },
      { input: "[1, 5, 8, 3, 12]\n11", expectedOutput: "[2, 3]" },
      { input: "[0, 4, 3, 0]\n0", expectedOutput: "[0, 3]" },
      { input: "[-1, -2, -3, -4, -5]\n-8", expectedOutput: "[2, 4]" },
      { input: "[10, 20, 30, 40, 50]\n90", expectedOutput: "[3, 4]" },
      { input: "[100, 200, 300, 400]\n500", expectedOutput: "[1, 2]" },
      { input: "[1, 1, 1, 1, 1]\n2", expectedOutput: "[0, 1]" },
      { input: "[5, 4, 3, 2, 1]\n9", expectedOutput: "[0, 1]" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(N)" },
    companies: ["Google", "Amazon", "NVIDIA", "Microsoft"],
    acceptanceRate: 74.5,
    hints: ["Try using a Hash Map to keep track of complements in O(1) time."],
    solutionExplanation: "By storing each visited element's index in a HashMap, we can check if the complement exists in O(1) time."
  },
  {
    title: "Contains Duplicate",
    slug: "contains-duplicate",
    description: "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    difficulty: "Easy",
    levelTier: "Beginner",
    topics: ["Array", "HashMap"],
    constraints: ["1 <= nums.length <= 10^5"],
    examples: [
      { input: "nums = [1,2,3,1]", output: "true", explanation: "1 appears twice." }
    ],
    starterCode: {
      cpp: `#include <iostream>\n#include <vector>\n#include <unordered_set>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool containsDuplicate(vector<int>& nums) {\n        unordered_set<int> s;\n        for(int x : nums) {\n            if(s.count(x)) return true;\n            s.insert(x);\n        }\n        return false;\n    }\n};\n`,
      javascript: `function containsDuplicate(nums) {\n    const set = new Set();\n    for (let num of nums) {\n        if (set.has(num)) return true;\n        set.add(num);\n    }\n    return false;\n}`,
      python: `def containsDuplicate(nums):\n    return len(nums) != len(set(nums))`
    },
    sampleTestCases: [
      { input: "[1, 2, 3, 1]", expectedOutput: "true" },
      { input: "[1, 2, 3, 4]", expectedOutput: "false" }
    ],
    hiddenTestCases: [
      { input: "[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]", expectedOutput: "true" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(N)" },
    companies: ["Apple", "Amazon", "Adobe"],
    acceptanceRate: 82.1,
    hints: ["Use a HashSet to record elements as you iterate."],
    solutionExplanation: "A hash set allows O(1) insertion and lookup to detect duplicates immediately."
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    description: "Given a string `s`, find the length of the **longest substring** without repeating characters.",
    difficulty: "Medium",
    levelTier: "Intermediate",
    topics: ["String", "Sliding Window", "HashMap"],
    constraints: ["0 <= s.length <= 5 * 10^4"],
    examples: [
      { input: "s = \"abcabcbb\"", output: "3", explanation: "The answer is \"abc\", with the length of 3." }
    ],
    starterCode: {
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        vector<int> lastPos(256, -1);\n        int maxLen = 0, left = 0;\n        for(int right = 0; right < s.length(); right++) {\n            if(lastPos[s[right]] >= left) {\n                left = lastPos[s[right]] + 1;\n            }\n            lastPos[s[right]] = right;\n            maxLen = max(maxLen, right - left + 1);\n        }\n        return maxLen;\n    }\n};\n`,
      javascript: `function lengthOfLongestSubstring(s) {\n    let map = new Map();\n    let left = 0, maxLen = 0;\n    for (let right = 0; right < s.length; right++) {\n        if (map.has(s[right]) && map.get(s[right]) >= left) {\n            left = map.get(s[right]) + 1;\n        }\n        map.set(s[right], right);\n        maxLen = Math.max(maxLen, right - left + 1);\n    }\n    return maxLen;\n}`,
      python: `def lengthOfLongestSubstring(s: str) -> int:\n    seen = {}\n    left = max_len = 0\n    for right, char in enumerate(s):\n        if char in seen and seen[char] >= left:\n            left = seen[char] + 1\n        seen[char] = right\n        max_len = max(max_len, right - left + 1)\n    return max_len`
    },
    sampleTestCases: [
      { input: "abcabcbb", expectedOutput: "3" },
      { input: "bbbbb", expectedOutput: "1" }
    ],
    hiddenTestCases: [
      { input: "pwwkew", expectedOutput: "3" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(K)" },
    companies: ["Amazon", "NVIDIA", "Google", "Meta"],
    acceptanceRate: 61.2,
    hints: ["Use sliding window technique with two pointers left and right."],
    solutionExplanation: "Maintain a dynamic sliding window [left, right] that expands rightwards while moving left past duplicates."
  },
  {
    title: "Add Two Numbers",
    slug: "add-two-numbers",
    description: "You are given two **non-empty** linked lists representing two non-negative integers. The digits are stored in **reverse order**, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
    difficulty: "Medium",
    levelTier: "Intermediate",
    topics: ["Linked List", "Math"],
    constraints: ["The number of nodes in each linked list is in the range [1, 100]."],
    examples: [
      { input: "l1 = [2,4,3], l2 = [5,6,4]", output: "[7,0,8]", explanation: "342 + 465 = 807." }
    ],
    starterCode: {
      cpp: `#include <iostream>\nusing namespace std;\nclass Solution {\npublic:\n    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {\n        ListNode dummy(0); ListNode* curr = &dummy;\n        int carry = 0;\n        while(l1 || l2 || carry) {\n            int sum = carry;\n            if(l1) { sum += l1->val; l1 = l1->next; }\n            if(l2) { sum += l2->val; l2 = l2->next; }\n            carry = sum / 10;\n            curr->next = new ListNode(sum % 10);\n            curr = curr->next;\n        }\n        return dummy.next;\n    }\n};\n`
    },
    sampleTestCases: [
      { input: "[2, 4, 3]\n[5, 6, 4]", expectedOutput: "[7,0,8]" }
    ],
    hiddenTestCases: [
      { input: "[0]\n[0]", expectedOutput: "[0]" },
      { input: "[9, 9, 9, 9]\n[9, 9]", expectedOutput: "[8,9,0,0,1]" }
    ],
    expectedComplexity: { time: "O(max(N,M))", space: "O(max(N,M))" },
    companies: ["Amazon", "Google", "Microsoft"],
    acceptanceRate: 42.0
  }
];

async function seedInitialData() {
  try {
    const fs = require('fs');
    const path = require('path');

    // Always ensure initial canonical problems exist
    const initOps = initialProblems.map(prob => ({
      updateOne: {
        filter: { slug: prob.slug },
        update: { $set: prob },
        upsert: true
      }
    }));
    await Problem.bulkWrite(initOps);

    const existingCount = await Problem.countDocuments();
    if (existingCount < 500) {
      const v2Path = path.join(__dirname, '../../data/processed/coding_problems_v2.json');
      const curriculumPath = path.join(__dirname, '../../data/leetcode/curriculum-500.json');
      let problemsToSeed = [];

      if (fs.existsSync(v2Path)) {
        try {
          problemsToSeed = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
        } catch (e) {
          console.warn('Could not parse coding_problems_v2.json:', e.message);
        }
      }

      if (!problemsToSeed.length && fs.existsSync(curriculumPath)) {
        try {
          problemsToSeed = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
        } catch (e) {
          console.warn('Could not parse curriculum-500.json:', e.message);
        }
      }

      if (problemsToSeed.length > 0) {
        const ops = problemsToSeed.map(prob => ({
          updateOne: {
            filter: { slug: prob.slug || prob.problem_id },
            update: { $set: prob },
            upsert: true
          }
        }));
        await Problem.bulkWrite(ops);
        const newCount = await Problem.countDocuments();
        console.log(`🌱 Automatically seeded 500 canonical coding problems into database (Total DB count: ${newCount}).`);
      }
    }

    // Auto-seed CompanyProblem associations
    const CompanyProblem = require('../models/CompanyProblem');
    const existingCompanyCount = await CompanyProblem.countDocuments();

    if (existingCompanyCount < 450) {
      const companyPath = path.join(__dirname, '../../data/company/company-problems.json');
      if (fs.existsSync(companyPath)) {
        const companyRecords = JSON.parse(fs.readFileSync(companyPath, 'utf8'));
        const companyOps = [];

        for (const item of companyRecords) {
          let baseProb = await Problem.findOne({ slug: item.slug });
          if (baseProb) {
            companyOps.push({
              updateOne: {
                filter: { problemId: baseProb._id, company: item.company },
                update: {
                  $set: {
                    problemId: baseProb._id,
                    title: item.title,
                    slug: item.slug,
                    company: item.company,
                    difficulty: item.difficulty,
                    topics: item.topics,
                    frequency: item.frequency,
                    recency: item.recency,
                    historicalEvidence: item.historicalEvidence,
                    evidenceType: item.evidenceType,
                    source: item.source
                  }
                },
                upsert: true
              }
            });
          }
        }

        if (companyOps.length > 0) {
          await CompanyProblem.bulkWrite(companyOps);
          const newCompCount = await CompanyProblem.countDocuments();
          console.log(`🌱 Automatically seeded 450 company-problem associations into database (Total DB count: ${newCompCount}).`);
        }
      }
    }

    const testUser = await User.findOne({ email: 'test@codebuddy.dev' });
    if (!testUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);
      await User.create({
        name: 'Arun Kumar',
        username: 'arunkumar',
        email: 'test@codebuddy.dev',
        passwordHash,
        isOnboarded: true,
        experience: '1-3_years',
        selfReportedLevel: 'Intermediate',
        verifiedLevel: 'Intermediate+',
        confidenceScore: 88,
        languages: ['C++', 'JavaScript', 'Python'],
        topics: ['Array', 'HashMap', 'Sliding Window'],
        targetCompanies: ['NVIDIA', 'Google', 'Microsoft'],
        targetRoles: ['Software Engineer'],
        codingStats: {
          totalSolved: 12,
          easySolved: 8,
          mediumSolved: 4,
          hardSolved: 0,
          accuracy: 84,
          avgSolvingTimeMinutes: 14,
          currentStreak: 5,
          bestStreak: 12,
          xp: 850,
          rating: 1420,
          interviewRating: 82
        },
        mistakeProfile: [
          { topic: 'HashMap', mistakeType: 'Forgetting to check key existence', frequency: 3, lastSeen: new Date() },
          { topic: 'Sliding Window', mistakeType: 'Off-by-one boundary condition', frequency: 2, lastSeen: new Date() }
        ],
        achievements: [
          { title: '🔥 5 Day Streak', icon: 'Flame' },
          { title: '🧠 HashMap Fundamentals', icon: 'Brain' },
          { title: '🎯 Assessment Verified', icon: 'Target' }
        ]
      });
      console.log('🌱 Created default test user: test@codebuddy.dev (Password123!)');
    }
  } catch (err) {
    console.warn('Seed data warning:', err.message);
  }
}

module.exports = {
  seedInitialData
};
