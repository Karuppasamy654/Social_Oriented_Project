const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  explanation: { type: String }
});

const problemSchema = new mongoose.Schema({
  externalSource: { type: String, default: 'LeetCodeDataset' },
  externalId: { type: String },

  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  levelTier: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: 'Beginner' },
  topics: [{ type: String, required: true }], // e.g. ['Array', 'HashMap']
  judge_type: { 
    type: String, 
    enum: ['function_array', 'function_linked_list', 'function_string', 'function_tree', 'function_matrix', 'stdin_stdout'], 
    default: 'function_array' 
  },
  assessment_eligible: { type: Boolean, default: true },
  examples: [{
    input: { type: String },
    output: { type: String },
    explanation: { type: String }
  }],
  starterCode: {
    cpp: { type: String, required: true },
    javascript: { type: String, required: true },
    python: { type: String, required: true }
  },
  supportedLanguages: [{ type: String, default: ['cpp', 'javascript', 'python'] }],
  sampleTestCases: [testCaseSchema],
  hiddenTestCases: [testCaseSchema],
  expectedComplexity: {
    time: { type: String, default: 'O(N)' },
    space: { type: String, default: 'O(N)' }
  },
  companies: [{ type: String }], // e.g. ['Google', 'NVIDIA', 'Amazon']
  acceptanceRate: { type: Number, default: 75.0 },
  totalSubmissions: { type: Number, default: 0 },
  totalAccepted: { type: Number, default: 0 },
  hints: [{ type: String }],
  solutionExplanation: { type: String },

  sourceMetadata: {
    dataset: { type: String, default: 'LeetCodeDataset' },
    datasetVersion: { type: String, default: '2025.04' },
    importedAt: { type: Date, default: Date.now }
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound unique index for external source + external ID
problemSchema.index({ externalSource: 1, externalId: 1 }, { unique: true, sparse: true });
problemSchema.index({ difficulty: 1 });
problemSchema.index({ topics: 1 });
problemSchema.index({ createdAt: -1 });
problemSchema.index({ title: 'text', description: 'text', topics: 'text' });

module.exports = mongoose.model('Problem', problemSchema);
