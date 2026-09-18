const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  roadmap: [{
    topic: { type: String, required: true }, // Array, String, HashMap, Two Pointers, Sliding Window, Trees, Graphs, DP
    status: { type: String, enum: ['locked', 'in_progress', 'completed'], default: 'locked' },
    completionPercentage: { type: Number, default: 0 },
    solvedInTopic: { type: Number, default: 0 },
    totalInTopic: { type: Number, default: 5 }
  }],
  weeklyActivity: [{
    day: { type: String }, // e.g. Mon, Tue
    problemsSolved: { type: Number, default: 0 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('UserProgress', userProgressSchema);
