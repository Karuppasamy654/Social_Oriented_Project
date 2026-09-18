const axios = require('axios');

const JUDGE0_URL = process.env.JUDGE0_URL || 'https://ce.judge0.com';
const CPP17_LANGUAGE_ID = parseInt(process.env.JUDGE0_CPP_LANG_ID || '54', 10); // C++ (GCC 9.2.0)

/**
 * Format string/bracket input into stdin for C++ test harness
 */
function prepareStdin(inputStr) {
  if (typeof inputStr !== 'string') return String(inputStr || '');
  let raw = inputStr.trim();

  // Extract all array blocks e.g. "[2,4,3]" or "[5,6,4]"
  const arrayMatches = [...raw.matchAll(/\[\s*([\d\s,-]*)\s*\]/g)];
  
  if (arrayMatches.length > 1) {
    // Multiple arrays (e.g. linked list inputs l1 = [2,4,3], l2 = [5,6,4])
    return arrayMatches.map(m => {
      const numbers = m[1].split(',').map(s => s.trim()).filter(s => s !== '');
      return `${numbers.length}\n${numbers.join(' ')}`;
    }).join('\n');
  } else if (arrayMatches.length === 1) {
    // Single array + possible trailing/leading scalar target e.g. "[2, 7, 11, 15]\n9"
    const m = arrayMatches[0];
    const rawArrayStr = m[1];
    const numbers = rawArrayStr.split(',').map(s => s.trim()).filter(s => s !== '');
    
    let target = '';
    const arrayStartIdx = raw.indexOf('[');
    const arrayEndIdx = raw.indexOf(']');
    
    const beforeArray = raw.substring(0, arrayStartIdx);
    const afterArray = raw.substring(arrayEndIdx + 1);
    
    const targetMatchAfter = afterArray.match(/(-?\d+)/);
    const targetMatchBefore = beforeArray.match(/(-?\d+)/);
    
    if (targetMatchAfter) {
      target = targetMatchAfter[1];
    } else if (targetMatchBefore) {
      target = targetMatchBefore[1];
    }

    return target !== '' ? `${numbers.length}\n${numbers.join(' ')}\n${target}` : `${numbers.length}\n${numbers.join(' ')}`;
  }

  // Quoted strings e.g. s = "anagram", t = "nagaram"
  if (raw.includes('"')) {
    const strMatches = [...raw.matchAll(/"([^"]*)"/g)].map(m => m[1]);
    if (strMatches.length > 0) {
      return strMatches.join('\n');
    }
  }

  // Scalar e.g. "n = 5"
  if (raw.includes('=')) {
    const scalarMatch = raw.match(/=\s*(-?\d+)/);
    if (scalarMatch) {
      return scalarMatch[1];
    }
  }

  return raw;
}

/**
 * Normalize array/scalar outputs e.g. "[0, 1]" -> "[0,1]"
 */
function normalizeOutput(str) {
  if (str === null || str === undefined) return '';
  let s = String(str).trim();
  // Standardize JSON style arrays: [0, 1] -> [0,1]
  s = s.replace(/\s*,\s*/g, ',');
  return s;
}

/**
 * Inject C++ driver harness if user code contains Solution class without main()
 */
