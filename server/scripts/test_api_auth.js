async function testFlow() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@codebuddy.dev', password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    console.log('🔑 Logged in successfully. Token acquired.');

    // 1. Start Assessment with user topics 'HashMap' and 'Stack'
    const startRes = await fetch('http://localhost:5000/api/onboarding/assessment/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        selfReportedLevel: 'Intermediate',
        selectedTopics: ['HashMap', 'Stack'],
        experienceText: 'I know HashMap and Stack'
      })
    });
    const startData = await startRes.json();
    console.log('\n🚀 Assessment Session Started:');
    console.log('Session ID:', startData.sessionId);
    console.log('Q1 Topic:', startData.currentQuestion.topic);
    console.log('Q1 Title:', startData.currentQuestion.title);
    console.log('Q1 Problem Statement:', startData.currentQuestion.problemStatement);
    console.log('Q1 Options:', startData.currentQuestion.options);
    console.log('Q1 Adaptation Reasoning:', startData.adaptationExplanation);

    // 2. Submit Answer to Q1 and get Q2
    const ansRes = await fetch(`http://localhost:5000/api/onboarding/assessment/${startData.sessionId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        questionId: startData.currentQuestion.id,
        userAnswer: startData.currentQuestion.correctAnswer
      })
    });
    const ansData = await ansRes.json();
    console.log('\n📝 Answer Submitted for Q1:');
    console.log('Status:', ansData.status);
    console.log('Q2 Index:', ansData.currentQuestionIndex);
    console.log('Q2 Topic:', ansData.currentQuestion.topic);
    console.log('Q2 Title:', ansData.currentQuestion.title);
    console.log('Q2 Problem Statement:', ansData.currentQuestion.problemStatement);
    console.log('Q2 Options:', ansData.currentQuestion.options);
    console.log('Q2 Adaptation Reasoning:', ansData.adaptationExplanation);

  } catch (err) {
    console.error('Test error:', err.message);
  }
}

testFlow();
