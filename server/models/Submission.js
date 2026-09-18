const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  submissionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  sessionId: { type: String },
  codeSnapshotHash: { type: String },
  vivaSessionId: { type: String },
  language: { type: String, default: 'cpp17', required: true },
  sourceCode: { type: String, required: true },
  isPublic: { type: Boolean, default: true },
  
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: Date.now },
  durationSeconds: { type: Number, default: 0 },
  
  status: {
    type: String,
    enum: ['accepted', 'wrong_answer', 'compilation_error', 'runtime_error', 'time_limit_exceeded', 'memory_limit_exceeded', 'Accepted', 'Wrong Answer', 'Compilation Error', 'Runtime Error', 'Time Limit Exceeded'],
    required: true
  },
  
  visibleTests: {
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 2 }
  },
  hiddenTests: {
    passed: { type: Number, default: 0 },
    total: { type: Number, default: 8 }
  },
  
  testCasesPassed: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 10 },
  executionTimeMs: { type: Number, default: 0 },
  runtimeMs: { type: Number, default: 0 },
  memoryKb: { type: Number, default: 1024 },
  compilerOutput: { type: String, default: '' },
  runtimeOutput: { type: String, default: '' },
  errorType: { type: String, default: null },
  
  // AI Code Analysis
  aiCodeAnalysis: {
    timeComplexity: { type: String, default: 'O(N)' },
    spaceComplexity: { type: String, default: 'O(N)' },
    confidence: { type: Number, default: 0.90 },
    evidence: [{ type: String }],
    whatDidWell: [{ type: String }],
    whatCanBeImproved: [{ type: String }],
    possibleOptimization: { type: String }
  },
  
  codeScore: { type: Number, default: 100 },
  understandingScore: { type: Number, default: 100 },
  understandingQnA: [{
    id: { type: String },
    question: { type: String },
    options: [{ type: String }],
    userAnswer: { type: String },
    correctAnswer: { type: String },
    isCorrect: { type: Boolean }
  }],
  
  detectedMistakes: [{ type: String }]
}, { timestamps: true });

submissionSchema.index({ userId: 1, submittedAt: -1 });
submissionSchema.index({ userId: 1, problemId: 1, status: 1 });
submissionSchema.index({ status: 1, submittedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