function wrapUserCodeWithHarness(userCode) {
  if (userCode.includes('int main(') || userCode.includes('int main (')) {
    return userCode;
  }

  let mainBody = '';

  if (userCode.includes('twoSum')) {
    mainBody = `
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    int target;
    cin >> target;
    Solution sol;
    vector<int> ans = sol.twoSum(nums, target);
    cout << "[";
    for (size_t i = 0; i < ans.size(); i++) {
        cout << ans[i] << (i + 1 < ans.size() ? "," : "");
    }
    cout << "]" << endl;
`;
  } else if (userCode.includes('containsDuplicate')) {
    mainBody = `
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    Solution sol;
    bool res = sol.containsDuplicate(nums);
    cout << (res ? "true" : "false") << endl;
`;
  } else if (userCode.includes('isAnagram')) {
    mainBody = `
    string s, t;
    if (cin >> s >> t) {
        Solution sol;
        bool res = sol.isAnagram(s, t);
        cout << (res ? "true" : "false") << endl;
    }
`;
  } else if (userCode.includes('lengthOfLongestSubstring')) {
    mainBody = `
    string s;
    if (cin >> s) {
        Solution sol;
        cout << sol.lengthOfLongestSubstring(s) << endl;
    } else {
        cout << 0 << endl;
    }
`;
  } else if (userCode.includes('maxSubArray')) {
    mainBody = `
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    Solution sol;
    cout << sol.maxSubArray(nums) << endl;
`;
  } else if (userCode.includes('climbStairs')) {
    mainBody = `
    int n;
    if (cin >> n) {
        Solution sol;
        cout << sol.climbStairs(n) << endl;
    }
`;
  } else if (userCode.includes('threeSum')) {
    mainBody = `
    int n;
    if (!(cin >> n)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    Solution sol;
    vector<vector<int>> ans = sol.threeSum(nums);
    cout << "[";
    for (size_t i = 0; i < ans.size(); i++) {
        cout << "[";
        for (size_t j = 0; j < ans[i].size(); j++) {
            cout << ans[i][j] << (j + 1 < ans[i].size() ? "," : "");
        }
        cout << "]" << (i + 1 < ans.size() ? "," : "");
    }
    cout << "]" << endl;
`;
  } else if (userCode.includes('addTwoNumbers')) {
    mainBody = `
    int n1;
    if (!(cin >> n1)) return 0;
    ListNode dummy1(0); ListNode* tail1 = &dummy1;
    for (int i = 0; i < n1; i++) { int val; cin >> val; tail1->next = new ListNode(val); tail1 = tail1->next; }
    int n2;
    if (!(cin >> n2)) return 0;
    ListNode dummy2(0); ListNode* tail2 = &dummy2;
    for (int i = 0; i < n2; i++) { int val; cin >> val; tail2->next = new ListNode(val); tail2 = tail2->next; }
    
    Solution sol;
    ListNode* res = sol.addTwoNumbers(dummy1.next, dummy2.next);
    cout << "[";
    while (res) {
        cout << res->val << (res->next ? "," : "");
        res = res->next;
    }
    cout << "]" << endl;
`;
  } else {
    // Generic solution runner
    mainBody = `
    return 0;
`;
  }

  const listNodeDef = (userCode.includes('ListNode') && !userCode.includes('struct ListNode'))
    ? `struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
`
    : '';

  const treeNodeDef = (userCode.includes('TreeNode') && !userCode.includes('struct TreeNode'))
    ? `struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
`
    : '';

  return `
// --- AUTOMATIC C++17 TEST HARNESS ---
#include <iostream>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <string>
#include <algorithm>
using namespace std;

${listNodeDef}
${treeNodeDef}
${userCode}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    ${mainBody}
    return 0;
}
`;
}

function decodeBase64(str) {
  if (!str) return '';
  try {
    return Buffer.from(str, 'base64').toString('utf8');
  } catch (e) {
    return str;
  }
}

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Fallback local C++17 compiler runner using local g++
 */
