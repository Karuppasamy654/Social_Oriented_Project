require('dotenv').config();
const mongoose = require('mongoose');
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
      { input: "[10, 20, 30, 40, 50]\n90", expectedOutput: "[3, 4]" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(N)" },
    companies: ["Google", "Amazon", "NVIDIA", "Microsoft"],
    acceptanceRate: 74.5,
    hints: ["Try using a Hash Map to keep track of complements in O(1) time.", "Watch out for negative numbers and duplicate elements."],
    solutionExplanation: "By storing each visited element's index in a HashMap, we can check if the complement (target - current) exists in O(1) time."
  },
  {
    title: "Contains Duplicate",
    slug: "contains-duplicate",
    description: "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    difficulty: "Easy",
    levelTier: "Beginner",
    topics: ["Array", "HashMap"],
    constraints: ["1 <= nums.length <= 10^5", "-10^9 <= nums[i] <= 10^9"],
    examples: [
      { input: "nums = [1,2,3,1]", output: "true", explanation: "1 appears twice." },
      { input: "nums = [1,2,3,4]", output: "false", explanation: "All elements are distinct." }
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
      { input: "[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]", expectedOutput: "true" },
      { input: "[99]", expectedOutput: "false" },
      { input: "[-5, -4, -3, -2, -1]", expectedOutput: "false" },
      { input: "[10, 20, 30, 20]", expectedOutput: "true" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(N)" },
    companies: ["Apple", "Amazon", "Adobe"],
    acceptanceRate: 82.1,
    hints: ["Use a HashSet to record elements as you iterate."],
    solutionExplanation: "A hash set allows O(1) insertion and lookup to detect duplicates immediately."
  },
  {
    title: "Valid Anagram",
    slug: "valid-anagram",
    description: "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    difficulty: "Easy",
    levelTier: "Beginner",
    topics: ["String", "HashMap"],
    constraints: ["1 <= s.length, t.length <= 5 * 10^4", "s and t consist of lowercase English letters."],
    examples: [
      { input: "s = \"anagram\", t = \"nagaram\"", output: "true", explanation: "Both strings contain exact letter frequencies." }
    ],
    starterCode: {
      cpp: `#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        if(s.length() != t.length()) return false;\n        vector<int> count(26, 0);\n        for(int i = 0; i < s.length(); i++) {\n            count[s[i] - 'a']++;\n            count[t[i] - 'a']--;\n        }\n        for(int c : count) if(c != 0) return false;\n        return true;\n    }\n};\n`,
      javascript: `function isAnagram(s, t) {\n    if (s.length !== t.length) return false;\n    const counts = {};\n    for (let char of s) counts[char] = (counts[char] || 0) + 1;\n    for (let char of t) {\n        if (!counts[char]) return false;\n        counts[char]--;\n    }\n    return true;\n}`,
      python: `def isAnagram(s: str, t: str) -> bool:\n    if len(s) != len(t): return False\n    counts = {}\n    for char in s:\n        counts[char] = counts.get(char, 0) + 1\n    for char in t:\n        if counts.get(char, 0) == 0:\n            return False\n        counts[char] -= 1\n    return True`
    },
    sampleTestCases: [
      { input: "anagram\nnagaram", expectedOutput: "true" },
      { input: "rat\ncar", expectedOutput: "false" }
    ],
    hiddenTestCases: [
      { input: "listen\nsilent", expectedOutput: "true" },
      { input: "a\nab", expectedOutput: "false" },
      { input: "fluster\nrestful", expectedOutput: "true" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(1)" },
    companies: ["Google", "Microsoft", "Uber"],
    acceptanceRate: 78.4,
    hints: ["Check if lengths match first. Then count frequency of each character."],
    solutionExplanation: "A fixed frequency array of size 26 efficiently checks character balance in O(N) time."
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    description: "Given a string `s`, find the length of the **longest substring** without repeating characters.",
    difficulty: "Medium",
    levelTier: "Intermediate",
    topics: ["String", "Sliding Window", "HashMap"],
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
    examples: [
      { input: "s = \"abcabcbb\"", output: "3", explanation: "The answer is \"abc\", with the length of 3." },
      { input: "s = \"bbbbb\"", output: "1", explanation: "The answer is \"b\", with the length of 1." }
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
      { input: "pwwkew", expectedOutput: "3" },
      { input: "", expectedOutput: "0" },
      { input: "au", expectedOutput: "2" },
      { input: "tmmzuxt", expectedOutput: "5" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(K)" },
    companies: ["Amazon", "NVIDIA", "Google", "Meta"],
    acceptanceRate: 61.2,
    hints: ["Use sliding window technique with two pointers left and right.", "Store character last seen indices in a Hash Map to jump the left pointer."],
    solutionExplanation: "Maintain a dynamic sliding window [left, right] that expands rightwards while moving left past duplicates."
  },
  {
    title: "3Sum",
    slug: "3sum",
    description: "Given an integer array nums, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
    difficulty: "Medium",
    levelTier: "Intermediate",
    topics: ["Array", "Two Pointers", "Sorting"],
    constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
    examples: [
      { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]", explanation: "Distinct triplets summing to 0." }
    ],
    starterCode: {
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        vector<vector<int>> res;\n        sort(nums.begin(), nums.end());\n        for(int i = 0; i < nums.size(); i++) {\n            if(i > 0 && nums[i] == nums[i-1]) continue;\n            int l = i + 1, r = nums.size() - 1;\n            while(l < r) {\n                int sum = nums[i] + nums[l] + nums[r];\n                if(sum == 0) {\n                    res.push_back({nums[i], nums[l], nums[r]});\n                    while(l < r && nums[l] == nums[l+1]) l++;\n                    while(l < r && nums[r] == nums[r-1]) r--;\n                    l++; r--;\n                } else if(sum < 0) l++;\n                else r--;\n            }\n        }\n        return res;\n    }\n};\n`,
      javascript: `function threeSum(nums) {\n    nums.sort((a,b) => a - b);\n    const res = [];\n    for (let i = 0; i < nums.length; i++) {\n        if (i > 0 && nums[i] === nums[i-1]) continue;\n        let l = i + 1, r = nums.length - 1;\n        while (l < r) {\n            const sum = nums[i] + nums[l] + nums[r];\n            if (sum === 0) {\n                res.push([nums[i], nums[l], nums[r]]);\n                while (l < r && nums[l] === nums[l+1]) l++;\n                while (l < r && nums[r] === nums[r-1]) r--;\n                l++; r--;\n            } else if (sum < 0) l++;\n            else r--;\n        }\n    }\n    return res;\n}`,
      python: `def threeSum(nums):\n    nums.sort()\n    res = []\n    for i in range(len(nums)):\n        if i > 0 and nums[i] == nums[i-1]: continue\n        l, r = i + 1, len(nums) - 1\n        while l < r:\n            s = nums[i] + nums[l] + nums[r]\n            if s == 0:\n                res.append([nums[i], nums[l], nums[r]])\n                while l < r and nums[l] == nums[l+1]: l += 1\n                while l < r and nums[r] == nums[r-1]: r -= 1\n                l += 1; r -= 1\n            elif s < 0: l += 1\n            else: r -= 1\n    return res`
    },
    sampleTestCases: [
      { input: "[-1, 0, 1, 2, -1, -4]", expectedOutput: "[[-1, -1, 2], [-1, 0, 1]]" }
    ],
    hiddenTestCases: [
      { input: "[0, 1, 1]", expectedOutput: "[]" },
      { input: "[0, 0, 0]", expectedOutput: "[[0, 0, 0]]" }
    ],
    expectedComplexity: { time: "O(N^2)", space: "O(1)" },
    companies: ["Qualcomm", "Meta", "Google"],
    acceptanceRate: 58.0,
    hints: ["Sort the array first to apply two pointers.", "Skip duplicate elements to avoid outputting duplicate triplets."],
    solutionExplanation: "Sorting turns the problem into fixed outer element + standard two pointers search."
  },
  {
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    description: "Given an integer array `nums`, find the subarray with the largest sum, and return *its sum*.",
    difficulty: "Medium",
    levelTier: "Intermediate",
    topics: ["Array", "Dynamic Programming"],
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." }
    ],
    starterCode: {
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        int maxSoFar = nums[0], curr = nums[0];\n        for(size_t i = 1; i < nums.size(); i++) {\n            curr = max(nums[i], curr + nums[i]);\n            maxSoFar = max(maxSoFar, curr);\n        }\n        return maxSoFar;\n    }\n};\n`,
      javascript: `function maxSubArray(nums) {\n    let maxSoFar = nums[0], curr = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        curr = Math.max(nums[i], curr + nums[i]);\n        maxSoFar = Math.max(maxSoFar, curr);\n    }\n    return maxSoFar;\n}`,
      python: `def maxSubArray(nums):\n    max_so_far = curr = nums[0]\n    for num in nums[1:]:\n        curr = max(num, curr + num)\n        max_so_far = max(max_so_far, curr)\n    return max_so_far`
    },
    sampleTestCases: [
      { input: "[-2, 1, -3, 4, -1, 2, 1, -5, 4]", expectedOutput: "6" },
      { input: "[1]", expectedOutput: "1" }
    ],
    hiddenTestCases: [
      { input: "[5, 4, -1, 7, 8]", expectedOutput: "23" },
      { input: "[-1, -2, -3]", expectedOutput: "-1" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(1)" },
    companies: ["Microsoft", "Goldman Sachs", "Cisco"],
    acceptanceRate: 71.0,
    hints: ["Kadane's Algorithm: at each position, decide whether to append to current subarray or start a new one."],
    solutionExplanation: "Kadane's Algorithm keeps track of the maximum running subarray ending at index i."
  },
  {
    title: "Climbing Stairs",
    slug: "climbing-stairs",
    description: "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
    difficulty: "Easy",
    levelTier: "Beginner",
    topics: ["Dynamic Programming", "Math"],
    constraints: ["1 <= n <= 45"],
    examples: [
      { input: "n = 2", output: "2", explanation: "1. 1 step + 1 step\n2. 2 steps" },
      { input: "n = 3", output: "3", explanation: "1. 1+1+1\n2. 1+2\n3. 2+1" }
    ],
    starterCode: {
      cpp: `#include <iostream>\nusing namespace std;\n\nclass Solution {\npublic:\n    int climbStairs(int n) {\n        if(n <= 2) return n;\n        int a = 1, b = 2;\n        for(int i = 3; i <= n; i++) {\n            int c = a + b;\n            a = b;\n            b = c;\n        }\n        return b;\n    }\n};\n`,
      javascript: `function climbStairs(n) {\n    if (n <= 2) return n;\n    let a = 1, b = 2;\n    for (let i = 3; i <= n; i++) {\n        let c = a + b;\n        a = b;\n        b = c;\n    }\n    return b;\n}`,
      python: `def climbStairs(n: int) -> int:\n    if n <= 2: return n\n    a, b = 1, 2\n    for _ in range(3, n + 1):\n        a, b = b, a + b\n    return b`
    },
    sampleTestCases: [
      { input: "2", expectedOutput: "2" },
      { input: "3", expectedOutput: "3" }
    ],
    hiddenTestCases: [
      { input: "5", expectedOutput: "8" },
      { input: "10", expectedOutput: "89" }
    ],
    expectedComplexity: { time: "O(N)", space: "O(1)" },
    companies: ["Amazon", "Apple", "Adobe"],
    acceptanceRate: 85.3,
    hints: ["This problem boils down to Fibonacci numbers: f(n) = f(n-1) + f(n-2)."],
    solutionExplanation: "The total ways to reach step n equals ways to reach step n-1 plus ways to reach step n-2."
  },
  {
    title: "Course Schedule",
    slug: "course-schedule",
    description: "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates that you must take course `b` first if you want to take course `a`.\n\nReturn `true` if you can finish all courses. Otherwise, return `false`.",
    difficulty: "Hard",
    levelTier: "Advanced",
    topics: ["Graph", "Topological Sort", "BFS/DFS"],
    constraints: ["1 <= numCourses <= 2000", "0 <= prerequisites.length <= 5000"],
    examples: [
      { input: "numCourses = 2, prerequisites = [[1,0]]", output: "true", explanation: "To take course 1 you must finish 0. So it is possible." },
      { input: "numCourses = 2, prerequisites = [[1,0],[0,1]]", output: "false", explanation: "Cycle detected." }
    ],
    starterCode: {
      cpp: `#include <iostream>\n#include <vector>\n#include <queue>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n        vector<vector<int>> adj(numCourses);\n        vector<int> inDegree(numCourses, 0);\n        for(auto& p : prerequisites) {\n            adj[p[1]].push_back(p[0]);\n            inDegree[p[0]]++;\n        }\n        queue<int> q;\n        for(int i = 0; i < numCourses; i++) {\n            if(inDegree[i] == 0) q.push(i);\n        }\n        int count = 0;\n        while(!q.empty()) {\n            int curr = q.front(); q.pop();\n            count++;\n            for(int next : adj[curr]) {\n                if(--inDegree[next] == 0) q.push(next);\n            }\n        }\n        return count == numCourses;\n    }\n};\n`,
      javascript: `function canFinish(numCourses, prerequisites) {\n    const adj = Array.from({length: numCourses}, () => []);\n    const inDegree = new Array(numCourses).fill(0);\n    for (let [a, b] of prerequisites) {\n        adj[b].push(a);\n        inDegree[a]++;\n    }\n    const queue = [];\n    for (let i = 0; i < numCourses; i++) {\n        if (inDegree[i] === 0) queue.push(i);\n    }\n    let count = 0;\n    while (queue.length) {\n        const curr = queue.shift();\n        count++;\n        for (let next of adj[curr]) {\n            if (--inDegree[next] === 0) queue.push(next);\n        }\n    }\n    return count === numCourses;\n}`,
      python: `def canFinish(numCourses: int, prerequisites: list) -> bool:\n    from collections import deque\n    adj = [[] for _ in range(numCourses)]\n    in_degree = [0] * numCourses\n    for a, b in prerequisites:\n        adj[b].append(a)\n        in_degree[a] += 1\n    q = deque([i for i in range(numCourses) if in_degree[i] == 0])\n    count = 0\n    while q:\n        curr = q.popleft()\n        count += 1\n        for next_node in adj[curr]:\n            in_degree[next_node] -= 1\n            if in_degree[next_node] == 0:\n                q.append(next_node)\n    return count == numCourses`
    },
    sampleTestCases: [
      { input: "2\n[[1,0]]", expectedOutput: "true" },
      { input: "2\n[[1,0],[0,1]]", expectedOutput: "false" }
    ],
    hiddenTestCases: [
      { input: "4\n[[1,0],[2,1],[3,2]]", expectedOutput: "true" },
      { input: "3\n[[1,0],[2,1],[0,2]]", expectedOutput: "false" }
    ],
    expectedComplexity: { time: "O(V + E)", space: "O(V + E)" },
    companies: ["Google", "NVIDIA", "Meta"],
    acceptanceRate: 46.8,
    hints: ["Use Kahn's Algorithm for Topological Sorting to detect cycles in a directed graph."],
    solutionExplanation: "If Kahn's Topological Sort visits all V vertices, the graph contains no directed cycle."
  }
];

async function seedDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codebuddy';
    console.log('Connecting to MongoDB at:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');

    // Seed Problems
    await Problem.deleteMany({});
    const insertedProblems = await Problem.insertMany(initialProblems);
    console.log(`Seeded ${insertedProblems.length} initial coding problems.`);

    // Seed Default Admin/Test User
    const existingUser = await User.findOne({ email: 'test@codebuddy.dev' });
    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);
      const user = await User.create({
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
        topics: ['Array', 'HashMap', 'Sliding Window', 'Dynamic Programming'],
        targetCompanies: ['NVIDIA', 'Google', 'Microsoft'],
        targetRoles: ['Software Engineer'],
        solvedProblems: [insertedProblems[0]._id, insertedProblems[1]._id],
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
      console.log('Created sample test user:', user.email);
    }

    console.log('Seed database process complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seedDB();
