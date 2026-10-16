const assert = require('assert');

async function testProblemOrdering() {
  console.log('🧪 Starting Verification for Problem ID Ordering & Solved-to-Back Logic...\n');

  try {
    // 1. Login test user
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@codebuddy.dev', password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    assert(token, 'Must receive JWT token on login');
    console.log('  ✓ Authenticated user test@codebuddy.dev successfully.');

    // 2. Fetch problems page with token
    const res = await fetch('http://localhost:5000/api/problems?page=1&limit=50', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const problems = data.problems || [];
    assert(problems.length > 0, 'Must receive problem list');

    console.log(`\n  ✓ Fetched ${problems.length} problems from API.`);

    // 3. Inspect problem ordering
    let foundSolved = false;
    let lastUnsolvedId = -1;
    let lastSolvedId = -1;

    problems.forEach((p, idx) => {
      const isSolved = p.status === 'Solved';
      const numId = p.numericId || parseInt(p.externalId, 10) || (idx + 1);

      console.log(`    [#${idx + 1}] ID: #${numId} | Title: '${p.title}' | Status: ${p.status}`);

      if (isSolved) {
        foundSolved = true;
        if (lastSolvedId !== -1) {
          assert(numId >= lastSolvedId, `Solved problems must be ordered by ID ascending (${numId} >= ${lastSolvedId})`);
        }
        lastSolvedId = numId;
      } else {
        assert(!foundSolved, `Unsolved problem #${numId} ('${p.title}') appeared AFTER solved problem! Solved problems MUST be pushed to the back.`);
        if (lastUnsolvedId !== -1) {
          assert(numId >= lastUnsolvedId, `Unsolved problems must be ordered by ID ascending (${numId} >= ${lastUnsolvedId})`);
        }
        lastUnsolvedId = numId;
      }
    });

    console.log('\n✅ Problem ID ordering and Solved-to-Back logic verified successfully!\n');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

testProblemOrdering();
