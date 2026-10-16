const express = require('express');
const fs = require('fs');
const path = require('path');
const InterviewSession = require('../models/InterviewSession');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { startInterviewSession, evaluateQuestionSubmission, selectNextAdaptiveQuestion, evaluateInterview, getInterviewRoundConfig } = require('../ai/interviewService');

const router = express.Router();

function loadCompanies() {
  const file = path.join(__dirname, '../../data/interviews/company_roles.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).companies || [];
}

async function toClientQuestion(question, index) {
  const prob = question.problemId && question.problemId._id
    ? question.problemId
    : (question.slug ? await Problem.findOne({ slug: question.slug }) : null);

  const sampleTestCases = (prob && prob.sampleTestCases && prob.sampleTestCases.length > 0)
    ? prob.sampleTestCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput, explanation: tc.explanation }))
    : [{ input: "nums = [2, 7, 11, 15], target = 9", expectedOutput: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." }];

  return {
    question_id: `coding_${index + 1}`,
    canonical_question: question.title,
    question_text: question.description,
    coding_problem_slug: question.slug,
    difficulty: String(question.difficulty || 'Medium').toLowerCase(),
    topics: question.topics || [],
    starterCode: question.starterCode || (prob ? prob.starterCode : {}),
    sampleTestCases
  };
}

function isExpired(session) {
  return new Date() >= new Date(session.endsAt);
}

async function finishSession(session) {
  if (session.status === 'in_progress') session.status = 'completed';
  const evaluation = evaluateInterview({ questions: session.questions, performanceHistory: session.performanceHistory, mistakesDetected: session.mistakesDetected || [] });
  session.evaluation = {
    overallScore: evaluation.overallScore || 0,
    problemSolving: evaluation.problemSolving || 0,
    codingScore: evaluation.codingScore || 0,
    communicationScore: 0,
    complexityAnalysisScore: evaluation.complexityAnalysisScore || 0,
    edgeCasesScore: evaluation.edgeCasesScore || 0,
    codeQualityScore: evaluation.codeQualityScore || 0,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
    recommendations: evaluation.recommendations
  };
  await session.save();
  return evaluation;
}

router.get('/companies', optionalAuthMiddleware, (req, res) => {
  const companies = loadCompanies().map(({ id, name, roles }) => ({ id, name, roles }));
  return res.json({ companies, totalCompanies: companies.length });
});

router.get('/roles', optionalAuthMiddleware, (req, res) => {
  const company = loadCompanies().find(item => item.name.toLowerCase() === String(req.query.company || '').toLowerCase() || item.id === req.query.company);
  return res.json({ company: req.query.company || '', roles: company?.roles || [] });
});

router.post(['/session/start', '/start'], authMiddleware, async (req, res) => {
  try {
    const { company, role, level = 'Intermediate', durationMinutes } = req.body;
    const minutes = Number(durationMinutes);
    const roundConfig = getInterviewRoundConfig(minutes);
    if (!company || !roundConfig) return res.status(400).json({ message: 'Choose a 15- or 30-minute coding round.' });
    const companyMeta = loadCompanies().find(item => item.name.toLowerCase() === String(company).toLowerCase() || item.id === company);
    if (!companyMeta) return res.status(400).json({ message: 'Choose a company available in the verified interview dataset.' });
    if (!role || !companyMeta.roles.includes(role)) return res.status(400).json({ message: 'Choose a role listed for the selected company.' });

    const sessionData = await startInterviewSession({ userId: req.user.id, company: companyMeta.name, role, durationMinutes: minutes });
    if (!sessionData.questions?.length) return res.status(422).json({ message: 'No verified coding questions are available for this company.' });
    const session = await InterviewSession.create({
      ...sessionData,
      targetLevel: level,
      durationMinutes: roundConfig.durationMinutes,
      problemCount: roundConfig.problemCount,
      endsAt: new Date(Date.now() + roundConfig.durationMinutes * 60 * 1000),
      currentQIndex: 0
    });
    return res.status(201).json({
      sessionId: session._id,
      company: session.company,
      role: session.role,
      durationMinutes: session.durationMinutes,
      problemCount: session.problemCount,
      endsAt: session.endsAt,
      currentQuestion: await toClientQuestion(session.questions[0], 0)
    });
  } catch (err) {
    console.error('Start interview error:', err);
    return res.status(500).json({ message: 'Could not start the coding interview.' });
  }
});

router.get(['/session/:sessionId', '/:id'], authMiddleware, async (req, res) => {
  const session = await InterviewSession.findOne({ _id: req.params.sessionId || req.params.id, userId: req.user.id });
  if (!session) return res.status(404).json({ message: 'Interview session not found.' });
  return res.json(session);
});

router.post(['/answer', '/:id/submit-question', '/:id/answer'], authMiddleware, async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.params.id;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Interview session not found.' });
    if (session.status === 'terminated_integrity') {
      const report = await finishSession(session);
      return res.status(409).json({ terminated: true, completed: true, message: 'Interview session terminated due to integrity threshold.', report });
    }
    if (session.status !== 'in_progress' || isExpired(session)) {
      const report = await finishSession(session);
      return res.status(409).json({ completed: true, message: 'Time is over; your completed work has been evaluated.', report });
    }

    const index = session.currentQIndex;
    if (!req.body.userCode?.trim()) return res.status(400).json({ message: 'Submit code for the current question.' });
    const result = await evaluateQuestionSubmission({ 
      session, 
      questionIndex: index, 
      userCode: req.body.userCode, 
      language: 'cpp', 
      timeSpent: Math.max(0, Number(req.body.durationSeconds) || 0),
      runOnly: Boolean(req.body.runOnly)
    });
    return res.json({ success: true, evaluation: result, completed: session.performanceHistory.length >= session.problemCount });
  } catch (err) {
    console.error('Error submitting answer:', err);
    return res.status(err.statusCode || 500).json({ message: err.message || 'Could not evaluate code.' });
  }

});

