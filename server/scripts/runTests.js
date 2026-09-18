const classifier = require('../ml/skillClassifier');
const { recommendProblems } = require('../ml/recommendationEngine');
const { getAssessmentQuestions, evaluateAssessment } = require('../ai/skillAssessmentService');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASSED: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAILED: ${testName}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('🧪 Running CodeBuddy Backend Verification Suite...\n');

  // Test 1: ML Skill Classifier
  console.log('1. Testing ML Random Forest Skill Classifier:');
  const feat = [90, 10, 50, 1.0, 0.9, 0.8, 0];
  const result = classifier.classifySkill(feat);
  assert(result.verifiedLevel && result.confidenceScore > 0, 'Classifies verified level with confidence score');

  // Test 2: Assessment Agent
  console.log('\n2. Testing Adaptive Skill Assessment Agent:');
  const questions = getAssessmentQuestions('Intermediate', 'Array');
  assert(questions.length === 10, 'Generates 10 topic-targeted questions for assessment');
  const evalResult = evaluateAssessment([
    { questionId: 'q1', isCorrect: true },
    { questionId: 'q2', isCorrect: true },
    { questionId: 'q3', isCorrect: true },
    { questionId: 'q4', isCorrect: true },
    { questionId: 'q5', isCorrect: true },
    { questionId: 'q6', isCorrect: true },
    { questionId: 'q7', isCorrect: true },
    { questionId: 'q8', isCorrect: true },
    { questionId: 'q9', isCorrect: true },
    { questionId: 'q10', isCorrect: false }
  ], 'Intermediate');
  assert(evalResult.verifiedLevel.includes('Intermediate'), 'Evaluates assessment answers to verified skill level');


  // Test 3: Recommendation Engine (Cosine Similarity & Content-Based)
  console.log('\n3. Testing Recommendation Engine:');
  const dummyUser = {
    verifiedLevel: 'Intermediate',
    solvedProblems: [],
    targetCompanies: ['NVIDIA'],
    mistakeProfile: [{ topic: 'HashMap' }]
  };
  const candidateProblems = [
    { _id: 'p1', title: 'Two Sum', difficulty: 'Easy', topics: ['HashMap'], companies: ['NVIDIA'] },
    { _id: 'p2', title: 'Course Schedule', difficulty: 'Hard', topics: ['Graph'], companies: ['Google'] }
  ];
  const recs = recommendProblems(dummyUser, candidateProblems, 2);
  assert(recs[0].problem.title === 'Two Sum', 'Recommends Two Sum first due to HashMap weakness and NVIDIA match');

  // Test 4: LeetCode Dataset Import Pipeline & Normalization
  console.log('\n4. Testing LeetCode Dataset Normalization & Validation:');
  const { normalizeDifficulty, normalizeTopics, generateSlug } = require('./importLeetCodeProblems');
  assert(normalizeDifficulty('easy') === 'Easy', 'Normalizes "easy" to "Easy"');
  assert(normalizeDifficulty('MEDIUM') === 'Medium', 'Normalizes "MEDIUM" to "Medium"');
  assert(normalizeDifficulty('invalid_diff') === null, 'Rejects invalid difficulty label');

  const normTopics = normalizeTopics(['hashtable', 'binary tree', 'unknown_tag']);
  assert(normTopics.includes('Hash Table') && normTopics.includes('Binary Tree'), 'Normalizes topic aliases ("hashtable" -> "Hash Table")');

  const slug = generateSlug('Valid Parentheses (LeetCode #20)', '20');
  assert(slug === 'valid-parentheses-leetcode-20', 'Generates clean stable slug from problem title');

  // Test 5: Company-Wise Dataset Selection & Validation
  console.log('\n5. Testing Company-Wise Interview System & Recommendation Algorithm:');
  const { recommendCompanyProblems } = require('../ml/recommendationEngine');
  const companyUser = {
    verifiedLevel: 'Intermediate',
    solvedProblems: [],
    targetCompanies: ['Amazon'],
    mistakeProfile: [{ topic: 'Graph' }]
  };
  const compProblems = [
    { problemId: { _id: 'cp1' }, title: 'Two Sum', difficulty: 'Easy', topics: ['Hash Table'], company: 'Amazon', frequency: 0.9, recency: 'thirty-days' },
    { problemId: { _id: 'cp2' }, title: 'Word Ladder', difficulty: 'Medium', topics: ['Graph'], company: 'Amazon', frequency: 0.85, recency: 'three-months' }
  ];
  const compRecs = recommendCompanyProblems(companyUser, compProblems, 'Amazon', 2);
  assert(compRecs.length === 2, 'Ranks candidate company problems deterministically');
  assert(compRecs[0].companyProblem.company === 'Amazon', 'Preserves Amazon target company relevance signal');

  // Test 6: Adaptive Interview Agent & Follow-up Generation
  console.log('\n6. Testing Adaptive Interview Agent Follow-ups:');
  const { generateFollowUpQuestion, evaluateInterview } = require('../ai/interviewService');
  const followUps = generateFollowUpQuestion('unordered_map<int, int> mp;', 'Two Sum');
  assert(followUps.length === 3, 'Generates 3 solution-specific code understanding follow-up questions');
  assert(followUps[0].question.includes('Hash Map'), 'Detects Hash Map usage and generates complexity question');

  const mockEval = evaluateInterview({
    questions: [{ status: 'submitted' }, { status: 'submitted' }],
    performanceHistory: [{ score: 85, executionPassed: true, slug: 'two-sum' }],
    antiCheatLogs: []
  });
  assert(mockEval.overallScore > 0 && mockEval.strengths.length > 0, 'Evaluates interview session and computes readiness score');

  // Test 7: Step-by-Step Real-Time Adaptive Re-ranking & Q2 Calculation Test
  console.log('\n7. Testing Real-Time Step-by-Step Adaptive Re-ranking (Q1 -> Mistake -> Q2 Re-rank):');
  const { recommendCompanyProblems: rankCandidatePool } = require('../ml/recommendationEngine');
  
  // Simulated Amazon Candidate Pool
  const mockAmazonPool = [
    { problemId: { _id: 'cp_array', title: 'Two Sum', difficulty: 'Easy', topics: ['Array'] }, title: 'Two Sum', difficulty: 'Easy', topics: ['Array'], company: 'Amazon', frequency: 0.9, recency: 'thirty-days' },
    { problemId: { _id: 'cp_graph_m', title: 'Number of Islands', difficulty: 'Medium', topics: ['Graph'] }, title: 'Number of Islands', difficulty: 'Medium', topics: ['Graph'], company: 'Amazon', frequency: 0.88, recency: 'thirty-days' },
    { problemId: { _id: 'cp_dp_m', title: 'Coin Change', difficulty: 'Medium', topics: ['Dynamic Programming'] }, title: 'Coin Change', difficulty: 'Medium', topics: ['Dynamic Programming'], company: 'Amazon', frequency: 0.82, recency: 'three-months' },
    { problemId: { _id: 'cp_graph_e', title: 'Flood Fill', difficulty: 'Easy', topics: ['Graph'] }, title: 'Flood Fill', difficulty: 'Easy', topics: ['Graph'], company: 'Amazon', frequency: 0.75, recency: 'six-months' }
  ];

  // Initial State: Student is Intermediate, no mistakes
  const initialStudentState = {
    verifiedLevel: 'Intermediate',
    targetCompanies: ['Amazon'],
    mistakeProfile: [],
    solvedProblems: []
  };

  const initialRanked = rankCandidatePool(initialStudentState, mockAmazonPool, 'Amazon', 1);
  const q1Selected = initialRanked[0];
  assert(q1Selected && q1Selected.problem && q1Selected.problem.title, 'Selects ONLY Q1 for initial session start');

  // Step 2: Student attempts Q1 (Number of Islands / Graph) and fails with BFS mistake
  const updatedStudentStateAfterQ1Failure = {
    verifiedLevel: 'Intermediate',
    targetCompanies: ['Amazon'],
    mistakeProfile: [{ topic: 'Graph' }],
    mistakesDetected: [{ topic: 'Graph' }],
    solvedProblems: []
  };

  // Step 3: Re-rank remaining candidate pool for Q2 after Q1 failure
  const unaskedPoolForQ2 = mockAmazonPool.filter(p => p.problemId._id !== q1Selected.problem._id);
  const reRankedForQ2 = rankCandidatePool(updatedStudentStateAfterQ1Failure, unaskedPoolForQ2, 'Amazon', 1, {
    activeMistakes: ['Graph'],
    topicsAsked: [q1Selected.problem.topics ? q1Selected.problem.topics[0] : 'Array']
  });

  const q2Selected = reRankedForQ2[0];
  assert(q2Selected.problem.topics.includes('Graph'), 'Re-ranks Q2 candidate pool to target Graph concept after Q1 Graph mistake');
  assert(q2Selected.selectionExplanation.mistakeRelevance === 'high', 'Selection explanation logs high mistake relevance for Q2 adaptation');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passedTests} Passed, ${failedTests} Failed.`);
  console.log(`========================================\n`);

  if (failedTests > 0) process.exit(1);
}

runAllTests();
