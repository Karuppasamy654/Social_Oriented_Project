const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  selfReportedLevel: { type: String, required: true },
  questions: [{
    questionId: { type: String },
    topic: { type: String },
    difficulty: { type: String },
    questionText: { type: String },
    options: [{ type: String }],
    userAnswer: { type: String },
    correctAnswer: { type: String },
    isCorrect: { type: Boolean },
    timeTakenSeconds: { type: Number }
  }],
  aiAssessmentResult: {
    verifiedLevel: { type: String },
    confidenceScore: { type: Number },
    reasoning: { type: String }
  },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Assessment', assessmentSchema);
