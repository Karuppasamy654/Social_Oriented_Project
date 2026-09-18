const mongoose = require('mongoose');

const errorMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  errorSignature: { type: String, required: true },
  normalizedErrorType: { type: String, required: true },
  language: { type: String, default: 'cpp17' },
  count: { type: Number, default: 1 },
  examples: [{ type: String }],
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

errorMemorySchema.index({ userId: 1, normalizedErrorType: 1 });

module.exports = mongoose.model('ErrorMemory', errorMemorySchema);
