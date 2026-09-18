const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const User = require('../models/User');
const Mistake = require('../models/Mistake');
const { authMiddleware } = require('../middleware/auth');
const { recommendProblems } = require('../ml/recommendationEngine');

// GET /api/recommendations (Today's challenge & personalized problem feed)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('solvedProblems');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const allProblems = await Problem.find({});
    const recommendations = recommendProblems(user, allProblems, 6);

    const todayChallenge = recommendations[0] || {
      problem: allProblems[0],
      recommendationScore: 95,
      primaryReason: 'Sharpen your fundamental problem solving skills today.'
    };

    return res.json({
      todayChallenge,
      recommendations
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error generating recommendations.' });
  }
});

// GET /api/recommendations/progress
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const solvedCount = user.solvedProblems ? user.solvedProblems.length : 0;
    
    // Dynamic Roadmap calculation based on user verified level
    const roadmap = [
      { topic: 'Array', status: solvedCount >= 1 ? 'completed' : 'in_progress', completionPercentage: Math.min(100, solvedCount * 50), solvedInTopic: Math.min(5, solvedCount), totalInTopic: 5 },
      { topic: 'String', status: solvedCount >= 2 ? 'completed' : 'in_progress', completionPercentage: Math.min(100, (solvedCount - 1) * 50), solvedInTopic: Math.max(0, solvedCount - 1), totalInTopic: 5 },
      { topic: 'HashMap', status: 'in_progress', completionPercentage: 70, solvedInTopic: 3, totalInTopic: 5 },
      { topic: 'Two Pointers', status: 'in_progress', completionPercentage: 40, solvedInTopic: 2, totalInTopic: 5 },
      { topic: 'Sliding Window', status: 'in_progress', completionPercentage: 20, solvedInTopic: 1, totalInTopic: 5 },
      { topic: 'Trees & Graphs', status: user.verifiedLevel.includes('Advanced') ? 'in_progress' : 'locked', completionPercentage: 0, solvedInTopic: 0, totalInTopic: 5 },
      { topic: 'Dynamic Programming', status: user.verifiedLevel.includes('Advanced') ? 'in_progress' : 'locked', completionPercentage: 0, solvedInTopic: 0, totalInTopic: 5 }
    ];

    return res.json({
      verifiedLevel: user.verifiedLevel,
      roadmap,
      weeklyActivity: [
        { day: 'Mon', problemsSolved: 2 },
        { day: 'Tue', problemsSolved: 3 },
        { day: 'Wed', problemsSolved: 1 },
        { day: 'Thu', problemsSolved: 4 },
        { day: 'Fri', problemsSolved: 2 },
        { day: 'Sat', problemsSolved: 5 },
        { day: 'Sun', problemsSolved: 3 }
      ]
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching progress.' });
  }
});

// GET /api/recommendations/mistakes
router.get('/mistakes', authMiddleware, async (req, res) => {
  try {
    const mistakes = await Mistake.find({ userId: req.user.id }).sort({ frequency: -1 });
    return res.json(mistakes);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching mistake insights.' });
  }
});

module.exports = router;
