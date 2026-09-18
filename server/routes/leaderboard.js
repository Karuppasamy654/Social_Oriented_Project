const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Submission = require('../models/Submission');
const Follow = require('../models/Follow');
const { optionalAuthMiddleware } = require('../middleware/auth');

// GET /api/leaderboard (Support type: solved, rating, streak; timeframe: all_time, monthly, weekly)
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { type = 'solved', timeframe = 'all_time', page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Filter date for timeframes
    let dateFilter = null;
    const now = new Date();
    if (timeframe === 'weekly') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      dateFilter = weekStart;
    } else if (timeframe === 'monthly') {
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 30);
      dateFilter = monthStart;
    }

    let users = [];
    if (type === 'solved') {
      // Aggregate distinct accepted solved problems per user
      const matchStage = { status: { $in: ['accepted', 'Accepted'] } };
      if (dateFilter) {
        matchStage.submittedAt = { $gte: dateFilter };
      }

      const aggregation = await Submission.aggregate([
        { $match: matchStage },
        { $group: { _id: { userId: "$userId", problemId: "$problemId" } } },
        { $group: { _id: "$_id.userId", solvedCount: { $sum: 1 } } },
        { $sort: { solvedCount: -1, _id: 1 } }
      ]);

      const solvedCountMap = {};
      aggregation.forEach(item => {
        solvedCountMap[item._id.toString()] = item.solvedCount;
      });

      const userDocs = await User.find({})
        .select('username displayName name avatar verifiedLevel codingStats createdAt')
        .lean();

      users = userDocs.map(u => {
        const uIdStr = u._id.toString();
        const solvedCount = timeframe === 'all_time'
          ? (solvedCountMap[uIdStr] || u.codingStats?.totalSolved || 0)
          : (solvedCountMap[uIdStr] || 0);

        return {
          _id: u._id,
          username: u.username,
          displayName: u.displayName || u.name || u.username,
          avatar: u.avatar,
          verifiedLevel: u.verifiedLevel || 'Beginner',
          solvedCount,
          accuracy: u.codingStats ? u.codingStats.accuracy : 100,
          rating: u.codingStats ? u.codingStats.rating : 1200,
          streak: u.codingStats ? u.codingStats.currentStreak : 0,
          xp: u.codingStats ? u.codingStats.xp : 100,
          createdAt: u.createdAt
        };
      });

      // Deterministic tie handling: primary = solvedCount DESC, secondary = rating DESC, tertiary = createdAt ASC
      users.sort((a, b) => {
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

    } else if (type === 'rating') {
      const userDocs = await User.find({})
        .select('username displayName name avatar verifiedLevel codingStats createdAt')
        .sort({ 'codingStats.rating': -1, 'codingStats.totalSolved': -1, createdAt: 1 })
        .lean();

      users = userDocs.map(u => ({
        _id: u._id,
        username: u.username,
        displayName: u.displayName || u.name || u.username,
        avatar: u.avatar,
        verifiedLevel: u.verifiedLevel || 'Beginner',
        solvedCount: u.codingStats ? u.codingStats.totalSolved : 0,
        accuracy: u.codingStats ? u.codingStats.accuracy : 100,
        rating: u.codingStats ? u.codingStats.rating : 1200,
        streak: u.codingStats ? u.codingStats.currentStreak : 0,
        xp: u.codingStats ? u.codingStats.xp : 100,
        createdAt: u.createdAt
      }));

    } else { // streak
      const userDocs = await User.find({})
        .select('username displayName name avatar verifiedLevel codingStats createdAt')
        .sort({ 'codingStats.currentStreak': -1, 'codingStats.totalSolved': -1, createdAt: 1 })
        .lean();

      users = userDocs.map(u => ({
        _id: u._id,
        username: u.username,
        displayName: u.displayName || u.name || u.username,
        avatar: u.avatar,
        verifiedLevel: u.verifiedLevel || 'Beginner',
        solvedCount: u.codingStats ? u.codingStats.totalSolved : 0,
        accuracy: u.codingStats ? u.codingStats.accuracy : 100,
        rating: u.codingStats ? u.codingStats.rating : 1200,
        streak: u.codingStats ? u.codingStats.currentStreak : 0,
        xp: u.codingStats ? u.codingStats.xp : 100,
        createdAt: u.createdAt
      }));
    }

    // Compute ranks
    const totalUsers = users.length;
    const rankedUsers = users.map((u, idx) => ({
      rank: idx + 1,
      ...u
    }));

    // Find authenticated user's rank
    let meRank = null;
    if (req.user) {
      const currentUserId = (req.user.id || req.user._id).toString();
      const foundIdx = rankedUsers.findIndex(u => u._id.toString() === currentUserId);
      if (foundIdx !== -1) {
        meRank = rankedUsers[foundIdx];
      }
    }

    const paginatedLeaderboard = rankedUsers.slice(skip, skip + limitNum);

    return res.json({
      leaderboard: paginatedLeaderboard,
      total: totalUsers,
      page: pageNum,
      totalPages: Math.ceil(totalUsers / limitNum) || 1,
      me: meRank,
      metric: type,
      timeframe
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ message: 'Error fetching leaderboard.' });
  }
});

module.exports = router;
