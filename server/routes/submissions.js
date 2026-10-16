const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const codeExecutionService = require('../services/codeExecutionService');
const pythonService = require('../services/pythonService');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

/**
 * Helper: Recalculate and update user coding statistics & achievements idempotently
 */
async function syncUserStatsAndAchievements(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Fetch all submissions for this user
    const allSubmissions = await Submission.find({ userId: user._id }).lean();
    const totalSubmissions = allSubmissions.length;

    // Filter accepted submissions
    const acceptedSubmissions = allSubmissions.filter(s =>
      s.status === 'accepted' || s.status === 'Accepted'
    );

    // Collect distinct accepted problem IDs
    const acceptedProblemIds = new Set();
    acceptedSubmissions.forEach(s => {
      if (s.problemId) acceptedProblemIds.add(s.problemId.toString());
    });

    // Populate problem difficulties
    const solvedProblemDocs = await Problem.find({ _id: { $in: Array.from(acceptedProblemIds) } })
      .select('difficulty')
      .lean();

    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;

    solvedProblemDocs.forEach(p => {
      const diff = (p.difficulty || 'Easy').toLowerCase();
      if (diff === 'easy') easySolved++;
      else if (diff === 'medium') mediumSolved++;
      else if (diff === 'hard') hardSolved++;
    });

    const totalSolved = acceptedProblemIds.size;
    const accuracy = totalSubmissions > 0
      ? Math.round((acceptedSubmissions.length / totalSubmissions) * 100)
      : 100;

    // Streak Calculation from distinct active activity dates (UTC date strings)
    const activeDates = new Set();
    allSubmissions.forEach(sub => {
      const dStr = new Date(sub.submittedAt || sub.createdAt).toISOString().split('T')[0];
      activeDates.add(dStr);
    });

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(activeDates).sort();

    if (sortedDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (activeDates.has(todayStr) || activeDates.has(yesterdayStr)) {
        let checkDate = activeDates.has(todayStr) ? new Date() : yesterday;
        while (true) {
          const dStr = checkDate.toISOString().split('T')[0];
          if (activeDates.has(dStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevD = new Date(sortedDates[i - 1]);
          const currD = new Date(sortedDates[i]);
          const diffDays = Math.round((currD - prevD) / (1000 * 3600 * 24));
          if (diffDays === 1) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        }
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      }
    }

    // Update User model stats
    user.solvedProblems = Array.from(acceptedProblemIds);
    user.codingStats = {
      ...user.codingStats,
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      accuracy,
      currentStreak,
      bestStreak,
      lastCodingDate: new Date()
    };

    // Evaluate Achievements
    const existingTitles = new Set((user.achievements || []).map(a => a.title));
    const newAchievements = [];

    if (totalSolved >= 1 && !existingTitles.has('First Accepted Problem')) {
      newAchievements.push({ title: 'First Accepted Problem', icon: 'CheckCircle2', unlockedAt: new Date() });
    }
    if (totalSolved >= 10 && !existingTitles.has('10 Problems Solved')) {
      newAchievements.push({ title: '10 Problems Solved', icon: 'Trophy', unlockedAt: new Date() });
    }
    if (totalSolved >= 50 && !existingTitles.has('50 Problems Solved')) {
      newAchievements.push({ title: '50 Problems Solved', icon: 'Award', unlockedAt: new Date() });
    }
    if (currentStreak >= 7 && !existingTitles.has('7-Day Streak')) {
      newAchievements.push({ title: '7-Day Streak', icon: 'Flame', unlockedAt: new Date() });
    }

    if (newAchievements.length > 0) {
      user.achievements = [...(user.achievements || []), ...newAchievements];
      for (const ach of newAchievements) {
        await Activity.create({
          userId: user._id,
          type: 'achievement',
          title: `Earned Badge: ${ach.title}`,
          description: `Unlocked ${ach.title} achievement!`
        });
        await Notification.create({
          userId: user._id,
          title: 'Achievement Unlocked!',
          message: `Congratulations! You earned the "${ach.title}" badge.`,
          type: 'achievement'
        });
      }
    }

    await user.save();
  } catch (err) {
    console.error('Error syncing user stats:', err);
  }
}

// ------------------------------------------------------------------
// 1. Start Coding Session (POST /api/submissions/start-session)
// ------------------------------------------------------------------
router.post('/start-session', authMiddleware, async (req, res) => {
  try {
    const { problemId } = req.body;
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    return res.json({
      sessionId,
      startedAt: new Date()
    });
  } catch (err) {
    console.error('Error in /start-session:', err);
    return res.status(500).json({ error: 'Failed to start coding session.' });
  }
});

// ------------------------------------------------------------------
// 2. Run Code (POST /api/submissions/run) - Visible sample tests
// ------------------------------------------------------------------
router.post('/run', authMiddleware, async (req, res) => {
  try {
    const { problemId, sourceCode, language = 'cpp17' } = req.body;

    if (!problemId || !sourceCode) {
      return res.status(400).json({ error: 'problemId and sourceCode are required' });
    }

    const problem = await Problem.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(problemId) ? problemId : null },
        { slug: problemId }
      ]
    });

    if (!problem) return res.status(404).json({ error: 'Problem not found' });
    const sampleTests = problem.sampleTestCases || [];
    if (sampleTests.length === 0) return res.status(422).json({ error: 'This problem has no configured sample tests.' });

    const runResult = await codeExecutionService.executeSampleTests(sourceCode, sampleTests);

    const passedCount = runResult.results ? runResult.results.filter(r => r.passed).length : 0;
    const totalCount = runResult.results ? runResult.results.length : 0;
    const verdict = runResult.compileError ? 'Compilation Error' : (runResult.success ? 'Accepted' : 'Wrong Answer');

    return res.json({
      verdict,
      passedCount,
      totalCount,
      compileError: runResult.compileError,
      executionResults: runResult.results || []
    });
  } catch (err) {
    console.error('Error in /run:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Failed to run code.' });
  }
});

