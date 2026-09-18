const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Submission = require('../models/Submission');
const Activity = require('../models/Activity');
const InterviewSession = require('../models/InterviewSession');
const Problem = require('../models/Problem');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// ------------------------------------------------------------------
// 1. User Search (GET /api/users/search?q=query&page=1&limit=10)
// ------------------------------------------------------------------
router.get('/search', optionalAuthMiddleware, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    if (!q || !q.trim()) {
      return res.json({ users: [], total: 0, page: 1, totalPages: 0 });
    }

    const queryStr = q.trim();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const searchRegex = new RegExp(queryStr, 'i');

    const filter = {
      $or: [
        { username: searchRegex },
        { displayName: searchRegex },
        { name: searchRegex },
        { college: searchRegex },
        { organization: searchRegex },
        { skills: searchRegex },
        { 'privacyPreferences.emailDiscoverability': true, email: queryStr.toLowerCase() }
      ]
    };

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('username displayName name avatar bio college organization skills verifiedLevel codingStats createdAt')
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Check follow status if authenticated
    let currentUserId = req.user ? (req.user.id || req.user._id).toString() : null;
    let followingSet = new Set();
    if (currentUserId && users.length > 0) {
      const userIds = users.map(u => u._id);
      const follows = await Follow.find({
        followerId: currentUserId,
        followingId: { $in: userIds }
      }).lean();
      follows.forEach(f => followingSet.add(f.followingId.toString()));
    }

    const enrichedUsers = users.map(u => ({
      _id: u._id,
      username: u.username,
      displayName: u.displayName || u.name || u.username,
      avatar: u.avatar,
      bio: u.bio || '',
      college: u.college || '',
      organization: u.organization || '',
      skills: u.skills || [],
      verifiedLevel: u.verifiedLevel || 'Beginner',
      solvedCount: u.codingStats ? u.codingStats.totalSolved : 0,
      isFollowing: currentUserId ? followingSet.has(u._id.toString()) : false,
      isSelf: currentUserId ? currentUserId === u._id.toString() : false
    }));

    return res.json({
      users: enrichedUsers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1
    });
  } catch (err) {
    console.error('Error searching users:', err);
    return res.status(500).json({ message: 'Error searching users.' });
  }
});

// ------------------------------------------------------------------
// 2. Edit Authenticated User Profile (PUT /api/users/profile)
// ------------------------------------------------------------------
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      displayName, bio, location, college, organization,
      website, githubUrl, linkedinUrl, skills, avatar,
      privacyPreferences
    } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (displayName !== undefined) user.displayName = displayName.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (location !== undefined) user.location = location.trim();
    if (college !== undefined) user.college = college.trim();
    if (organization !== undefined) user.organization = organization.trim();
    if (website !== undefined) user.website = website.trim();
    if (githubUrl !== undefined) user.githubUrl = githubUrl.trim();
    if (linkedinUrl !== undefined) user.linkedinUrl = linkedinUrl.trim();
    if (avatar !== undefined && avatar.trim()) user.avatar = avatar.trim();
    if (Array.isArray(skills)) user.skills = skills.map(s => String(s).trim()).filter(Boolean);

    if (privacyPreferences && typeof privacyPreferences === 'object') {
      user.privacyPreferences = {
        ...user.privacyPreferences,
        ...privacyPreferences
      };
    }

    await user.save();

    return res.json({
      message: 'Profile updated successfully.',
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        college: user.college,
        organization: user.organization,
        website: user.website,
        githubUrl: user.githubUrl,
        linkedinUrl: user.linkedinUrl,
        skills: user.skills,
        privacyPreferences: user.privacyPreferences
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Failed to update profile.' });
  }
});

