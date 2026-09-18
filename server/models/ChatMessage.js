const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyRoom', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

chatMessageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
