const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  displayName: { type: String, default: '' },
  username: { type: String, required: true, unique: true },
  normalizedUsername: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  avatar: { type: String, default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  college: { type: String, default: '' },
  organization: { type: String, default: '' },
  website: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  linkedinUrl: { type: String, default: '' },
  skills: [{ type: String }],
  authProvider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
  
  privacyPreferences: {
    profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
    emailDiscoverability: { type: Boolean, default: false },
    submissionVisibility: { type: String, enum: ['public', 'private'], default: 'public' }
  },

  isOnboarded: { type: Boolean, default: false },
  onboardingCompleted: { type: Boolean, default: false },
  experienceText: { type: String, default: '' },
  externalPlatformId: { type: String, default: '' },
  initialSkillProfile: { type: Object, default: {} },
  currentSkillProfile: { type: Object, default: {} },
  assessmentSessionId: { type: String, default: '' },
  assessmentCompletedAt: { type: Date },
  experience: { type: String, enum: ['none', '0-1_years', '1-3_years', '3+_years'], default: 'none' },
  selfReportedLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: 'Beginner' },
  verifiedLevel: { type: String, enum: ['Beginner', 'Beginner+', 'Intermediate', 'Intermediate+', 'Advanced', 'Expert'], default: 'Beginner' },
  confidenceScore: { type: Number, default: 85 },
  
  languages: [{ type: String }],
  topics: [{ type: String }],
  targetCompanies: [{ type: String }],
  targetRoles: [{ type: String }],
  
  solvedProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  attemptedProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  masteredProblems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Problem' }],
  
  codingStats: {
    totalSolved: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    accuracy: { type: Number, default: 100 },
    avgSolvingTimeMinutes: { type: Number, default: 15 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCodingDate: { type: Date },
    xp: { type: Number, default: 100 },
    rating: { type: Number, default: 1200 },
    interviewRating: { type: Number, default: 80 }
  },
  
  mistakeProfile: [{
    topic: { type: String },
    mistakeType: { type: String },
    frequency: { type: Number, default: 1 },
    lastSeen: { type: Date, default: Date.now }
  }],

  achievements: [{
    title: { type: String },
    icon: { type: String },
    unlockedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Normalize username before saving
userSchema.pre('validate', function(next) {
  if (this.username) {
    this.normalizedUsername = this.username.toLowerCase();
    if (!this.displayName) {
      this.displayName = this.name || this.username;
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