// ------------------------------------------------------------------
// 3. Get Follow Status (GET /api/users/:username/follow-status)
// ------------------------------------------------------------------
router.get('/:username/follow-status', optionalAuthMiddleware, async (req, res) => {
  try {
    const targetUser = await User.findOne({
      $or: [{ username: req.params.username }, { normalizedUsername: req.params.username.toLowerCase() }]
    });
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    const followersCount = await Follow.countDocuments({ followingId: targetUser._id });
    const followingCount = await Follow.countDocuments({ followerId: targetUser._id });

    let isFollowing = false;
    if (req.user) {
      const currentUserId = req.user.id || req.user._id;
      const follow = await Follow.findOne({ followerId: currentUserId, followingId: targetUser._id });
      isFollowing = !!follow;
    }

    return res.json({
      username: targetUser.username,
      followersCount,
      followingCount,
      isFollowing
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error checking follow status.' });
  }
});

// ------------------------------------------------------------------
// 4. Follow User (POST /api/users/:username/follow)
// ------------------------------------------------------------------
router.post(['/:username/follow', '/follow'], authMiddleware, async (req, res) => {
  try {
    const targetUsername = req.params.username || req.body.username;
    const currentUserId = req.user.id || req.user._id;

    const targetUser = await User.findOne({
      $or: [{ username: targetUsername }, { normalizedUsername: (targetUsername || '').toLowerCase() }]
    });

    if (!targetUser) return res.status(404).json({ message: 'Target user not found.' });

    if (targetUser._id.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    // Upsert follow record
    await Follow.findOneAndUpdate(
      { followerId: currentUserId, followingId: targetUser._id },
      { followerId: currentUserId, followingId: targetUser._id },
      { upsert: true, new: true }
    );

    // Record Activity
    await Activity.create({
      userId: currentUserId,
      type: 'follow',
      title: `Followed @${targetUser.username}`,
      description: `Started following ${targetUser.displayName || targetUser.name}`,
      targetSlug: targetUser.username
    });

    const followersCount = await Follow.countDocuments({ followingId: targetUser._id });
    const followingCount = await Follow.countDocuments({ followerId: targetUser._id });

    return res.json({
      success: true,
      isFollowing: true,
      followersCount,
      followingCount,
      message: `You are now following @${targetUser.username}`
    });
  } catch (err) {
    console.error('Follow user error:', err);
    return res.status(500).json({ message: 'Error following user.' });
  }
});

// ------------------------------------------------------------------
// 5. Unfollow User (DELETE or POST /api/users/:username/follow / unfollow)
// ------------------------------------------------------------------
router.delete(['/:username/follow', '/:username/unfollow'], authMiddleware, async (req, res) => {
  try {
    const targetUsername = req.params.username;
    const currentUserId = req.user.id || req.user._id;

    const targetUser = await User.findOne({
      $or: [{ username: targetUsername }, { normalizedUsername: targetUsername.toLowerCase() }]
    });

    if (!targetUser) return res.status(404).json({ message: 'Target user not found.' });

    await Follow.deleteOne({ followerId: currentUserId, followingId: targetUser._id });

    const followersCount = await Follow.countDocuments({ followingId: targetUser._id });
    const followingCount = await Follow.countDocuments({ followerId: targetUser._id });

    return res.json({
      success: true,
      isFollowing: false,
      followersCount,
      followingCount,
      message: `Unfollowed @${targetUser.username}`
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error unfollowing user.' });
  }
});

// ------------------------------------------------------------------
// 6. Get Followers (GET /api/users/:username/followers)
// ------------------------------------------------------------------
router.get('/:username/followers', optionalAuthMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const targetUser = await User.findOne({
      $or: [{ username }, { normalizedUsername: username.toLowerCase() }]
    });
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await Follow.countDocuments({ followingId: targetUser._id });
    const follows = await Follow.find({ followingId: targetUser._id })
      .populate('followerId', 'username displayName name avatar bio college organization skills verifiedLevel codingStats')
      .skip(skip)
      .limit(limitNum)
      .lean();

    let currentUserId = req.user ? (req.user.id || req.user._id).toString() : null;
    let followingSet = new Set();
    if (currentUserId && follows.length > 0) {
      const followerIds = follows.map(f => f.followerId?._id).filter(Boolean);
      const myFollows = await Follow.find({
        followerId: currentUserId,
        followingId: { $in: followerIds }
      }).lean();
      myFollows.forEach(mf => followingSet.add(mf.followingId.toString()));
    }

    const followers = follows.map(f => {
      const u = f.followerId || {};
      return {
        _id: u._id,
        username: u.username,
        displayName: u.displayName || u.name || u.username,
        avatar: u.avatar,
        bio: u.bio || '',
        college: u.college || '',
        organization: u.organization || '',
        skills: u.skills || [],
        verifiedLevel: u.verifiedLevel || 'Beginner',
        solvedCount: u.codingStats ? u.codingStats.totalSolved : 0,
        isFollowing: currentUserId && u._id ? followingSet.has(u._id.toString()) : false
      };
    }).filter(u => u._id);

    return res.json({ followers, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching followers.' });
  }
});

// ------------------------------------------------------------------
// 7. Get Following (GET /api/users/:username/following)
// ------------------------------------------------------------------
router.get('/:username/following', optionalAuthMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const targetUser = await User.findOne({
      $or: [{ username }, { normalizedUsername: username.toLowerCase() }]
    });
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await Follow.countDocuments({ followerId: targetUser._id });
    const follows = await Follow.find({ followerId: targetUser._id })
      .populate('followingId', 'username displayName name avatar bio college organization skills verifiedLevel codingStats')
      .skip(skip)
      .limit(limitNum)
      .lean();

    let currentUserId = req.user ? (req.user.id || req.user._id).toString() : null;
    let followingSet = new Set();
    if (currentUserId && follows.length > 0) {
      const followingIds = follows.map(f => f.followingId?._id).filter(Boolean);
      const myFollows = await Follow.find({
        followerId: currentUserId,
        followingId: { $in: followingIds }
      }).lean();
      myFollows.forEach(mf => followingSet.add(mf.followingId.toString()));
    }

    const following = follows.map(f => {
      const u = f.followingId || {};
      return {
        _id: u._id,
        username: u.username,
        displayName: u.displayName || u.name || u.username,
        avatar: u.avatar,
        bio: u.bio || '',
        college: u.college || '',
        organization: u.organization || '',
        skills: u.skills || [],
        verifiedLevel: u.verifiedLevel || 'Beginner',
        solvedCount: u.codingStats ? u.codingStats.totalSolved : 0,
        isFollowing: currentUserId && u._id ? followingSet.has(u._id.toString()) : false
      };
    }).filter(u => u._id);

    return res.json({ following, total, page: pageNum, totalPages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching following list.' });
  }
});

// ------------------------------------------------------------------
// 8. Get Complete Developer Profile (GET /api/users/profile/:username)
// ------------------------------------------------------------------
router.get(['/profile/:username', '/:username'], optionalAuthMiddleware, async (req, res) => {
  try {
    const usernameParam = req.params.username;
    const user = await User.findOne({
      $or: [{ username: usernameParam }, { normalizedUsername: usernameParam.toLowerCase() }]
    }).populate('solvedProblems', 'title slug difficulty topics').lean();

    if (!user) return res.status(404).json({ message: 'User profile not found.' });

    const currentUserId = req.user ? (req.user.id || req.user._id).toString() : null;
    const isSelf = currentUserId === user._id.toString();

    // 1. Social counts
    const followersCount = await Follow.countDocuments({ followingId: user._id });
    const followingCount = await Follow.countDocuments({ followerId: user._id });
    let isFollowing = false;
    if (currentUserId && !isSelf) {
      const followRecord = await Follow.findOne({ followerId: currentUserId, followingId: user._id });
      isFollowing = !!followRecord;
    }

    // 2. Real Submission Statistics
    const allSubmissions = await Submission.find({ userId: user._id }).lean();
    const totalSubmissionsCount = allSubmissions.length;

    // Distinct Solved Problems (Accepted status)
    const acceptedSubmissions = allSubmissions.filter(s =>
      s.status === 'accepted' || s.status === 'Accepted'
    );
    
    // Group distinct accepted problem IDs
    const acceptedProblemIds = new Set();
    const easySet = new Set();
    const mediumSet = new Set();
    const hardSet = new Set();
    const topicCountMap = {};

    acceptedSubmissions.forEach(sub => {
      const pIdStr = sub.problemId ? sub.problemId.toString() : null;
      if (pIdStr) {
        acceptedProblemIds.add(pIdStr);
      }
    });

    // Populate problem details for distinct solved problems
    const solvedProblemDocs = await Problem.find({ _id: { $in: Array.from(acceptedProblemIds) } })
      .select('title slug difficulty topics')
      .lean();

    solvedProblemDocs.forEach(p => {
      const diff = (p.difficulty || 'Easy').toLowerCase();
      if (diff === 'easy') easySet.add(p._id.toString());
      else if (diff === 'medium') mediumSet.add(p._id.toString());
      else if (diff === 'hard') hardSet.add(p._id.toString());

      (p.topics || []).forEach(t => {
        topicCountMap[t] = (topicCountMap[t] || 0) + 1;
      });
    });

    const totalSolved = acceptedProblemIds.size;
    const easySolved = easySet.size;
    const mediumSolved = mediumSet.size;
    const hardSolved = hardSet.size;
    const accuracy = totalSubmissionsCount > 0
      ? Math.round((acceptedSubmissions.length / totalSubmissionsCount) * 100)
      : 0;

    // Format Topic Statistics percentages
    const topicStats = Object.entries(topicCountMap).map(([topic, count]) => ({
      topic,
      solvedCount: count,
      percentage: totalSolved > 0 ? Math.round((count / totalSolved) * 100) : 0
    })).sort((a, b) => b.solvedCount - a.solvedCount);

    // 3. Activity Calendar & Streak Calculation
    const activeDates = new Set();
    const calendarCounts = {};

    allSubmissions.forEach(sub => {
      const dateStr = new Date(sub.submittedAt).toISOString().split('T')[0];
      activeDates.add(dateStr);
      calendarCounts[dateStr] = (calendarCounts[dateStr] || 0) + 1;
    });

    // Calculate current streak
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const sortedDates = Array.from(activeDates).sort();

    if (sortedDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Current streak check
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

      // Best streak calculation
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

    // 4. Interviews Summary
    const interviews = await InterviewSession.find({ userId: user._id })
      .select('company role targetLevel status evaluation createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const interviewsCompleted = interviews.filter(i => i.status === 'completed' || i.status === 'terminated_integrity').length;

    // 5. Recent Submissions
    const recentSubmissions = await Submission.find({ userId: user._id })
      .populate('problemId', 'title slug difficulty')
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean();

    // 6. Recent Activities
    const activities = await Activity.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.json({
      profile: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName || user.name || user.username,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio || '',
        location: user.location || '',
        college: user.college || '',
        organization: user.organization || '',
        website: user.website || '',
        githubUrl: user.githubUrl || '',
        linkedinUrl: user.linkedinUrl || '',
        skills: user.skills || [],
        verifiedLevel: user.verifiedLevel || 'Beginner',
        selfReportedLevel: user.selfReportedLevel || 'Beginner',
        confidenceScore: user.confidenceScore || 85,
        rating: user.codingStats ? user.codingStats.rating : 1200,
        xp: user.codingStats ? user.codingStats.xp : 100,
        createdAt: user.createdAt,
        isSelf,
        isFollowing
      },
      stats: {
        totalSolved,
        easySolved,
        mediumSolved,
        hardSolved,
        totalSubmissions: totalSubmissionsCount,
        accuracy,
        currentStreak,
        bestStreak,
        followersCount,
        followingCount,
        interviewsCompleted
      },
      topicStats,
      activityCalendar: calendarCounts,
      recentSubmissions: recentSubmissions.map(s => ({
        _id: s._id,
        submissionId: s.submissionId,
        problemTitle: s.problemId ? s.problemId.title : 'Problem',
        problemSlug: s.problemId ? s.problemId.slug : '',
        difficulty: s.problemId ? s.problemId.difficulty : 'Medium',
        status: s.status,
        language: s.language,
        runtimeMs: s.runtimeMs || s.executionTimeMs || 15,
        submittedAt: s.submittedAt
      })),
      solvedProblems: solvedProblemDocs,
      interviews,
      activities,
      achievements: user.achievements || []
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ message: 'Error fetching user profile.' });
  }
});

module.exports = router;
