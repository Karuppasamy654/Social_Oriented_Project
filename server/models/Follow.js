const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Prevent duplicate follow records and optimize lookups
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followerId: 1 });
followSchema.index({ followingId: 1 });

module.exports = mongoose.model('Follow', followSchema);
