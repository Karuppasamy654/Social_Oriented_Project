const mongoose = require('mongoose');

const assessmentSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  experienceText: { type: String, default: '' },
  externalPlatformId: { type: String, default: '' },
  selfReportedLevel: { type: String, default: 'Beginner' },
  mlExtractedLevel: { type: String, default: 'Beginner' },
  matchStatus: { type: String, default: 'MATCHED' },
  matchScore: { type: Number, default: 85 },
  detectedTopics: [{
    name: { type: String },
    confidence: { type: Number }
  }],
  initialLevel: { type: String, default: 'Beginner' },
  status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS' },
  currentQuestionIndex: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 12 },
  questions: [{ type: Object }],
  answers: [{
    questionId: { type: String },
    topic: { type: String },
    difficulty: { type: String },
    userAnswer: { type: String },
    isCorrect: { type: Boolean },
    evalResult: { type: Object }
  }],
  finalProfile: { type: Object },
  completedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('AssessmentSession', assessmentSessionSchema);
