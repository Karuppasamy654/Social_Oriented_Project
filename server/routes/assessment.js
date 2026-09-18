const express = require('express');
const router = express.Router();
const { authMiddleware: auth } = require('../middleware/auth');
const User = require('../models/User');
const Assessment = require('../models/Assessment');
const { getAssessmentQuestions, evaluateAssessment } = require('../ai/skillAssessmentService');

// Start Assessment Quiz (Returns 10 topic-targeted questions based on user input)
router.post('/start', async (req, res) => {
  try {
    const { selfReportedLevel = 'Beginner', selectedTopic = 'Array', userTextInput = '' } = req.body;
    const inputText = userTextInput || selectedTopic || 'Array';
    const questions = getAssessmentQuestions(selfReportedLevel, inputText);
    return res.json({
      topic: inputText,
      level: selfReportedLevel,
      questionsCount: questions.length,
      questions
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Get Questions (GET fallback)
router.get('/questions', async (req, res) => {
  try {
    const level = req.query.level || 'Beginner';
    const topic = req.query.topic || 'Array';
    const questions = getAssessmentQuestions(level, topic);
    return res.json({ questions });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Submit Assessment Answers & Evaluate via ML Classifier
router.post('/submit', auth, async (req, res) => {
  try {
    const { userAnswers = [], selfReportedLevel = 'Beginner' } = req.body;
    const userId = req.user.id || req.user._id;

    // Evaluate answers with Random Forest ML service
    const evalResult = evaluateAssessment(userAnswers, selfReportedLevel);

    const user = await User.findById(userId);
    if (user) {
      user.level = evalResult.verifiedLevel;
      user.verifiedLevel = evalResult.verifiedLevel;
      user.skillConfidence = evalResult.confidenceScore;
      user.isOnboarded = true;
      await user.save();

      // Save Assessment record
      const assessment = new Assessment({
        userId: user._id,
        score: Math.round((userAnswers.filter(a => a.isCorrect).length / Math.max(1, userAnswers.length)) * 100),
        predictedLevel: evalResult.verifiedLevel,
        confidenceScore: evalResult.confidenceScore
      });
      await assessment.save();
    }

    return res.json({
      selfAssessment: evalResult.selfAssessment,
      aiAssessment: evalResult.aiAssessment,
      verifiedLevel: evalResult.verifiedLevel,
      confidenceScore: evalResult.confidenceScore,
      reasoning: evalResult.reasoning,
      user
    });
  } catch (err) {
    console.error('Assessment submit error:', err);
    return res.status(500).json({ message: 'Failed to process assessment prediction' });
  }
});

module.exports = router;

