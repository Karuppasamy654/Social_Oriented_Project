const mongoose = require('mongoose');

const studyRoomJoinRequestSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyRoom', required: true, index: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, default: '', trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

studyRoomJoinRequestSchema.index({ roomId: 1, requesterId: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
studyRoomJoinRequestSchema.index({ roomId: 1, requesterId: 1, status: 1 });

module.exports = mongoose.model('StudyRoomJoinRequest', studyRoomJoinRequestSchema);
