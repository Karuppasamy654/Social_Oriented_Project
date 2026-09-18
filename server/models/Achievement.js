const mongoose = require('mongoose');

const AchievementSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, default: 'Trophy' },
  category: { type: String, default: 'general' },
  xpReward: { type: Number, default: 100 }
}, { timestamps: true });

module.exports = mongoose.model('Achievement', AchievementSchema);
