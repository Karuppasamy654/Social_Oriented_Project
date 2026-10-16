const assert = require('assert');
const { selectNextAdaptiveQuestion, updateStudentState, generateFinalProfile, TOPIC_QUESTION_BANK } = require('../ai/adaptiveAssessmentEngine');

console.log('🧪 Starting End-to-End Verification for Adaptive Skill Assessment Module...\n');

// Test Case 1: Strict User Topic Filtering
console.log('▶ Test Case 1: Verifying questions are drawn STRICTLY from user experienced topics...');
const userTopics = ['HashMap', 'Stack'];
let askedIds = [];
let askedTitles = [];

const { question: q1, reasoning: r1 } = selectNextAdaptiveQuestion({
  selectedTopics: userTopics,
  askedQuestionIds: askedIds,
  askedTitles: askedTitles,
  currentTheta: 0.0,
  currentQuestionIndex: 0
});

assert(userTopics.includes(q1.topic), `Question topic '${q1.topic}' must be in user topics [${userTopics.join(', ')}]`);
console.log(`  ✓ Q1 Selected Topic: '${q1.topic}' | Title: '${q1.title}' | Statement: '${q1.problemStatement.slice(0, 50)}...'`);
askedIds.push(q1.id);
askedTitles.push(q1.title);

// Test Case 2: Multi-Question Session No-Repeat Enforcement
console.log('\n▶ Test Case 2: Verifying NO duplicate questions across a multi-question test session...');
for (let i = 1; i < 6; i++) {
  const { question: nextQ } = selectNextAdaptiveQuestion({
    selectedTopics: userTopics,
    askedQuestionIds: askedIds,
    askedTitles: askedTitles,
    currentTheta: 0.2 * i,
    currentQuestionIndex: i
  });

  assert(!askedIds.includes(nextQ.id), `Question ID '${nextQ.id}' was already asked!`);
  assert(!askedTitles.map(t => t.toLowerCase()).includes(nextQ.title.toLowerCase()), `Question Title '${nextQ.title}' was already asked!`);
  assert(userTopics.includes(nextQ.topic), `Question topic '${nextQ.topic}' must be in user topics!`);

  askedIds.push(nextQ.id);
  askedTitles.push(nextQ.title);
  console.log(`  ✓ Q${i + 1} Selected Topic: '${nextQ.topic}' | ID: '${nextQ.id}' | Title: '${nextQ.title}'`);
}

// Test Case 3: IRT Theta State Updating
console.log('\n▶ Test Case 3: Verifying IRT 1PL Rasch ability score updates on answer submission...');
let theta = 0.0;
const evalCorrect = updateStudentState({ currentTheta: theta, question: q1, userAnswer: q1.correctAnswer });
assert(evalCorrect.isCorrect === true, 'Correct answer must evaluate to isCorrect = true');
assert(evalCorrect.newTheta > theta, 'Correct answer must increase theta ability score');
console.log(`  ✓ Initial Theta: ${theta} -> Updated Theta on Correct Answer: ${evalCorrect.newTheta} (P_correct: ${evalCorrect.pCorrect})`);

const evalIncorrect = updateStudentState({ currentTheta: evalCorrect.newTheta, question: q1, userAnswer: 'Wrong Answer Option' });
assert(evalIncorrect.isCorrect === false, 'Incorrect answer must evaluate to isCorrect = false');
assert(evalIncorrect.newTheta < evalCorrect.newTheta, 'Incorrect answer must decrease theta ability score');
console.log(`  ✓ Previous Theta: ${evalCorrect.newTheta} -> Updated Theta on Incorrect Answer: ${evalIncorrect.newTheta}`);

// Test Case 4: Final Multi-Dimensional Skill Profile Generation
console.log('\n▶ Test Case 4: Verifying multi-dimensional ML skill profile generation...');
const answersLog = [
  { topic: 'HashMap', isCorrect: true },
  { topic: 'HashMap', isCorrect: true },
  { topic: 'Stack', isCorrect: true },
  { topic: 'Stack', isCorrect: false }
];
const profile = generateFinalProfile({
  selfReportedLevel: 'Intermediate',
  answers: answersLog,
  finalTheta: 0.45,
  selectedTopics: userTopics
});

assert.strictEqual(profile.verifiedLevel, 'Advanced', 'Verified level should be Advanced for theta 0.45 and 75% accuracy');
assert(profile.strengths.includes('HashMap'), 'HashMap should be listed in strengths');
assert(profile.overall_skill.score === 75, 'Accuracy score should be 75%');
console.log(`  ✓ Verified Level: ${profile.verifiedLevel} | Score: ${profile.overall_skill.score}% | Summary: ${profile.explanation.summary}`);

console.log('\n✅ All Adaptive Skill Assessment Engine tests passed successfully!\n');
