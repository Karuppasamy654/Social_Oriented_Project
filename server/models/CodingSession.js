const mongoose = require('mongoose');

const codingSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  sessionId: { type: String, required: true, unique: true },
  startedAt: { type: Date, default: Date.now, required: true },
  submittedAt: { type: Date },
  durationSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
  attemptsCount: { type: Number, default: 0 },
  lastSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }
}, { timestamps: true });

codingSessionSchema.index({ userId: 1, problemId: 1 });
codingSessionSchema.index({ sessionId: 1 });

module.exports = mongoose.model('CodingSession', codingSessionSchema);
