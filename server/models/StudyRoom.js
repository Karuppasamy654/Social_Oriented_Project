const mongoose = require('mongoose');

const studyRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  topic: { type: String, required: true, trim: true },
  goal: { type: String, default: '', trim: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  visibility: { type: String, enum: ['request_only', 'invite_only'], default: 'request_only' },
  joinMode: { type: String, enum: ['request_only', 'invite_only'], default: 'request_only' },
  maxParticipants: { type: Number, default: 6, min: 2, max: 20 },
  editorPermissionMode: { type: String, enum: ['everyone', 'creator_only'], default: 'everyone' },
  linkedProblemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', default: null },
  status: { type: String, enum: ['active', 'ended'], default: 'active', index: true },
  sharedDocument: { type: String, default: '// Collaborative Study Scratchpad\n// Solve problems and discuss algorithms together here.\n' },
  sharedLanguage: { type: String, default: 'cpp17' },
  docVersion: { type: Number, default: 0 },
  roomCode: { type: String, required: true, unique: true, index: true },
  endedAt: { type: Date, default: null }
}, { timestamps: true });

studyRoomSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('StudyRoom', studyRoomSchema);
