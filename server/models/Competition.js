const mongoose = require('mongoose');

const competitionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  difficultyTier: { type: String, enum: ['Easy Sprint', 'Intermediate Challenge', 'Advanced Arena'], default: 'Intermediate Challenge' },
  problems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  startTime: { type: Date, default: Date.now },
  durationMinutes: { type: Number, default: 45 },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    score: { type: Number, default: 0 },
    solvedCount: { type: Number, default: 0 },
    finishTimeMinutes: { type: Number, default: 0 }
  }],
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Competition', competitionSchema);
