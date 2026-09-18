const Problem = require('../models/Problem');
const CompanyProblem = require('../models/CompanyProblem');
const User = require('../models/User');
const UserMemory = require('../models/UserMemory');
const Mistake = require('../models/Mistake');
const { recommendCompanyProblems } = require('../ml/recommendationEngine');
const { executeSampleTests } = require('../services/codeExecutionService');
const { rankingWeights, difficultyAdaptationRules, performanceWeights } = require('../config/rankingConfig');

/**
 * Initialize a new adaptive interview session selecting ONLY Question 1
 */
async function startInterviewSession({ userId, company = 'Amazon', role = 'Software Engineer' }) {
  const user = userId ? await User.findById(userId).populate('solvedProblems') : null;
  const userMemory = userId ? await UserMemory.findOne({ userId }) : null;

  const detectedLevel = user ? (user.verifiedLevel || 'Intermediate') : 'Intermediate';

  // Load candidate CompanyProblem pool for company
  let companyProblems = await CompanyProblem.find({ company })
    .populate('problemId')
    .sort({ frequency: -1 });

  if (!companyProblems.length) {
    const problems = await Problem.find({ companies: company }).limit(30);
    companyProblems = problems.map(prob => ({
      problemId: prob,
      title: prob.title,
      slug: prob.slug,
      company,
      difficulty: prob.difficulty,
      topics: prob.topics,
      frequency: 0.8,
      recency: 'six-months'
    }));
  }

  const dummyUser = user || {
    verifiedLevel: detectedLevel,
    targetCompanies: [company],
    mistakeProfile: [],
    solvedProblems: []
  };

  // Rank candidate pool for Q1
  const rankedCandidates = recommendCompanyProblems(dummyUser, companyProblems, company, 1, {
    targetLevel: detectedLevel
  });

  const firstRec = rankedCandidates[0];
  const cp = firstRec.companyProblem;
  const prob = cp.problemId && cp.problemId._id ? cp.problemId : cp;

  const q1 = {
    problemId: prob._id || prob.id,
    title: prob.title || cp.title,
    slug: prob.slug || cp.slug,
    description: prob.description || `Frequently asked in ${company} interviews.`,
    difficulty: prob.difficulty || cp.difficulty || 'Medium',
    topics: prob.topics || cp.topics || ['Array'],
    starterCode: prob.starterCode || {
      cpp: `// ${company} ${prob.title || cp.title} Solution\nclass Solution {\npublic:\n    void solve() {}\n};`,
      javascript: `function solve() {\n  // Implement solution\n}`,
      python: `def solve():\n    pass`
    },
    status: 'unanswered',
    aiFollowUpQuestions: []
  };

  return {
    userId,
    company,
    role,
    targetLevel: detectedLevel,
    durationMinutes: 45,
    problemCount: 30,
    currentQIndex: 0,
    questions: [q1],
    topicsAsked: q1.topics,
    difficultyHistory: [q1.difficulty],
    performanceHistory: [],
    selectionExplanations: [{
      qIndex: 0,
      problemId: q1.problemId,
      slug: q1.slug,
      reason: firstRec.selectionExplanation
    }],
    skillBefore: {
      verifiedLevel: detectedLevel,
      confidenceScore: user ? (user.confidenceScore || 85) : 80
    },
    status: 'in_progress'
  };
}

/**
 * Evaluate student question submission using Judge0 code execution & AI follow-up questions
 */