function runLocalCppTest(sourceCode, input, expectedOutput, compiledContext = null) {
  const stdinPayload = prepareStdin(input);
  const normExpected = normalizeOutput(expectedOutput);

  let tmpDir = null;
  let exePath = null;

  if (compiledContext && compiledContext.exePath) {
    exePath = compiledContext.exePath;
  } else {
    const finalCode = wrapUserCodeWithHarness(sourceCode);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-cpp-'));
    const srcPath = path.join(tmpDir, 'solution.cpp');
    exePath = path.join(tmpDir, 'solution.exe');
    fs.writeFileSync(srcPath, finalCode);

    try {
      execSync(`g++ -std=c++17 "${srcPath}" -o "${exePath}"`, { timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (compileErr) {
      const rawErr = compileErr.stderr ? compileErr.stderr.toString('utf8') : compileErr.message;
      if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
      return {
        passed: false,
        statusDesc: 'Compilation Error',
        errorType: 'compilation_error',
        actualOutput: rawErr,
        expectedOutput: normExpected,
        compileError: rawErr,
        timeMs: 0
      };
    }
  }

  try {
    const startTime = Date.now();
    const stdout = execSync(`"${exePath}"`, {
      input: stdinPayload,
      timeout: 3000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const timeMs = Date.now() - startTime;
    const actualOutput = normalizeOutput(stdout);
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });

    let passed = false;
    let errorType = null;
    if (normExpected) {
      passed = (actualOutput === normExpected);
      if (!passed) errorType = 'wrong_answer';
    } else {
      passed = true;
    }

    return {
      passed,
      statusDesc: passed ? 'Accepted' : 'Wrong Answer',
      errorType,
      actualOutput,
      expectedOutput: normExpected,
      compileError: null,
      timeMs
    };
  } catch (execErr) {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
    const isTimeout = execErr.code === 'ETIMEDOUT' || execErr.signal === 'SIGTERM';
    const errOutput = execErr.stderr ? execErr.stderr.toString('utf8') : execErr.message;
    return {
      passed: false,
      statusDesc: isTimeout ? 'Time Limit Exceeded' : 'Runtime Error',
      errorType: isTimeout ? 'time_limit_exceeded' : 'runtime_error',
      actualOutput: errOutput || 'Runtime Error',
      expectedOutput: normExpected,
      compileError: null,
      timeMs: isTimeout ? 3000 : 15
    };
  }
}

/**
 * Execute single test case against Judge0 API with local g++ fallback
 */
async function runSingleJudge0Test(sourceCode, input, expectedOutput, compiledContext = null) {
  const finalCode = wrapUserCodeWithHarness(sourceCode);
  const stdinPayload = prepareStdin(input);
  const normExpected = normalizeOutput(expectedOutput);

  // Fast-path: Use local g++ compiler if available or specified
  const hasCustomJudge0 = Boolean(process.env.JUDGE0_URL && process.env.JUDGE0_URL !== 'https://ce.judge0.com');
  if (!hasCustomJudge0 || process.env.USE_LOCAL_COMPILER === 'true' || process.env.NODE_ENV === 'test') {
    try {
      const localResult = runLocalCppTest(sourceCode, input, expectedOutput, compiledContext);
      if (localResult && localResult.statusDesc) {
        return localResult;
      }
    } catch (localErr) {
      // Fallback to Judge0 API if local g++ fails
    }
  }

  const payload = {
    source_code: Buffer.from(finalCode).toString('base64'),
    language_id: CPP17_LANGUAGE_ID,
    stdin: Buffer.from(stdinPayload).toString('base64'),
    cpu_time_limit: 2.0
  };

  if (normExpected) {
    payload.expected_output = Buffer.from(normExpected).toString('base64');
  }

  try {
    const response = await axios.post(`${JUDGE0_URL}/submissions?wait=true&base64_encoded=true`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 1500
    });

    const data = response.data || {};
    const statusId = data.status ? data.status.id : 3;
    const actualOutput = normalizeOutput(decodeBase64(data.stdout || ''));
    const compileError = decodeBase64(data.compile_output || data.stderr || '');
    const executionTimeMs = data.time ? Math.round(parseFloat(data.time) * 1000) : 14;

    let passed = false;
    let errorType = null;

    if (statusId === 3) {
      if (normExpected) {
        passed = (actualOutput === normExpected);
        if (!passed) errorType = 'wrong_answer';
      } else {
        passed = true;
      }
    } else if (statusId === 4) {
      passed = false;
      errorType = 'wrong_answer';
    } else if (statusId === 5) {
      passed = false;
      errorType = 'time_limit_exceeded';
    } else if (statusId === 6) {
      passed = false;
      errorType = 'compilation_error';
    } else {
      passed = false;
      errorType = 'runtime_error';
    }

    return {
      passed,
      statusDesc: passed ? 'Accepted' : (errorType === 'compilation_error' ? 'Compilation Error' : (errorType === 'time_limit_exceeded' ? 'Time Limit Exceeded' : (errorType === 'runtime_error' ? 'Runtime Error' : 'Wrong Answer'))),
      errorType,
      actualOutput: actualOutput || (compileError ? compileError.trim() : 'No output'),
      expectedOutput: normExpected,
      compileError: statusId === 6 ? compileError : null,
      timeMs: executionTimeMs,
      rawJudge0Data: data
    };
  } catch (err) {
    // Fallback immediately to local g++ compiler if Judge0 API is unreachable
    return runLocalCppTest(sourceCode, input, expectedOutput);
  }
}

/**
 * Execute 2 visible sample tests (Run Code)
 */
async function executeSampleTests(sourceCode, sampleTests = []) {
  if (!sampleTests || sampleTests.length === 0) {
    sampleTests = [
      { input: "[2, 7, 11, 15]\n9", expectedOutput: "[0,1]" },
      { input: "[3, 2, 4]\n6", expectedOutput: "[1,2]" }
    ];
  }

  const results = [];
  let hasCompileError = false;
  let firstCompileError = null;

  for (let i = 0; i < sampleTests.length; i++) {
    const tc = sampleTests[i];
    const res = await runSingleJudge0Test(sourceCode, tc.input || tc.input_format, tc.expectedOutput || tc.output);

    if (res.errorType === 'compilation_error') {
      hasCompileError = true;
      firstCompileError = res.compileError || res.actualOutput;
    }

    results.push({
      testNumber: i + 1,
      passed: res.passed,
      input: tc.input || tc.input_format,
      actualOutput: res.actualOutput,
      expectedOutput: res.expectedOutput,
      timeMs: res.timeMs,
      errorType: res.errorType,
      statusDesc: res.statusDesc
    });

    if (hasCompileError) break; // Don't run rest if compile failed
  }

  return {
    success: !hasCompileError && results.every(r => r.passed),
    compileError: firstCompileError,
    results
  };
}

/**
 * Execute 2 visible + 8 hidden test cases = 10 total (Submit Code)
 * Note: Returned summary object contains full execution metrics for Node backend.
 */
async function executeFullSubmission(sourceCode, visibleTests = [], hiddenTests = []) {
  if (!visibleTests || visibleTests.length === 0) {
    visibleTests = [
      { input: "[2, 7, 11, 15]\n9", expectedOutput: "[0,1]" },
      { input: "[3, 2, 4]\n6", expectedOutput: "[1,2]" }
    ];
  }

  if (!hiddenTests || hiddenTests.length < 8) {
    hiddenTests = [
      { input: "[3, 3]\n6", expectedOutput: "[0,1]" },
      { input: "[1, 5, 8, 3, 12]\n11", expectedOutput: "[2,3]" },
      { input: "[0, 4, 3, 0]\n0", expectedOutput: "[0,3]" },
      { input: "[-1, -2, -3, -4, -5]\n-8", expectedOutput: "[2,4]" },
      { input: "[10, 20, 30, 40, 50]\n90", expectedOutput: "[3,4]" },
      { input: "[100, 200, 300, 400]\n500", expectedOutput: "[1,2]" },
      { input: "[1, 1, 1, 1, 1]\n2", expectedOutput: "[0,1]" },
      { input: "[5, 4, 3, 2, 1]\n9", expectedOutput: "[0,1]" }
    ];
  }

  const allCases = [
    ...visibleTests.slice(0, 2).map((tc, idx) => ({ ...tc, isHidden: false, name: `Sample Case ${idx + 1}` })),
    ...hiddenTests.slice(0, 8).map((tc, idx) => ({ ...tc, isHidden: true, name: `Hidden Test ${idx + 1}` }))
  ];

  const executionResults = [];
  const visibleResults = [];
  const hiddenResults = [];

  let overallVerdict = 'Accepted';
  let overallErrorType = null;
  let compileError = null;

  let compiledContext = null;
  const hasCustomJudge0 = Boolean(process.env.JUDGE0_URL && process.env.JUDGE0_URL !== 'https://ce.judge0.com');
  if (!hasCustomJudge0 || process.env.USE_LOCAL_COMPILER === 'true' || process.env.NODE_ENV === 'test') {
    try {
      const finalCode = wrapUserCodeWithHarness(sourceCode);
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-cpp-'));
      const srcPath = path.join(tmpDir, 'solution.cpp');
      const exePath = path.join(tmpDir, 'solution.exe');
      fs.writeFileSync(srcPath, finalCode);
      execSync(`g++ -std=c++17 "${srcPath}" -o "${exePath}"`, { timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] });
      compiledContext = { tmpDir, exePath };
    } catch (err) {
      // Compiled error will be handled by first test execution
    }
  }

  try {
    for (let i = 0; i < allCases.length; i++) {
      const tc = allCases[i];
      const res = await runSingleJudge0Test(sourceCode, tc.input, tc.expectedOutput, compiledContext);

      const caseRes = {
        testNumber: i + 1,
        name: tc.name,
        passed: res.passed,
        input: tc.input,
        actualOutput: res.actualOutput,
        expectedOutput: res.expectedOutput,
        timeMs: res.timeMs,
        isHidden: tc.isHidden,
        errorType: res.errorType,
        statusDesc: res.statusDesc
      };

      executionResults.push(caseRes);
      if (tc.isHidden) hiddenResults.push(caseRes);
      else visibleResults.push(caseRes);

      if (!res.passed) {
        if (res.errorType === 'compilation_error') {
          overallVerdict = 'Compilation Error';
          compileError = res.compileError || res.actualOutput;
          overallErrorType = 'compilation_error';
          break;
        } else if (overallVerdict === 'Accepted') {
          overallVerdict = res.statusDesc;
          overallErrorType = res.errorType;
        }
      }
    }
  } finally {
    if (compiledContext && compiledContext.tmpDir) {
      try { fs.rmSync(compiledContext.tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
  }

  const totalPassed = executionResults.filter(r => r.passed).length;

  return {
    verdict: overallVerdict,
    errorType: overallErrorType,
    compileError,
    totalPassed,
    totalCases: allCases.length,
    visibleTests: visibleResults.map(r => ({ testNumber: r.testNumber, passed: r.passed, input: r.input, expectedOutput: r.expectedOutput, actualOutput: r.actualOutput })),
    hiddenTests: hiddenResults.map(r => ({ testNumber: r.testNumber, passed: r.passed })),
    executionResults
  };
}

module.exports = {
  executeSampleTests,
  executeFullSubmission,
  runSingleJudge0Test,
  wrapUserCodeWithHarness
};