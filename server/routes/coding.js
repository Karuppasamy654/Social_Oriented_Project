const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const pythonService = require('../services/pythonService');
const { authMiddleware } = require('../middleware/auth');

// POST /api/coding/analysis/start
router.post('/analysis/start', authMiddleware, async (req, res) => {
  try {
    const { submission_id, submissionId } = req.body;
    const targetSubId = submission_id || submissionId;

    if (!targetSubId) {
      return res.status(400).json({ error: 'submission_id is required' });
    }

    const submission = await Submission.findOne({ submissionId: targetSubId });
    if (!submission) {
      return res.status(404).json({ error: 'Submission snapshot not found' });
    }

    const problem = await Problem.findById(submission.problemId);
    const questions = await pythonService.generateUnderstandingQuestions(
      submission.sourceCode,
      problem ? problem.title : 'Two Sum',
      'cpp17'
    );

    return res.json({
      submissionId: submission.submissionId,
      sourceCode: submission.sourceCode,
      aiCodeAnalysis: submission.aiCodeAnalysis,
      questions
    });
  } catch (err) {
    console.error('Error in /analysis/start:', err);
    return res.status(500).json({ error: 'Failed to analyze submission' });
  }
});

// POST /api/coding/viva/start
router.post('/viva/start', authMiddleware, async (req, res) => {
  try {
    const { submission_id, submissionId } = req.body;
    const targetSubId = submission_id || submissionId;

    if (!targetSubId) {
      return res.status(400).json({ error: 'submission_id is required' });
    }

    const submission = await Submission.findOne({ submissionId: targetSubId });
    if (!submission) {
      return res.status(404).json({ error: 'Submission snapshot not found' });
    }

    const problem = await Problem.findById(submission.problemId);
    const vivaData = await pythonService.startVivaSession(
      submission.submissionId,
      submission.sourceCode,
      problem ? problem.slug : 'two-sum',
      problem ? problem.title : 'Two Sum'
    );

    if (!vivaData) {
      return res.status(500).json({ error: 'Failed to start Viva session in AI microservice' });
    }

    return res.json(vivaData);
  } catch (err) {
    console.error('Error in /viva/start:', err);
    return res.status(500).json({ error: 'Failed to start Viva session' });
  }
});

// POST /api/coding/viva/answer
router.post('/viva/answer', authMiddleware, async (req, res) => {
  try {
    const { viva_session_id, question_id, selected_index } = req.body;
    if (!viva_session_id || !question_id || selected_index === undefined) {
      return res.status(400).json({ error: 'viva_session_id, question_id, and selected_index are required' });
    }

    const vivaData = await pythonService.answerVivaQuestion(viva_session_id, question_id, selected_index);
    if (!vivaData) {
      return res.status(500).json({ error: 'Failed to record Viva answer' });
    }

    // Update submission record if completed
    if (vivaData.submission_id && vivaData.status !== 'active') {
      await Submission.findOneAndUpdate(
        { submissionId: vivaData.submission_id },
        { $set: { understandingScore: Math.round((vivaData.score || 0) * 100) } }
      );
    }

    return res.json(vivaData);
  } catch (err) {
    console.error('Error in /viva/answer:', err);
    return res.status(500).json({ error: 'Failed to process Viva answer' });
  }
});

// POST /api/coding/viva/next
router.post('/viva/next', authMiddleware, async (req, res) => {
  try {
    const { viva_session_id } = req.body;
    if (!viva_session_id) {
      return res.status(400).json({ error: 'viva_session_id is required' });
    }

    const vivaData = await pythonService.getVivaSession(viva_session_id);
    return res.json(vivaData);
  } catch (err) {
    console.error('Error in /viva/next:', err);
    return res.status(500).json({ error: 'Failed to fetch next Viva question' });
  }
});

// POST /api/coding/viva/finish
router.post('/viva/finish', authMiddleware, async (req, res) => {
  try {
    const { viva_session_id } = req.body;
    if (!viva_session_id) {
      return res.status(400).json({ error: 'viva_session_id is required' });
    }

    const vivaData = await pythonService.getVivaSession(viva_session_id);
    return res.json(vivaData);
  } catch (err) {
    console.error('Error in /viva/finish:', err);
    return res.status(500).json({ error: 'Failed to finalize Viva session' });
  }
});

// GET /api/coding/report/:sessionId
router.get('/report/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const submission = await Submission.findOne({ $or: [{ sessionId }, { submissionId: sessionId }] })
      .populate('problemId')
      .lean();

    if (!submission) {
      return res.status(404).json({ error: 'Report not found for session' });
    }

    return res.json({
      sessionId,
      submissionId: submission.submissionId,
      problem: submission.problemId,
      status: submission.status,
      sourceCode: submission.sourceCode,
      codeScore: submission.codeScore,
      understandingScore: submission.understandingScore,
      aiCodeAnalysis: submission.aiCodeAnalysis,
      detectedMistakes: submission.detectedMistakes,
      visibleTests: submission.visibleTests,
      hiddenTests: submission.hiddenTests,
      submittedAt: submission.submittedAt
    });
  } catch (err) {
    console.error('Error in /report/:sessionId:', err);
    return res.status(500).json({ error: 'Failed to retrieve coding report' });
  }
});

module.exports = router;