async function evaluateQuestionSubmission({ session, questionIndex, userCode, language = 'cpp', timeSpent = 300, hintsUsed = 0 }) {
  const q = session.questions[questionIndex];
  if (!q) throw new Error(`Question index ${questionIndex} out of bounds.`);

  // Load problem test cases
  const baseProb = q.problemId 
    ? await Problem.findById(q.problemId) 
    : (q.slug ? await Problem.findOne({ slug: q.slug }) : null);
  const testCases = (baseProb && baseProb.sampleTestCases && baseProb.sampleTestCases.length > 0)
    ? baseProb.sampleTestCases
    : [{ input: "sample_input", expectedOutput: "sample_output" }];

  // 1. Judge0 Code Execution (Source of Truth)
  const execSummary = await executeSampleTests(userCode, testCases);
  const executionResults = execSummary.results || [];
  const passedCases = executionResults.filter(r => r.passed).length;
  const executionPassed = execSummary.success || false;
  const mainStatusDesc = execSummary.compileError ? 'Compilation Error' : (executionPassed ? 'Accepted' : 'Wrong Answer');

  // 2. Generate solution-specific AI understanding questions
  const followUps = generateFollowUpQuestion(userCode, q.title);

  // 3. Analyze mistake & update mistake memory if Wrong Answer / Error
  let mistakeDetected = null;
  if (!executionPassed || userCode.length < 20) {
    let mistakeType = 'Syntax or Compilation Error';
    if (mainStatusDesc === 'Wrong Answer') {
      if (q.topics.includes('Graph')) mistakeType = 'BFS/DFS visited-state handling error';
      else if (q.topics.includes('HashMap')) mistakeType = 'Forgetting to check key existence';
      else if (q.topics.includes('Sliding Window')) mistakeType = 'Off-by-one boundary condition';
      else mistakeType = 'Incorrect boundary condition or logic flaw';
    }

    mistakeDetected = {
      topic: q.topics[0] || 'General',
      mistakeType,
      severity: 'medium',
      timestamp: new Date()
    };

    session.mistakesDetected.push(mistakeDetected);

    // Save to Mistake collection & UserMemory if authenticated user
    if (session.userId) {
      try {
        await Mistake.create({
          userId: session.userId,
          topic: q.topics[0] || 'General',
          mistakeType,
          codeSnippet: userCode.substring(0, 300),
          problemId: q.problemId
        });

        await UserMemory.findOneAndUpdate(
          { userId: session.userId },
          { 
            $addToSet: { weakTopics: q.topics[0] || 'General' },
            $push: { recurringMistakes: { mistakeType, topic: q.topics[0] || 'General' } }
          },
          { upsert: true }
        );
      } catch (err) {
        console.warn('Error saving mistake memory:', err.message);
      }
    }
  }

  // 4. Calculate normalized question performance score
  const pw = performanceWeights;
  const correctnessScore = executionPassed ? 100 : (passedCases / Math.max(1, testCases.length)) * 60;
  const timeScore = Math.max(20, Math.min(100, 100 - (timeSpent / 60) * 3));
  const attemptsScore = Math.max(30, 100 - (session.antiCheatLogs.length * 10));
  const hintsScore = Math.max(20, 100 - (hintsUsed * 25));
  const understandingScore = executionPassed ? 88 : 60;

  const performanceScore = Math.round(
    correctnessScore * pw.correctness +
    timeScore * pw.timeEfficiency +
    attemptsScore * pw.attemptsPenalty +
    hintsScore * pw.hintsPenalty +
    understandingScore * pw.understandingScore
  );

  // Store performance history
  session.performanceHistory.push({
    qIndex: questionIndex,
    problemId: q.problemId,
    slug: q.slug,
    difficulty: q.difficulty,
    statusDescription: mainStatusDesc,
    executionPassed,
    score: performanceScore,
    timeSpent,
    hintsUsed,
    understandingScore
  });

  // Update question status in session
  q.userCode = userCode;
  q.language = language;
  q.status = 'evaluated';
  q.aiFollowUpQuestions = followUps;

  await session.save();

  return {
    executionResults,
    executionPassed,
    mainStatusDesc,
    followUps,
    performanceScore,
    mistakeDetected
  };
}

/**
 * Dynamically re-rank candidate pool and select Question N+1
 */
