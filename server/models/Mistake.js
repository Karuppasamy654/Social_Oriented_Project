const mongoose = require('mongoose');

const mistakeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  topic: { type: String, default: 'General' },
  mistakeType: { type: String, required: true },
  description: { type: String, required: true },
  codeEvidence: { type: String },
  occurrenceCount: { type: Number, default: 1 },
  resolvedCount: { type: Number, default: 0 },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false }
}, { timestamps: true });

mistakeSchema.index({ userId: 1, mistakeType: 1 }, { unique: true });
mistakeSchema.index({ userId: 1, topic: 1 });

module.exports = mongoose.model('Mistake', mistakeSchema);