// ------------------------------------------------------------------
// 3. Submit Code (POST /api/submissions/submit) - Visible + Hidden tests
// ------------------------------------------------------------------
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { problemId, sourceCode, language = 'cpp17', sessionId } = req.body;
    const userId = req.user.id || req.user._id;

    if (!problemId || !sourceCode) {
      return res.status(400).json({ error: 'problemId and sourceCode are required' });
    }

    const problem = await Problem.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(problemId) ? problemId : null },
        { slug: problemId }
      ]
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Execute full submission against visible + hidden test cases
    const visibleCases = problem.sampleTestCases || [];
    const hiddenCases = problem.hiddenTestCases || [];
    if (visibleCases.length === 0 || hiddenCases.length === 0) {
      return res.status(422).json({ error: 'This problem is not ready for submission because its test cases are incomplete.' });
    }
    const execResult = await codeExecutionService.executeFullSubmission(sourceCode, visibleCases, hiddenCases);

    const subId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    let aiCodeAnalysis = null;
    try {
      const staticAnalysis = await pythonService.analyzeCodeStatic(sourceCode, language);
      if (staticAnalysis) {
        aiCodeAnalysis = {
          timeComplexity: staticAnalysis.estimated_time_complexity || 'Unknown',
          spaceComplexity: staticAnalysis.estimated_space_complexity || 'Unknown',
          confidence: Number(staticAnalysis.confidence || 0),
          evidence: Array.isArray(staticAnalysis.evidence) ? staticAnalysis.evidence : [],
          whatDidWell: [],
          whatCanBeImproved: Array.isArray(staticAnalysis.potential_anti_patterns) ? staticAnalysis.potential_anti_patterns : []
        };
      }
    } catch (_) {
      // Analysis is optional; execution and persistence must not claim an AI result.
    }

    // Save the execution result and any real AI analysis to MongoDB.
    const submission = await Submission.create({
      submissionId: subId,
      userId,
      problemId: problem._id,
      sessionId: sessionId || subId,
      language: language || 'cpp17',
      sourceCode,
      status: execResult.verdict,
      visibleTests: {
        passed: execResult.visibleTests.filter(t => t.passed).length,
        total: execResult.visibleTests.length
      },
      hiddenTests: {
        passed: execResult.hiddenTests.filter(t => t.passed).length,
        total: execResult.hiddenTests.length
      },
      testCasesPassed: execResult.totalPassed,
      totalTestCases: execResult.totalCases,
      executionTimeMs: execResult.executionResults[0]?.timeMs || 15,
      runtimeMs: execResult.executionResults[0]?.timeMs || 15,
      memoryKb: 1024,
      compilerOutput: execResult.compileError || '',
      isPublic: true,
      ...(aiCodeAnalysis ? { aiCodeAnalysis } : {})
    });

    // Record Activity
    await Activity.create({
      userId,
      type: 'submission',
      title: execResult.verdict === 'Accepted' ? `Solved ${problem.title}` : `Submitted ${problem.title}`,
      description: `Status: ${execResult.verdict} (${execResult.totalPassed}/${execResult.totalCases} tests passed)`,
      targetSlug: problem.slug
    });

    // Sync User Stats, Streaks, Achievements & Solved Problems
    await syncUserStatsAndAchievements(userId);

    // Generate code-grounded understanding questions. If AI is unavailable, do
    // not fabricate questions or claim that analysis completed.
    let understandingQuestions = [];
    try {
      understandingQuestions = await pythonService.generateUnderstandingQuestions(
        sourceCode,
        problem.title,
        language
      );
    } catch (_) { /* AI service is optional; return no questions when unavailable. */ }

    return res.json({
      verdict: execResult.verdict,
      totalPassed: execResult.totalPassed,
      totalCases: execResult.totalCases,
      durationSeconds: 0,
      submissionId: subId,
      aiAnalysis: submission.aiCodeAnalysis,
      understandingQuestions,
      executionResults: execResult.executionResults
    });
  } catch (err) {
    console.error('Error in /submit:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Failed to evaluate submission.' });
  }
});