async function selectNextAdaptiveQuestion({ session }) {
  if (session.questions.length >= session.problemCount) {
    session.status = 'completed';
    await session.save();
    return null;
  }

  const user = session.userId ? await User.findById(session.userId).populate('solvedProblems') : null;
  const userMemory = session.userId ? await UserMemory.findOne({ userId: session.userId }) : null;

  // Compute recent performance trend
  const perfHistory = session.performanceHistory || [];
  const lastPerf = perfHistory[perfHistory.length - 1];

  let currentLevel = session.targetLevel || 'Intermediate';
  const rules = difficultyAdaptationRules[currentLevel] || difficultyAdaptationRules.Intermediate;

  // Determine target difficulty for next question based on performance
  let targetDifficulty = 'Medium';
  if (lastPerf) {
    if (lastPerf.executionPassed && lastPerf.score >= 75) {
      // Strong success: upgrade difficulty
      targetDifficulty = currentLevel === 'Beginner' ? 'Medium' : 'Hard';
    } else if (!lastPerf.executionPassed || lastPerf.score < 50) {
      // Failure / struggle: adapt difficulty down or target weak concept
      targetDifficulty = currentLevel === 'Advanced' ? 'Medium' : 'Easy';
    } else {
      // Moderate success
      targetDifficulty = lastPerf.difficulty || 'Medium';
    }
  }

  // Load remaining company problems
  const askedProblemIds = session.questions.map(q => q.problemId.toString());
  const companyProblems = await CompanyProblem.find({ 
    company: session.company,
    problemId: { $nin: askedProblemIds }
  }).populate('problemId');

  if (!companyProblems.length) {
    session.status = 'completed';
    await session.save();
    return null;
  }

  // Prepare student signals for re-ranking
  const activeMistakes = session.mistakesDetected.map(m => m.topic);
  const userWeakTopics = userMemory ? userMemory.weakTopics : (user ? (user.mistakeProfile || []).map(m => m.topic) : []);
  const combinedWeaknesses = Array.from(new Set([...userWeakTopics, ...activeMistakes]));

  const dummyUser = user ? {
    verifiedLevel: currentLevel,
    targetCompanies: [session.company],
    mistakeProfile: combinedWeaknesses.map(t => ({ topic: t })),
    solvedProblems: user.solvedProblems || []
  } : {
    verifiedLevel: currentLevel,
    targetCompanies: [session.company],
    mistakeProfile: combinedWeaknesses.map(t => ({ topic: t })),
    solvedProblems: []
  };

  // Re-rank candidate pool dynamically
  const ranked = recommendCompanyProblems(dummyUser, companyProblems, session.company, 1, {
    targetLevel: currentLevel,
    activeMistakes: combinedWeaknesses,
    topicsAsked: session.topicsAsked,
    recentlyAttemptedIds: askedProblemIds
  });

  const bestRec = ranked[0];
  const cp = bestRec.companyProblem;
  const prob = cp.problemId && cp.problemId._id ? cp.problemId : cp;

  const nextQIndex = session.questions.length;
  const nextQ = {
    problemId: prob._id || prob.id,
    title: prob.title || cp.title,
    slug: prob.slug || cp.slug,
    description: prob.description || `Frequently asked in ${session.company} interviews.`,
    difficulty: prob.difficulty || cp.difficulty || targetDifficulty,
    topics: prob.topics || cp.topics || ['Array'],
    starterCode: prob.starterCode || {
      cpp: `// ${session.company} ${prob.title || cp.title} Solution\nclass Solution {\npublic:\n    void solve() {}\n};`,
      javascript: `function solve() {\n  // Implement solution\n}`,
      python: `def solve():\n    pass`
    },
    status: 'unanswered',
    aiFollowUpQuestions: []
  };

  // Update session state
  session.questions.push(nextQ);
  session.currentQIndex = nextQIndex;
  session.topicsAsked.push(nextQ.topics[0] || 'General');
  session.difficultyHistory.push(nextQ.difficulty);
  session.selectionExplanations.push({
    qIndex: nextQIndex,
    problemId: nextQ.problemId,
    slug: nextQ.slug,
    reason: bestRec.selectionExplanation
  });

  await session.save();
  return nextQ;
}

function generateFollowUpQuestion(submittedCode = '', questionTitle = '') {
  const followUps = [];

  if (submittedCode.includes('unordered_map') || submittedCode.includes('Map(') || submittedCode.includes('set(')) {
    followUps.push({
      question: `Why did you select a Hash Map / Set in your ${questionTitle} solution? What is average vs worst-case lookup complexity?`,
      userAnswer: ''
    });
  } else {
    followUps.push({
      question: `What primary data structure choices did you consider for ${questionTitle}, and why did you settle on this approach?`,
      userAnswer: ''
    });
  }

  if (submittedCode.includes('for') || submittedCode.includes('while')) {
    followUps.push({
      question: `What is the tight time and space complexity of your submitted code? Can auxiliary memory be reduced?`,
      userAnswer: ''
    });
  } else {
    followUps.push({
      question: `How does your implementation perform under large input constraints?`,
      userAnswer: ''
    });
  }

  followUps.push({
    question: `What edge cases (e.g. empty input, duplicate values, overflow) did you explicitly test for?`,
    userAnswer: ''
  });

  return followUps;
}

