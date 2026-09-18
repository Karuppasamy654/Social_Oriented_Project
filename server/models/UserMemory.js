const mongoose = require('mongoose');

const UserMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  strengths: [{ type: String }],
  weakTopics: [{ type: String }],
  recurringMistakes: [{
    mistakeType: { type: String },
    topic: { type: String },
    frequency: { type: Number, default: 1 },
    lastDetected: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }],
  solvedConcepts: [{ type: String }],
  interviewWeaknesses: [{ type: String }],
  learningBehavior: {
    hintsRequestedPerProblem: { type: Number, default: 0 },
    avgSolveTimeSeconds: { type: Number, default: 0 },
    preferredLanguage: { type: String, default: 'python' }
  }
}, { timestamps: true });

module.exports = mongoose.model('UserMemory', UserMemorySchema);