router.post(['/question/next', '/:id/next'], authMiddleware, async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.params.id;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Interview session not found.' });
    if (session.status !== 'in_progress' || isExpired(session) || session.performanceHistory.length >= session.problemCount) {
      const report = await finishSession(session);
      return res.json({ completed: true, report, nextQuestion: null });
    }
    const evaluatedCount = session.performanceHistory?.length || 0;
    if (evaluatedCount <= session.currentQIndex && session.questions[session.currentQIndex]?.status !== 'evaluated') {
      return res.status(409).json({ message: 'Submit the current coding question before continuing.' });
    }
    const question = await selectNextAdaptiveQuestion({ session });
    if (!question) return res.json({ completed: true, report: await finishSession(session), nextQuestion: null });
    return res.json({ completed: false, nextQuestion: await toClientQuestion(question, session.currentQIndex) });
  } catch (err) {
    return res.status(500).json({ message: 'Could not select the next coding question.' });
  }
});

router.post(['/session/finish', '/:id/submit'], authMiddleware, async (req, res) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.body.sessionId || req.params.id, userId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Interview session not found.' });
    const evaluation = await finishSession(session);
    return res.json({
      status: session.status,
      report: {
        scores: {
          overall_score: evaluation.overallScore,
          sub_scores: {
            coding: evaluation.codingScore,
            problem_solving: evaluation.problemSolving,
            complexity: evaluation.complexityAnalysisScore,
            code_quality: evaluation.codeQualityScore,
            communication: 'Not Applicable'
          }
        },
        feedback: {
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          actionable_plan: evaluation.recommendations
        },
        evidenceSummary: evaluation.evidenceSummary,
        mlPrediction: evaluation.mlPrediction
      }
    });

  } catch (err) {
    return res.status(500).json({ message: 'Error finishing session.' });
  }
});


router.post('/integrity-event', authMiddleware, async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.body.id;
    const session = await InterviewSession.findOne({ _id: sessionId, userId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Interview session not found.' });

    const eventType = req.body.eventType || 'unknown_event';
    session.antiCheatLogs.push({ event: eventType, timestamp: new Date() });

    const count = session.antiCheatLogs.length;
    let terminated = session.status === 'terminated_integrity';

    if (count >= 5 && !terminated) {
      session.status = 'terminated_integrity';
      terminated = true;
      await finishSession(session);
    } else {
      await session.save();
    }

    return res.json({
      success: true,
      integrityFlagCount: count,
      terminated,
      reason: terminated ? 'integrity_threshold_reached' : null,
      status: session.status,
      warning: count === 4 ? 'Integrity Warning: This interview has recorded 4 integrity events. At 5 events, the interview will be terminated.' : null
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error logging integrity event.' });
  }
});

router.get(['/report/:id', '/session/:id/report'], authMiddleware, async (req, res) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, userId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Interview session not found.' });
    const evaluation = evaluateInterview({ questions: session.questions, performanceHistory: session.performanceHistory, mistakesDetected: session.mistakesDetected || [] });
    return res.json({
      sessionId: session._id,
      status: session.status,
      report: {
        scores: {
          overall_score: evaluation.overallScore,
          sub_scores: {
            coding: evaluation.codingScore,
            problem_solving: evaluation.problemSolving,
            complexity: evaluation.complexityAnalysisScore,
            code_quality: evaluation.codeQualityScore,
            communication: 'Not Applicable'
          }
        },
        feedback: {
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          actionable_plan: evaluation.recommendations
        },
        evidenceSummary: evaluation.evidenceSummary,
        mlPrediction: evaluation.mlPrediction
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error retrieving report.' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  const history = await InterviewSession.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
  return res.json({ history, count: history.length });
});



module.exports = router;
