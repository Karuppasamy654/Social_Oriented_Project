const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// GET /api/problems/stats/overview - Dataset distribution stats
router.get('/stats/overview', async (req, res) => {
  try {
    const activeFilter = { isActive: { $ne: false } };
    const total = await Problem.countDocuments(activeFilter);
    const easy = await Problem.countDocuments({ difficulty: 'Easy', ...activeFilter });
    const medium = await Problem.countDocuments({ difficulty: 'Medium', ...activeFilter });
    const hard = await Problem.countDocuments({ difficulty: 'Hard', ...activeFilter });

    const topicAggregation = await Problem.aggregate([
      { $match: activeFilter },
      { $unwind: "$topics" },
      { $group: { _id: "$topics", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return res.json({
      total,
      difficultyDistribution: { Easy: easy, Medium: medium, Hard: hard },
      topicCounts: topicAggregation.map(item => ({ topic: item._id, count: item.count }))
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching dataset statistics.' });
  }
});

// GET /api/problems - Paginated, filtered list of problems
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { 
      difficulty, topic, company, search, level, language,
      page = 1, limit = 12
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (topic && topic !== 'All') filter.topics = topic;
    if (company && company !== 'All') filter.companies = company;
    if (level && level !== 'All') filter.levelTier = level;
    if (language && language !== 'All') filter.supportedLanguages = language;

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { topics: searchRegex },
        { description: searchRegex }
      ];
    }

    const totalRecords = await Problem.countDocuments(filter);
    const problems = await Problem.find(filter)
      .select('-hiddenTestCases')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Calculate real student status if user is authenticated
    let userSubmissionsMap = {};
    if (req.user) {
      const submissions = await Submission.find({ userId: req.user.id }).select('problemId status');
      submissions.forEach(sub => {
        const pid = sub.problemId.toString();
        if (sub.status === 'Accepted') {
          userSubmissionsMap[pid] = 'Solved';
        } else if (!userSubmissionsMap[pid]) {
          userSubmissionsMap[pid] = 'Attempted';
        }
      });
    }

    const enrichedProblems = problems.map(prob => {
      const probObj = prob.toObject();
      probObj.status = userSubmissionsMap[prob._id.toString()] || 'Not Attempted';
      return probObj;
    });

    return res.json({
      problems: enrichedProblems,
      pagination: {
        total: totalRecords,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalRecords / limitNum),
        hasMore: pageNum * limitNum < totalRecords
      }
    });
  } catch (err) {
    console.error('Error fetching problems:', err);
    return res.status(500).json({ message: 'Error fetching problem library.' });
  }
});

// GET /api/problems/slug/:slug - Detail by slug
router.get('/slug/:slug', optionalAuthMiddleware, async (req, res) => {
  try {
    const problem = await Problem.findOne({ slug: req.params.slug, isActive: { $ne: false } }).select('-hiddenTestCases');
    if (!problem) return res.status(404).json({ message: 'Problem not found.' });

    const probObj = problem.toObject();
    if (req.user) {
      const userSubs = await Submission.find({ userId: req.user.id, problemId: problem._id });
      const hasSolved = userSubs.some(s => s.status === 'Accepted');
      probObj.userStatus = hasSolved ? 'Solved' : userSubs.length > 0 ? 'Attempted' : 'Not Attempted';
      probObj.userAttemptsCount = userSubs.length;
    } else {
      probObj.userStatus = 'Not Attempted';
      probObj.userAttemptsCount = 0;
    }

    return res.json(probObj);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching problem details.' });
  }
});

// GET /api/problems/:id - Flexible Detail by ID or Slug
router.get('/:id', optionalAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    let problem = null;

    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      problem = await Problem.findById(id).select('-hiddenTestCases');
    }

    if (!problem) {
      problem = await Problem.findOne({
        $or: [{ slug: id }, { id: parseInt(id, 10) || -1 }],
        isActive: { $ne: false }
      }).select('-hiddenTestCases');
    }

    if (!problem) return res.status(404).json({ message: 'Problem not found.' });
    return res.json(problem);
  } catch (err) {
    console.error('Fetch problem by ID/slug error:', err);
    return res.status(500).json({ message: 'Error fetching problem detail.' });
  }
});

module.exports = router;