function evaluateInterview({ questions = [], antiCheatLogs = [], performanceHistory = [] }) {
  const questionsPresented = questions.length;
  const attemptedQuestions = questions.filter(q => q.status === 'attempted' || q.status === 'submitted' || q.status === 'evaluated');
  const questionsAttempted = attemptedQuestions.length;
  const evaluatedItems = performanceHistory;
  const questionsEvaluated = evaluatedItems.length;
  const codingSubmissions = evaluatedItems.length;
  const acceptedSubmissions = evaluatedItems.filter(p => p.executionPassed).length;

  const evidenceSummary = {
    questionsPresented,
    questionsAttempted,
    questionsEvaluated,
    codingProblemsAttempted: codingSubmissions,
    codingSubmissions,
    acceptedSubmissions
  };

  // ZERO-ATTEMPT RULE: If 0 questions were evaluated, return NOT_EVALUATED
  if (questionsEvaluated === 0) {
    return {
      evaluationVersion: 'coding_interview_v2',
      scoreStatus: 'NOT_EVALUATED',
      overallScore: null,
      problemSolving: null,
      codingScore: null,
      technicalKnowledge: null,
      communicationScore: 'Not Applicable',
      complexityAnalysisScore: null,
      edgeCasesScore: null,
      codeQualityScore: null,
      evidenceSummary,
      strengths: ['Insufficient evidence'],
      weaknesses: ['Insufficient evidence'],
      recommendations: ['Start the interview and attempt the first coding question.'],
      mlPrediction: {
        status: 'unavailable',
        prediction: 'Not available yet',
        confidence: 'None',
        model: 'coding_readiness_v2',
        modelVersion: '2.0.0'
      },
      reason: 'No interview questions or coding problems were attempted.'
    };
  }

  // Calculate scores ONLY from actual evaluated evidence
  const avgPerfScore = Math.round(evaluatedItems.reduce((acc, curr) => acc + (curr.score || 0), 0) / questionsEvaluated);
  const acceptedRatio = acceptedSubmissions / questionsEvaluated;

  const codingScore = Math.round(acceptedRatio * 100);
  const problemSolving = Math.round(avgPerfScore);
  const technicalKnowledge = Math.round((codingScore * 0.5) + (problemSolving * 0.5));

  // Weighted overall calculation for available components (40% tech, 30% problem solving, 30% coding)
  const overallScore = Math.round((technicalKnowledge * 0.40) + (problemSolving * 0.30) + (codingScore * 0.30));

  // Determine strengths & weaknesses strictly from evidence
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  evaluatedItems.forEach(item => {
    if (item.executionPassed) {
      strengths.push(`Passed all test cases for problem "${item.slug}" (${item.difficulty || 'Medium'}).`);
    } else {
      weaknesses.push(`Solution for problem "${item.slug}" failed execution (${item.statusDescription || 'Wrong Answer'}).`);
    }
  });

  if (strengths.length === 0) {
    strengths.push('Insufficient evidence');
  }

  if (weaknesses.length === 0) {
    weaknesses.push('Insufficient evidence');
  }

  if (acceptedSubmissions < questionsEvaluated) {
    recommendations.push('Practice debugging boundary conditions and edge cases for failing topics.');
  }
  if (questionsEvaluated < 3) {
    recommendations.push('Complete additional coding questions to establish a full readiness profile.');
  }

  const scoreStatus = questionsEvaluated < 2 ? 'PROVISIONAL' : 'EVALUATED';

  return {
    evaluationVersion: 'coding_interview_v2',
    scoreStatus,
    overallScore,
    problemSolving,
    codingScore,
    technicalKnowledge,
    communicationScore: 'Not Applicable',
    complexityAnalysisScore: problemSolving,
    edgeCasesScore: codingScore,
    codeQualityScore: avgPerfScore,
    evidenceSummary,
    strengths,
    weaknesses,
    recommendations,
    mlPrediction: {
      status: scoreStatus.toLowerCase(),
      prediction: scoreStatus === 'PROVISIONAL' ? 'Provisional readiness estimate' : 'Evaluated readiness profile',
      confidence: scoreStatus === 'PROVISIONAL' ? 'Low' : 'High',
      model: 'coding_readiness_v2',
      modelVersion: '2.0.0'
    }
  };
}

module.exports = {
  createInterviewSession: startInterviewSession,
  startInterviewSession,
  evaluateQuestionSubmission,
  selectNextAdaptiveQuestion,
  generateFollowUpQuestion,
  evaluateInterview
};
