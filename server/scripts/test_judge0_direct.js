const { executeSampleTests, executeFullSubmission, runSingleJudge0Test } = require('../services/codeExecutionService');

async function testJudge0Direct() {
  console.log('🧪 1. Testing simple C++ program direct execution via Judge0...');
  const helloCode = `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "HELLO";\n    return 0;\n}`;
  const res1 = await runSingleJudge0Test(helloCode, "", "HELLO");
  console.log('   Result 1 (Hello World):', { passed: res1.passed, actualOutput: res1.actualOutput, timeMs: res1.timeMs });

  console.log('🧪 2. Testing C++ stdin multiplication via Judge0...');
  const multCode = `#include <iostream>\nusing namespace std;\nint main() {\n    int x;\n    if (cin >> x) cout << x * 2;\n    return 0;\n}`;
  const res2 = await runSingleJudge0Test(multCode, "5", "10");
  console.log('   Result 2 (stdin 5 -> 10):', { passed: res2.passed, actualOutput: res2.actualOutput, timeMs: res2.timeMs });

  console.log('🧪 3. Testing Two Sum C++17 solution (Run Code - 2 visible sample cases)...');
  const twoSumCode = `
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> mp;
        for(int i = 0; i < nums.size(); i++) {
            int diff = target - nums[i];
            if(mp.count(diff)) return {mp[diff], i};
            mp[nums[i]] = i;
        }
        return {};
    }
};`;

  const sampleRes = await executeSampleTests(twoSumCode);
  console.log('   Run Code (Sample Cases) Verdict:', { success: sampleRes.success, compileError: sampleRes.compileError, passedCount: sampleRes.results.filter(r => r.passed).length, totalCount: sampleRes.results.length });

  console.log('🧪 4. Testing Two Sum C++17 submission (Submit Code - 10 cases: 2 visible + 8 hidden)...');
  const fullRes = await executeFullSubmission(twoSumCode);
  console.log('   Submit Code Verdict:', { verdict: fullRes.verdict, compileError: fullRes.compileError, totalPassed: fullRes.totalPassed, totalCases: fullRes.totalCases });

  console.log('🧪 5. Testing Compilation Error handling...');
  const invalidCode = `#include <iostream>\nint main() { invalid_var++; }`;
  const errRes = await runSingleJudge0Test(invalidCode, "", "");
  console.log('   Compilation Error Result:', { errorType: errRes.errorType, statusDesc: errRes.statusDesc, hasCompileError: !!errRes.compileError });

  console.log('✅ DIRECT JUDGE0 VERIFICATION COMPLETE.');
}

testJudge0Direct().catch(err => {
  console.error('❌ Judge0 direct test failed:', err);
  process.exit(1);
});