// ------------------------------------------------------------------
// 4. Verify Viva (POST /api/submissions/verify)
// ------------------------------------------------------------------
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { questions = [], userAnswers = {}, code, problemTitle, sessionId } = req.body;
    let correctCount = 0;

    questions.forEach(q => {
      const userAns = userAnswers[q.id];
      const expectedAns = q.correct_answer || (q.options ? q.options[q.correct_option_index] : '');
      if (userAns && String(userAns).trim() === String(expectedAns).trim()) {
        correctCount++;
      }
    });

    const totalQ = questions.length || 1;
    const score = Math.round((correctCount / totalQ) * 100);

    if (sessionId) {
      await Submission.findOneAndUpdate(
        { userId: req.user.id || req.user._id, $or: [{ sessionId }, { submissionId: sessionId }] },
        { $set: { understandingScore: score } }
      );
    }

    return res.json({
      score,
      verdict: score >= 70 ? 'Passed' : 'Needs Review',
      masteryStatus: score >= 80 ? 'Mastered' : 'Practicing'
    });
  } catch (err) {
    console.error('Error in /verify:', err);
    return res.status(500).json({ error: 'Failed to verify viva answers.' });
  }
});

// ------------------------------------------------------------------
// 5. Get Session Report (GET /api/submissions/report/:sessionId)
// ------------------------------------------------------------------
router.get('/report/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const submission = await Submission.findOne({
      $or: [{ sessionId }, { submissionId: sessionId }]
    }).populate('problemId').lean();

    if (!submission) {
      return res.status(404).json({ error: 'Report not found for session' });
    }

    const currentUserId = (req.user.id || req.user._id).toString();
    const subUserId = submission.userId?._id ? submission.userId._id.toString() : submission.userId?.toString();
    const isOwner = Boolean(subUserId && subUserId === currentUserId);

    if (!isOwner && !submission.isPublic) {
      return res.status(403).json({ error: 'Access denied to private coding report' });
    }

    const attemptCount = await Submission.countDocuments({
      userId: submission.userId,
      problemId: submission.problemId
    });

    return res.json({
      sessionId,
      submissionId: submission.submissionId,
      submission: {
        ...submission,
        sourceCode: isOwner || submission.isPublic ? submission.sourceCode : null,
        compilerOutput: isOwner ? submission.compilerOutput : null,
        aiCodeAnalysis: isOwner ? submission.aiCodeAnalysis : null
      },
      problem: submission.problemId,
      status: submission.status,
      sourceCode: isOwner || submission.isPublic ? submission.sourceCode : null,
      codeScore: submission.codeScore || 100,
      understandingScore: submission.understandingScore || 100,
      attemptCount,
      aiCodeAnalysis: isOwner ? submission.aiCodeAnalysis : null,
      compilerOutput: isOwner ? submission.compilerOutput : null,
      visibleTests: submission.visibleTests,
      hiddenTests: isOwner ? submission.hiddenTests : { passed: submission.hiddenTests?.passed || 0, total: submission.hiddenTests?.total || 0 },
      submittedAt: submission.submittedAt,
      isOwner
    });
  } catch (err) {
    console.error('Error fetching report:', err);
    return res.status(500).json({ error: 'Failed to retrieve coding report' });
  }
});

