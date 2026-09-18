const mongoose = require('mongoose');

const companyProblemSchema = new mongoose.Schema({
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  company: { type: String, required: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
  topics: [{ type: String }],
  frequency: { type: Number, default: 0.5 },
  recency: { 
    type: String, 
    enum: ['thirty-days', 'three-months', 'six-months', 'more-than-six-months', 'all-time'], 
    default: 'all-time' 
  },
  historicalEvidence: { type: Boolean, default: true },
  evidenceType: { type: String, default: 'company_tag' },
  source: {
    dataset: { type: String, default: 'leetcode-companywise-interview-questions' },
    repository: { type: String, default: 'snehasishroy/leetcode-companywise-interview-questions' },
    snapshotDate: { type: String, default: '2026-09-15' }
  },
  importedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound Unique Index: A problem exists only once per company
companyProblemSchema.index({ problemId: 1, company: 1 }, { unique: true });

// Secondary indexes for optimized adaptive query filtering
companyProblemSchema.index({ company: 1 });
companyProblemSchema.index({ company: 1, difficulty: 1 });
companyProblemSchema.index({ company: 1, frequency: -1 });
companyProblemSchema.index({ company: 1, recency: 1 });
companyProblemSchema.index({ company: 1, topics: 1 });

module.exports = mongoose.model('CompanyProblem', companyProblemSchema);
