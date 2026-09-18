const mongoose = require('mongoose');

const oauthAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['google', 'github'],
    required: true
  },
  providerAccountId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Compound unique index preventing duplicate external identities
oauthAccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

module.exports = mongoose.model('OAuthAccount', oauthAccountSchema);
