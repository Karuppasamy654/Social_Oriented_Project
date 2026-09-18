const express = require('express');
const router = express.Router();
const Competition = require('../models/Competition');
const Problem = require('../models/Problem');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// GET /api/competitions
router.get('/', async (req, res) => {
  try {
    let comps = await Competition.find({ status: 'active' }).populate('problems');
    if (comps.length === 0) {
      const probs = await Problem.find({}).limit(4);
      const defaultArena = await Competition.create({
        title: 'Intermediate DSA Sprint #42',
        description: 'Solve 4 core algorithmic challenges in 45 minutes.',
        difficultyTier: 'Intermediate Challenge',
        problems: probs.map(p => p._id),
        participants: [
          { username: 'Alex', score: 480, solvedCount: 2, finishTimeMinutes: 18 },
          { username: 'Priya', score: 430, solvedCount: 2, finishTimeMinutes: 22 },
          { username: 'Arun', score: 390, solvedCount: 1, finishTimeMinutes: 15 }
        ]
      });
      comps = [defaultArena];
    }
    return res.json(comps);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching competitions.' });
  }
});

// POST /api/competitions/:id/join
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const comp = await Competition.findById(req.params.id);
    if (!comp) return res.status(404).json({ message: 'Competition not found.' });

    const user = await User.findById(req.user.id);
    const existing = comp.participants.find(p => p.username === user.username);
    if (!existing) {
      comp.participants.push({
        userId: user._id,
        username: user.username,
        score: 0,
        solvedCount: 0,
        finishTimeMinutes: 0
      });
      await comp.save();
    }
    return res.json(comp);
  } catch (err) {
    return res.status(500).json({ message: 'Error joining competition.' });
  }
});

module.exports = router;