// ------------------------------------------------------------------
// 6. Get Submissions List (GET /api/submissions)
// ------------------------------------------------------------------
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { problemId, status, language, username, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    if (username) {
      const targetUser = await User.findOne({
        $or: [{ username }, { normalizedUsername: username.toLowerCase() }]
      });
      if (!targetUser) {
        return res.json({ submissions: [], total: 0, page: 1, totalPages: 0 });
      }
      filter.userId = targetUser._id;
    } else if (req.user) {
      filter.userId = req.user.id || req.user._id;
    }

    if (problemId) {
      if (mongoose.Types.ObjectId.isValid(problemId)) {
        filter.problemId = problemId;
      } else {
        const prob = await Problem.findOne({ slug: problemId });
        if (prob) filter.problemId = prob._id;
      }
    }

    if (status) filter.status = status;
    if (language) filter.language = language;

    // Check privacy rule: If viewing someone else's submissions, enforce visibility
    const currentUserId = req.user ? (req.user.id || req.user._id).toString() : null;
    if (filter.userId && currentUserId && filter.userId.toString() !== currentUserId) {
      filter.isPublic = true;
    }

    const total = await Submission.countDocuments(filter);
    const submissions = await Submission.find(filter)
      .populate('problemId', 'title slug difficulty topics')
      .populate('userId', 'username displayName avatar')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formattedSubmissions = submissions.map(s => {
      const isOwner = currentUserId && s.userId && s.userId._id.toString() === currentUserId;
      return {
        _id: s._id,
        submissionId: s.submissionId,
        problem: s.problemId ? {
          _id: s.problemId._id,
          title: s.problemId.title,
          slug: s.problemId.slug,
          difficulty: s.problemId.difficulty
        } : null,
        user: s.userId ? {
          username: s.userId.username,
          displayName: s.userId.displayName || s.userId.username,
          avatar: s.userId.avatar
        } : null,
        status: s.status,
        language: s.language,
        runtimeMs: s.runtimeMs || s.executionTimeMs || 15,
        memoryKb: s.memoryKb || 1024,
        submittedAt: s.submittedAt,
        isPublic: s.isPublic,
        isOwner,
        sourceCode: isOwner || s.isPublic ? s.sourceCode : null
      };
    });

    return res.json({
      submissions: formattedSubmissions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    console.error('Error in GET /submissions:', err);
    return res.status(500).json({ error: 'Failed to retrieve submissions' });
  }
});

// ------------------------------------------------------------------
// 7. Get Single Submission Detail (GET /api/submissions/:submissionId)
// ------------------------------------------------------------------
router.get('/:submissionId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await Submission.findOne({
      $or: [
        { submissionId },
        { _id: mongoose.Types.ObjectId.isValid(submissionId) ? submissionId : null }
      ]
    })
      .populate('problemId')
      .populate('userId', 'username displayName avatar privacyPreferences')
      .lean();

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const currentUserId = req.user ? (req.user.id || req.user._id).toString() : null;
    const subUserId = submission.userId?._id ? submission.userId._id.toString() : submission.userId?.toString();
    const isOwner = Boolean(currentUserId && subUserId && subUserId === currentUserId);

    // Check code privacy authorization
    const isCodeAllowed = isOwner || submission.isPublic;

    return res.json({
      submissionId: submission.submissionId,
      problem: submission.problemId,
      user: {
        username: submission.userId?.username,
        displayName: submission.userId?.displayName || submission.userId?.username,
        avatar: submission.userId?.avatar
      },
      status: submission.status,
      language: submission.language,
      runtimeMs: submission.runtimeMs || submission.executionTimeMs || 15,
      memoryKb: submission.memoryKb || 1024,
      testCasesPassed: submission.testCasesPassed,
      totalTestCases: submission.totalTestCases,
      visibleTests: submission.visibleTests,
      hiddenTests: isOwner ? submission.hiddenTests : { passed: submission.hiddenTests?.passed || 0, total: submission.hiddenTests?.total || 0 },
      aiCodeAnalysis: isOwner ? submission.aiCodeAnalysis : null,
      compilerOutput: isOwner ? submission.compilerOutput : null,
      codeScore: submission.codeScore,
      understandingScore: submission.understandingScore,
      submittedAt: submission.submittedAt,
      sourceCode: isCodeAllowed ? submission.sourceCode : null,
      isPublic: submission.isPublic,
      isOwner
    });
  } catch (err) {
    console.error('Error fetching submission detail:', err);
    return res.status(500).json({ error: 'Failed to retrieve submission detail' });
  }
});

module.exports = router;
