const mongoose = require('mongoose');

const interviewSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true }, // e.g. Amazon, NVIDIA, Google, Microsoft
  role: { type: String, required: true, default: 'Software Engineer' }, // SDE Intern, Software Engineer, Backend
  targetLevel: { type: String, required: true, default: 'Intermediate' }, // Beginner, Intermediate, Advanced
  durationMinutes: { type: Number, default: 45 },
  problemCount: { type: Number, default: 30 },
  currentQIndex: { type: Number, default: 0 },
  
  questions: [{
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    title: { type: String },
    slug: { type: String },
    description: { type: String },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
    topics: [{ type: String }],
    starterCode: { type: mongoose.Schema.Types.Mixed },
    userCode: { type: String },
    language: { type: String, default: 'cpp' },
    status: { type: String, enum: ['unanswered', 'submitted', 'evaluated'], default: 'unanswered' },
    aiFollowUpQuestions: [{
      question: { type: String },
      userAnswer: { type: String }
    }]
  }],

  topicsAsked: [{ type: String }],
  difficultyHistory: [{ type: String }],
  
  performanceHistory: [{
    qIndex: { type: Number },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    slug: { type: String },
    difficulty: { type: String },
    statusDescription: { type: String },
    executionPassed: { type: Boolean },
    score: { type: Number },
    timeSpent: { type: Number },
    hintsUsed: { type: Number, default: 0 },
    understandingScore: { type: Number, default: 80 },
    timestamp: { type: Date, default: Date.now }
  }],

  selectionExplanations: [{
    qIndex: { type: Number },
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
    slug: { type: String },
    reason: { type: mongoose.Schema.Types.Mixed }
  }],

  skillBefore: {
    verifiedLevel: { type: String },
    confidenceScore: { type: Number }
  },

  skillAfter: {
    verifiedLevel: { type: String },
    confidenceScore: { type: Number }
  },

  mistakesDetected: [{
    topic: { type: String },
    mistakeType: { type: String },
    severity: { type: String, default: 'medium' },
    timestamp: { type: Date, default: Date.now }
  }],
  
  antiCheatLogs: [{
    event: { type: String }, // e.g. Tab switch detected, window blur
    timestamp: { type: Date, default: Date.now }
  }],
  
  evaluation: {
    overallScore: { type: Number, default: 0 },
    problemSolving: { type: Number, default: 0 },
    codingScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    complexityAnalysisScore: { type: Number, default: 0 },
    edgeCasesScore: { type: Number, default: 0 },
    codeQualityScore: { type: Number, default: 0 },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendations: [{ type: String }]
  },
  
  status: { type: String, enum: ['in_progress', 'completed', 'terminated_integrity'], default: 'in_progress' }
}, { timestamps: true });

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
