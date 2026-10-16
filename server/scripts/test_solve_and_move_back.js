const assert = require('assert');

async function testSolveMoveBack() {
  console.log('🧪 Verifying Solved Problem moves to the BACK of the list...\n');

  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@codebuddy.dev', password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // 2. Fetch problems initially
    let res = await fetch('http://localhost:5000/api/problems?page=1&limit=5', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    let data = await res.json();
    let firstProblem = data.problems[0];
    console.log(`  ▶ First Problem before solve: ID #${firstProblem.numericId} '${firstProblem.title}' (Status: ${firstProblem.status})`);
    assert(firstProblem.status !== 'Solved', 'First problem initially should be Unsolved');

    // 3. Submit Accepted solution for firstProblem
    const subRes = await fetch('http://localhost:5000/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        problemId: firstProblem._id,
        language: 'javascript',
        sourceCode: 'function twoSum(nums, target) { return [0, 1]; }'
      })
    });
    const subData = await subRes.json();
    console.log(`  ✓ Submitted code for #${firstProblem.numericId}. Submission Status: '${subData.status || 'Accepted'}'`);

    // 4. Fetch problems page again after solving
    res = await fetch('http://localhost:5000/api/problems?page=1&limit=50', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    const updatedProblems = data.problems || [];

    const solvedProblem = updatedProblems.find(p => p._id === firstProblem._id);
    assert(solvedProblem, 'Solved problem must be present in response');
    assert.strictEqual(solvedProblem.status, 'Solved', 'Problem status must be Solved');

    const solvedIndex = updatedProblems.findIndex(p => p._id === firstProblem._id);
    const unsolvedCount = updatedProblems.filter(p => p.status !== 'Solved').length;

    console.log(`  ✓ Solved Problem #${firstProblem.numericId} is now at index position #${solvedIndex + 1} (after all ${unsolvedCount} unsolved problems).`);
    assert(solvedIndex >= unsolvedCount, `Solved problem index (${solvedIndex}) must be placed AFTER all ${unsolvedCount} unsolved problems!`);

    console.log('\n✅ Verification Successful: Solved problems automatically move to the BACK of the list!\n');
  } catch (err) {
    console.error('❌ Test error:', err.message);
    process.exit(1);
  }
}

testSolveMoveBack();
