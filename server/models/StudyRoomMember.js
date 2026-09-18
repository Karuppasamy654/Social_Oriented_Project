const mongoose = require('mongoose');

const studyRoomMemberSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyRoom', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['creator', 'participant'], default: 'participant' },
  status: { type: String, enum: ['active', 'left', 'kicked'], default: 'active', index: true },
  joinedAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now }
}, { timestamps: true });

studyRoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
studyRoomMemberSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('StudyRoomMember', studyRoomMemberSchema);
