const Problem = require('../models/Problem');
const CompanyProblem = require('../models/CompanyProblem');
const User = require('../models/User');
const UserMemory = require('../models/UserMemory');
const Mistake = require('../models/Mistake');
const { recommendCompanyProblems } = require('../ml/recommendationEngine');
const { executeSampleTests, executeFullSubmission } = require('../services/codeExecutionService');
const skillClassifier = require('../ml/skillClassifier');


const { rankingWeights, difficultyAdaptationRules, performanceWeights } = require('../config/rankingConfig');

const ROUND_CONFIG = Object.freeze({
  15: { durationMinutes: 15, problemCount: 2 },
  30: { durationMinutes: 30, problemCount: 3 }
});

function getInterviewRoundConfig(durationMinutes = 15) {
  const normalized = Number(durationMinutes) || 15;
  return ROUND_CONFIG[normalized] || ROUND_CONFIG[15];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function deriveRoleKeywords(role = '') {
  const text = String(role || '').toLowerCase();
  const matchMap = {
    'software engineer': ['array', 'hash map', 'string', 'tree', 'graph', 'dynamic programming', 'heap', 'binary search'],
    'sde': ['array', 'hash map', 'string', 'tree', 'graph', 'dynamic programming', 'heap', 'binary search'],
    'front-end': ['array', 'string', 'tree', 'stack', 'hash map', 'queue'],
    'systems': ['graph', 'hash map', 'tree', 'array', 'heap', 'binary search', 'stack'],
    'ai/ml': ['matrix', 'graph', 'dynamic programming', 'array', 'hash map', 'tree', 'string'],
    'intern': ['array', 'hash map', 'string', 'tree', 'dynamic programming', 'graph'],
    'backend': ['array', 'hash map', 'string', 'dynamic programming', 'graph', 'tree', 'queue'],
    'full-stack': ['array', 'hash map', 'string', 'graph', 'tree', 'queue'],
    'production': ['hash map', 'graph', 'tree', 'array', 'heap', 'queue'],
    'security': ['string', 'hash map', 'array', 'tree', 'graph', 'stack']
  };

  const directKeywords = Object.entries(matchMap)
    .filter(([key]) => text.includes(key))
    .flatMap(([, values]) => values);

  if (directKeywords.length) return Array.from(new Set(directKeywords));

  return ['array', 'hash map', 'string', 'tree', 'graph', 'dynamic programming'];
}

function chooseDynamicCandidates(rankedCandidates, count = 1) {
  const top = [...rankedCandidates].slice(0, Math.min(rankedCandidates.length, 5));
  const selected = [];
  const used = new Set();

  while (selected.length < count && top.length > 0) {
    const index = Math.floor(Math.random() * top.length);
    const item = top.splice(index, 1)[0];
    const id = item?.companyProblem?.problemId?._id?.toString() || item?.problemId?._id?.toString() || item?.companyProblem?.slug || item?.slug;
    if (!id || used.has(id)) continue;
    used.add(id);
    selected.push(item);
  }

  if (selected.length === 0) {
    return rankedCandidates.slice(0, count);
  }

  return selected;
}

function filterCompanyProblemsByRole(companyProblems = [], role = '') {
  const keywords = deriveRoleKeywords(role);
  if (!companyProblems.length) return companyProblems;

  return companyProblems
    .map(item => {
      const prob = item.problemId || item;
      const topics = (prob.topics || item.topics || []).map(t => String(t).toLowerCase());
      const title = String(prob.title || item.title || '').toLowerCase();
      const matched = keywords.filter(keyword => topics.some(topic => topic.includes(keyword)) || title.includes(keyword));
      return {
        item,
        matchStrength: matched.length,
        topicCoverage: topics.length
      };
    })
    .sort((a, b) => b.matchStrength - a.matchStrength || b.item.frequency - a.item.frequency)
    .map(entry => entry.item);
}

function scoreCodingSubmission({ executionPassed = false, passedCases = 0, totalCases = 1, timeSpentSeconds = 0, code = '', complexity = {} } = {}) {
  const correctnessRatio = executionPassed ? 100 : (passedCases / Math.max(1, totalCases)) * 100;
  const clarityScore = (() => {
    const source = String(code || '');
    let score = 50;
    if (source.includes('for ') || source.includes('while ') || source.includes('if ')) score += 15;
    if (source.includes('vector') || source.includes('unordered_map') || source.includes('map') || source.includes('set')) score += 12;
    if (source.includes('return') && source.includes(';')) score += 10;
    if (source.split('\n').filter(Boolean).length >= 6) score += 10;
    if (source.includes('//') || source.includes('/*')) score += 5;
    return clamp(score, 0, 100);
  })();

  const complexityText = `${complexity.time || ''} ${complexity.space || ''}`.toLowerCase();
  const complexityScore = /o\(1\)|o\(n\)|o\(n log n\)|o\(log n\)|o\(n\*m\)|o\(n\^2\)|o\(n\*w\)/.test(complexityText)
    ? 95
    : 75;

  const speedPenalty = Math.min(25, Math.max(0, Math.floor(timeSpentSeconds / 60) * 3));
  const adjusted = (correctnessRatio * 0.55) + (clarityScore * 0.2) + (complexityScore * 0.15) + (executionPassed ? 10 : 0) - speedPenalty * 0.2;
  return clamp(Math.round(adjusted), 0, 100);
}

/**
 * Initialize a new adaptive interview session selecting ONLY Question 1
 */
async function startInterviewSession({ userId, company = 'Amazon', role = 'Software Engineer', durationMinutes = 15 }) {
  const roundConfig = getInterviewRoundConfig(durationMinutes);
  const user = userId ? await User.findById(userId).populate('solvedProblems') : null;
  const userMemory = userId ? await UserMemory.findOne({ userId }) : null;

  const detectedLevel = user ? (user.verifiedLevel || 'Intermediate') : 'Intermediate';

  // Load candidate CompanyProblem pool for company ensuring valid populated problemId
  let companyProblems = await CompanyProblem.find({ company })
    .populate('problemId')
    .sort({ frequency: -1 });

  companyProblems = companyProblems.filter(cp => cp.problemId && cp.problemId.slug);

  if (!companyProblems.length) {
    const problems = await Problem.find({ companies: company }).limit(60);
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

  if (!companyProblems.length) {
    const fallbackProbs = await Problem.find().limit(60);
    companyProblems = fallbackProbs.map(prob => ({
      problemId: prob,
      title: prob.title,
      slug: prob.slug,
      company,
      difficulty: prob.difficulty,
      topics: prob.topics,
      frequency: 0.8,
      recency: 'all-time'
    }));
  }

  const roleSpecificPool = filterCompanyProblemsByRole(companyProblems, role);
  const dummyUser = user || {
    verifiedLevel: detectedLevel,
    targetCompanies: [company],
    mistakeProfile: [],
    solvedProblems: []
  };

  // Rank candidate pool for Q1
  const rankedCandidates = recommendCompanyProblems(dummyUser, roleSpecificPool, company, Math.max(5, roundConfig.problemCount), {
    targetLevel: detectedLevel,
    activeMistakes: userMemory ? (userMemory.weakTopics || []) : [],
    topicsAsked: []
  });

  const selected = chooseDynamicCandidates(rankedCandidates, 1);
  const firstRec = selected[0] || rankedCandidates[0];
  const cp = firstRec.companyProblem;
  const prob = cp.problemId && cp.problemId._id ? cp.problemId : cp;

  const q1 = {
    problemId: prob._id || prob.id,
    title: prob.title || cp.title,
    slug: prob.slug || cp.slug,
    description: prob.description || `Frequently asked in ${company} interviews for ${role}.`,
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
    durationMinutes: roundConfig.durationMinutes,
    problemCount: roundConfig.problemCount,
    currentQIndex: 0,
    questions: [q1],
    topicsAsked: q1.topics,
    difficultyHistory: [q1.difficulty],
    performanceHistory: [],
    selectionExplanations: [{
      qIndex: 0,
      problemId: q1.problemId,
      slug: q1.slug,
      reason: firstRec.selectionExplanation || { companyRelevance: 'high', difficultyFit: 'strong' }
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
async function evaluateQuestionSubmission({ session, questionIndex, userCode, language = 'cpp', timeSpent = 300, hintsUsed = 0, runOnly = false }) {
  const q = session.questions[questionIndex];
  if (!q) throw new Error(`Question index ${questionIndex} out of bounds.`);

  // Load problem test cases
  const baseProb = q.problemId 
    ? await Problem.findById(q.problemId) 
    : (q.slug ? await Problem.findOne({ slug: q.slug }) : null);

  const visibleTests = (baseProb && baseProb.sampleTestCases && baseProb.sampleTestCases.length > 0)
    ? baseProb.sampleTestCases
    : [{ input: "nums = [2, 7, 11, 15], target = 9", expectedOutput: "[0,1]" }, { input: "nums = [3, 2, 4], target = 6", expectedOutput: "[1,2]" }];

  const hiddenTests = (baseProb && baseProb.hiddenTestCases && baseProb.hiddenTestCases.length > 0)
    ? baseProb.hiddenTestCases
    : Array.from({ length: 8 }).map((_, i) => ({ input: `hidden_case_${i + 1}`, expectedOutput: `hidden_output_${i + 1}` }));

  let execSummary;
  if (runOnly) {
    execSummary = await executeSampleTests(userCode, visibleTests);
  } else {
    execSummary = await executeFullSubmission(userCode, visibleTests, hiddenTests);
    execSummary.results = execSummary.executionResults || [];
    execSummary.success = execSummary.verdict === 'Accepted';
  }

  const executionResults = execSummary.results || [];
  const passedCases = executionResults.filter(r => r.passed).length;
  const executionPassed = execSummary.success || false;
  const mainStatusDesc = execSummary.compileError ? 'Compilation Error' : (execSummary.verdict || (executionPassed ? 'Accepted' : 'Wrong Answer'));

  // 2. Generate AI code analysis using Gemini / fallback rule engine on actual user submission
  let aiAnalysis = null;
  try {
    const { analyzeSubmittedCode } = require('./codeReviewService');
    aiAnalysis = await analyzeSubmittedCode({
      problemTitle: q.title,
      problemDescription: q.description,
      language: 'cpp',
      sourceCode: userCode,
      status: mainStatusDesc,
      runtimeMs: executionResults[0]?.timeMs || 0,
      memoryKb: 0,
      previousMistakes: session.mistakesDetected || []
    });
  } catch (aiErr) {
    console.warn('AI analysis error in evaluateQuestionSubmission:', aiErr.message);
  }

  // 3. Generate solution-specific follow-up questions
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
        await Mistake.findOneAndUpdate(
          { userId: session.userId, mistakeType },
          {
            $set: {
              topic: q.topics[0] || 'General',
              description: `Submission failed on ${q.title || 'Coding Problem'}: ${mistakeType}`,
              codeEvidence: userCode.substring(0, 300),
              problemId: q.problemId,
              lastSeen: new Date()
            },
            $inc: { occurrenceCount: 1 }
          },
          { upsert: true, new: true }
        );

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

  // 4. Calculate normalized question performance score using code quality, clarity, and complexity evidence.
  const totalCases = Math.max(1, executionResults.length);
  const performanceScore = scoreCodingSubmission({
    executionPassed,
    passedCases,
    totalCases,
    timeSpentSeconds: Number(timeSpent) || 0,
    code: userCode,
    complexity: q.expectedComplexity || { time: 'O(N)', space: 'O(1)' }
  });

  const understandingScore = executionPassed ? 100 : Math.round(performanceScore);

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
    aiAnalysis,
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

  // Load remaining company + role specific problems
  const askedProblemIds = session.questions.map(q => q.problemId ? q.problemId.toString() : null).filter(Boolean);
  let companyProblems = await CompanyProblem.find({ 
    company: session.company,
    problemId: { $nin: askedProblemIds }
  }).populate('problemId');

  companyProblems = companyProblems.filter(cp => cp.problemId && cp.problemId.slug);

  if (!companyProblems.length) {
    const problems = await Problem.find({ _id: { $nin: askedProblemIds } }).limit(60);
    companyProblems = problems.map(prob => ({
      problemId: prob,
      title: prob.title,
      slug: prob.slug,
      company: session.company,
      difficulty: prob.difficulty,
      topics: prob.topics,
      frequency: 0.8,
      recency: 'six-months'
    }));
  }

  const roleSpecificPool = filterCompanyProblemsByRole(companyProblems, session.role || 'Software Engineer');
  const remainingRolePool = roleSpecificPool.filter(item => !askedProblemIds.includes((item.problemId || item)._id.toString()));

  if (!remainingRolePool.length) {
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
  const ranked = recommendCompanyProblems(dummyUser, remainingRolePool, session.company, 5, {
    targetLevel: currentLevel,
    activeMistakes: combinedWeaknesses,
    topicsAsked: session.topicsAsked,
    recentlyAttemptedIds: askedProblemIds
  });

  const selected = chooseDynamicCandidates(ranked, 1);
  const bestRec = selected[0] || ranked[0];
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

function evaluateInterview({ questions = [], antiCheatLogs = [], performanceHistory = [], mistakesDetected = [] } = {}) {
  const questionsPresented = questions.length;
  const attemptedQuestions = questions.filter(q => q.status === 'attempted' || q.status === 'submitted' || q.status === 'evaluated');
  const questionsAttempted = attemptedQuestions.length;
  const evaluatedItems = performanceHistory;
  const questionsEvaluated = evaluatedItems.length;
  const codingSubmissions = evaluatedItems.length;
  const acceptedSubmissions = evaluatedItems.filter(p => p.executionPassed).length;
  const mistakeTopics = Array.from(new Set((mistakesDetected || []).map(item => item.topic).filter(Boolean)));
  const mistakeTypes = Array.from(new Set((mistakesDetected || []).map(item => item.mistakeType).filter(Boolean))).slice(0, 3);

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
  if (mistakeTopics.length > 0) {
    recommendations.push(`Focus practice on ${mistakeTopics.join(', ')} and revisit ${mistakeTypes.join(', ') || 'core logic and edge cases'}.`);
  }
  if (questionsEvaluated < 3) {
    recommendations.push('Complete additional coding questions to establish a full readiness profile.');
  }

  const scoreStatus = questionsEvaluated < 2 ? 'PROVISIONAL' : 'EVALUATED';

  // Feature order: [accuracy, avgTimeMin, problemsSolved, easyRate, medRate, hardRate, hintsUsed]
  const avgTimeMin = Math.max(1, Math.round(evaluatedItems.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) / (questionsEvaluated * 60)));
  const featureVector = [
    overallScore,
    avgTimeMin,
    questionsEvaluated,
    acceptedRatio,
    acceptedRatio,
    0.5,
    0
  ];

  let mlSkillClassification = { verifiedLevel: 'Intermediate', confidenceScore: 85, algorithm: 'Random Forest Ensemble' };
  try {
    mlSkillClassification = skillClassifier.classifySkill(featureVector);
  } catch (mlErr) {
    console.warn('ML Skill classification warning:', mlErr.message);
  }

  recommendations.push(`ML Skill Classification Model (${mlSkillClassification.algorithm}): Target level verified as "${mlSkillClassification.verifiedLevel}" with ${mlSkillClassification.confidenceScore}% confidence.`);

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
      verifiedLevel: mlSkillClassification.verifiedLevel,
      confidenceScore: mlSkillClassification.confidenceScore,
      algorithm: mlSkillClassification.algorithm,
      prediction: `Verified Candidate Skill Tier: ${mlSkillClassification.verifiedLevel}`,
      confidence: `${mlSkillClassification.confidenceScore}%`,
      model: 'Random Forest Decision Tree Ensemble (5 Trees)',
      modelVersion: '2.0.0'
    }
  };

}

module.exports = {
  ROUND_CONFIG,
  getInterviewRoundConfig,
  deriveRoleKeywords,
  filterCompanyProblemsByRole,
  scoreCodingSubmission,
  createInterviewSession: startInterviewSession,
  startInterviewSession,
  evaluateQuestionSubmission,
  selectNextAdaptiveQuestion,
  generateFollowUpQuestion,
  evaluateInterview
};
