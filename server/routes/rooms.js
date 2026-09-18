const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const StudyRoom = require('../models/StudyRoom');
const StudyRoomMember = require('../models/StudyRoomMember');
const StudyRoomJoinRequest = require('../models/StudyRoomJoinRequest');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Problem = require('../models/Problem');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

/**
 * Helper to safely extract MongoDB ObjectId
 */
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

// ------------------------------------------------------------------
// 1. GET /api/rooms — Discover & Search Study Rooms
// ------------------------------------------------------------------
router.get('/', optionalAuthMiddleware, async (req, res) => {
  try {
    const { q, topic, status = 'active', page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    let filter = { status: status || 'active' };

    if (topic && topic !== 'All') {
      filter.topic = new RegExp(topic.trim(), 'i');
    }

    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      const matchingUsers = await User.find({
        $or: [{ username: searchRegex }, { displayName: searchRegex }]
      }).select('_id');
      const matchingUserIds = matchingUsers.map(u => u._id);

      filter.$or = [
        { name: searchRegex },
        { topic: searchRegex },
        { description: searchRegex },
        { creatorId: { $in: matchingUserIds } }
      ];
    }

    const total = await StudyRoom.countDocuments(filter);
    const rooms = await StudyRoom.find(filter)
      .populate('creatorId', 'username displayName avatar college organization')
      .populate('linkedProblemId', 'title slug difficulty topics')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Populate active member counts for each room
    const roomIds = rooms.map(r => r._id);
    const memberCounts = await StudyRoomMember.aggregate([
      { $match: { roomId: { $in: roomIds }, status: 'active' } },
      { $group: { _id: "$roomId", count: { $sum: 1 } } }
    ]);
    const memberCountMap = {};
    memberCounts.forEach(mc => { memberCountMap[mc._id.toString()] = mc.count; });

    const enrichedRooms = rooms.map(r => ({
      ...r,
      activeMembersCount: memberCountMap[r._id.toString()] || 0
    }));

    return res.json({
      rooms: enrichedRooms,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('Error listing study rooms:', err);
    return res.status(500).json({ error: 'Failed to retrieve study rooms' });
  }
});

// ------------------------------------------------------------------
// 2. POST /api/rooms — Create a New Study Room
// ------------------------------------------------------------------
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      name, description, topic, goal,
      visibility = 'request_only', joinMode = 'request_only',
      maxParticipants = 6, editorPermissionMode = 'everyone',
      linkedProblemId
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Room name is required' });
    }
    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const userId = toObjectId(req.user.id || req.user._id);
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    let validProblemId = null;
    if (linkedProblemId) {
      if (mongoose.Types.ObjectId.isValid(linkedProblemId)) {
        validProblemId = linkedProblemId;
      } else {
        const prob = await Problem.findOne({ slug: linkedProblemId });
        if (prob) validProblemId = prob._id;
      }
    }

    const room = await StudyRoom.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      topic: topic.trim(),
      goal: goal ? goal.trim() : '',
      creatorId: userId,
      visibility,
      joinMode: visibility,
      maxParticipants: Math.min(20, Math.max(2, parseInt(maxParticipants, 10) || 6)),
      editorPermissionMode: editorPermissionMode === 'creator_only' ? 'creator_only' : 'everyone',
      linkedProblemId: validProblemId,
      roomCode,
      status: 'active'
    });

    // Create Creator Membership Record
    await StudyRoomMember.create({
      roomId: room._id,
      userId,
      role: 'creator',
      status: 'active'
    });

    const populatedRoom = await StudyRoom.findById(room._id)
      .populate('creatorId', 'username displayName avatar')
      .populate('linkedProblemId', 'title slug difficulty')
      .lean();

    return res.status(201).json({
      ...populatedRoom,
      activeMembersCount: 1,
      isCreator: true,
      isMember: true
    });
  } catch (err) {
    console.error('Error creating study room:', err);
    return res.status(500).json({ error: 'Failed to create study room' });
  }
});

// ------------------------------------------------------------------
// 3. GET /api/rooms/:roomId — Fetch Room Detail & Preview Status
// ------------------------------------------------------------------
router.get('/:roomId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await StudyRoom.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(roomId) ? roomId : null },
        { roomCode: roomId }
      ]
    })
      .populate('creatorId', 'username displayName avatar college organization')
      .populate('linkedProblemId', 'title slug difficulty topics starterCode description sampleTestCases')
      .lean();

    if (!room) {
      return res.status(404).json({ error: 'Study room not found' });
    }

    const activeMembersCount = await StudyRoomMember.countDocuments({
      roomId: room._id,
      status: 'active'
    });

    const currentUserId = req.user ? (req.user.id || req.user._id).toString() : null;
    let isCreator = false;
    let isMember = false;
    let hasPendingRequest = false;

    if (currentUserId) {
      isCreator = room.creatorId && room.creatorId._id.toString() === currentUserId;
      const member = await StudyRoomMember.findOne({
        roomId: room._id,
        userId: currentUserId,
        status: 'active'
      });
      isMember = Boolean(member);

      const request = await StudyRoomJoinRequest.findOne({
        roomId: room._id,
        requesterId: currentUserId,
        status: 'pending'
      });
      hasPendingRequest = Boolean(request);
    }

    return res.json({
      ...room,
      activeMembersCount,
      isCreator,
      isMember,
      hasPendingRequest
    });
  } catch (err) {
    console.error('Error fetching study room detail:', err);
    return res.status(500).json({ error: 'Failed to retrieve study room detail' });
  }
});

// ------------------------------------------------------------------
// 4. POST /api/rooms/:roomId/join-request — Submit Join Request
// ------------------------------------------------------------------
router.post('/:roomId/join-request', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = toObjectId(req.user.id || req.user._id);

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Study room not found' });
    if (room.status !== 'active') return res.status(400).json({ error: 'Study room is no longer active' });

    // Check capacity
    const activeCount = await StudyRoomMember.countDocuments({ roomId: room._id, status: 'active' });
    if (activeCount >= room.maxParticipants) {
      return res.status(400).json({ error: 'Study room has reached maximum capacity' });
    }

    // Check existing active membership
    const existingMember = await StudyRoomMember.findOne({ roomId: room._id, userId, status: 'active' });
    if (existingMember) {
      return res.json({ message: 'Already an active member of this room', isMember: true });
    }

    // Check pending request
    const existingReq = await StudyRoomJoinRequest.findOne({ roomId: room._id, requesterId: userId, status: 'pending' });
    if (existingReq) {
      return res.json({ message: 'Join request is already pending', request: existingReq });
    }

    const joinRequest = await StudyRoomJoinRequest.create({
      roomId: room._id,
      requesterId: userId,
      message: message ? message.trim() : 'May I join your study room?'
    });

    const populatedReq = await StudyRoomJoinRequest.findById(joinRequest._id)
      .populate('requesterId', 'username displayName avatar college skills')
      .lean();

    return res.status(201).json({ message: 'Join request submitted successfully', request: populatedReq });
  } catch (err) {
    console.error('Error submitting join request:', err);
    return res.status(500).json({ error: 'Failed to submit join request' });
  }
});

// ------------------------------------------------------------------
// 5. GET /api/rooms/:roomId/join-requests — Get Pending Join Requests (Creator Only)
// ------------------------------------------------------------------
router.get('/:roomId/join-requests', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req.user.id || req.user._id).toString();

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Study room not found' });
    if (room.creatorId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room creator can view join requests' });
    }

    const requests = await StudyRoomJoinRequest.find({ roomId: room._id, status: 'pending' })
      .populate('requesterId', 'username displayName avatar college skills')
      .sort({ requestedAt: -1 })
      .lean();

    return res.json(requests);
  } catch (err) {
    console.error('Error fetching join requests:', err);
    return res.status(500).json({ error: 'Failed to fetch join requests' });
  }
});

// ------------------------------------------------------------------
// 6. POST /api/rooms/:roomId/join-requests/:requestId/approve
// ------------------------------------------------------------------
router.post('/:roomId/join-requests/:requestId/approve', authMiddleware, async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    const userId = (req.user.id || req.user._id).toString();

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Study room not found' });
    if (room.creatorId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room creator can approve join requests' });
    }

    // Capacity Check
    const activeCount = await StudyRoomMember.countDocuments({ roomId: room._id, status: 'active' });
    if (activeCount >= room.maxParticipants) {
      return res.status(400).json({ error: 'Cannot approve request: Room is at full capacity' });
    }

    const joinReq = await StudyRoomJoinRequest.findOne({ _id: requestId, roomId: room._id, status: 'pending' });
    if (!joinReq) {
      return res.status(404).json({ error: 'Pending join request not found' });
    }

    joinReq.status = 'approved';
    joinReq.respondedAt = new Date();
    joinReq.respondedBy = toObjectId(userId);
    await joinReq.save();

    // Upsert Active Member Record
    const member = await StudyRoomMember.findOneAndUpdate(
      { roomId: room._id, userId: joinReq.requesterId },
      { role: 'participant', status: 'active', joinedAt: new Date(), lastSeenAt: new Date() },
      { upsert: true, new: true }
    ).populate('userId', 'username displayName avatar');

    return res.json({ message: 'Join request approved', member, request: joinReq });
  } catch (err) {
    console.error('Error approving join request:', err);
    return res.status(500).json({ error: 'Failed to approve join request' });
  }
});

// ------------------------------------------------------------------
// 7. POST /api/rooms/:roomId/join-requests/:requestId/reject
// ------------------------------------------------------------------
router.post('/:roomId/join-requests/:requestId/reject', authMiddleware, async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    const userId = (req.user.id || req.user._id).toString();

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Study room not found' });
    if (room.creatorId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room creator can reject join requests' });
    }

    const joinReq = await StudyRoomJoinRequest.findOne({ _id: requestId, roomId: room._id, status: 'pending' });
    if (!joinReq) {
      return res.status(404).json({ error: 'Pending join request not found' });
    }

    joinReq.status = 'rejected';
    joinReq.respondedAt = new Date();
    joinReq.respondedBy = toObjectId(userId);
    await joinReq.save();

    return res.json({ message: 'Join request rejected', request: joinReq });
  } catch (err) {
    console.error('Error rejecting join request:', err);
    return res.status(500).json({ error: 'Failed to reject join request' });
  }
});

// ------------------------------------------------------------------
// 8. GET /api/rooms/:roomId/members — List Active Room Members
// ------------------------------------------------------------------
router.get('/:roomId/members', optionalAuthMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const members = await StudyRoomMember.find({ roomId, status: 'active' })
      .populate('userId', 'username displayName avatar college organization skills')
      .sort({ joinedAt: 1 })
      .lean();

    return res.json(members);
  } catch (err) {
    console.error('Error fetching members:', err);
    return res.status(500).json({ error: 'Failed to retrieve room members' });
  }
});

// ------------------------------------------------------------------
// 9. PATCH /api/rooms/:roomId/settings — Update Settings (Creator Only)
// ------------------------------------------------------------------
router.patch('/:roomId/settings', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req.user.id || req.user._id).toString();
    const { name, description, topic, goal, editorPermissionMode, maxParticipants, sharedLanguage } = req.body;

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Study room not found' });
    if (room.creatorId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room creator can modify room settings' });
    }

    if (name) room.name = name.trim();
    if (description !== undefined) room.description = description.trim();
    if (topic) room.topic = topic.trim();
    if (goal !== undefined) room.goal = goal.trim();
    if (editorPermissionMode) {
      room.editorPermissionMode = editorPermissionMode === 'creator_only' ? 'creator_only' : 'everyone';
    }
    if (maxParticipants) {
      room.maxParticipants = Math.min(20, Math.max(2, parseInt(maxParticipants, 10) || 6));
    }
    if (sharedLanguage) room.sharedLanguage = sharedLanguage;

    await room.save();
    return res.json(room);
  } catch (err) {
    console.error('Error updating room settings:', err);
    return res.status(500).json({ error: 'Failed to update room settings' });
  }
});

// ------------------------------------------------------------------
// 10. POST /api/rooms/:roomId/leave — Leave Study Room
// ------------------------------------------------------------------
router.post('/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req.user.id || req.user._id).toString();

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Study room not found' });

    await StudyRoomMember.findOneAndUpdate(
      { roomId: room._id, userId, status: 'active' },
      { status: 'left' }
    );

    // Check remaining active members
    const remainingActive = await StudyRoomMember.find({ roomId: room._id, status: 'active' }).sort({ joinedAt: 1 });

    if (remainingActive.length === 0) {
      room.status = 'ended';
      room.endedAt = new Date();
      await room.save();
    } else if (room.creatorId.toString() === userId) {
      // Transfer creator role to oldest active member
      const newCreator = remainingActive[0];
      room.creatorId = newCreator.userId;
      await room.save();

      newCreator.role = 'creator';
      await newCreator.save();
    }

    return res.json({ message: 'Successfully left study room' });
  } catch (err) {
    console.error('Error leaving room:', err);
    return res.status(500).json({ error: 'Failed to leave study room' });
  }
});

// ------------------------------------------------------------------
// 11. POST /api/rooms/:roomId/kick — Kick Participant (Creator Only)
// ------------------------------------------------------------------
router.post('/:roomId/kick', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { targetUserId } = req.body;
    const userId = (req.user.id || req.user._id).toString();

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Study room not found' });
    if (room.creatorId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room creator can kick participants' });
    }

    if (!targetUserId || targetUserId === userId) {
      return res.status(400).json({ error: 'Invalid kick target user' });
    }

    await StudyRoomMember.findOneAndUpdate(
      { roomId: room._id, userId: targetUserId, status: 'active' },
      { status: 'kicked' }
    );

    return res.json({ message: 'Participant kicked successfully', targetUserId });
  } catch (err) {
    console.error('Error kicking participant:', err);
    return res.status(500).json({ error: 'Failed to kick participant' });
  }
});

// ------------------------------------------------------------------
// 12. POST /api/rooms/:roomId/end — End Study Room (Creator Only)
// ------------------------------------------------------------------
router.post('/:roomId/end', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = (req.user.id || req.user._id).toString();

    const room = await StudyRoom.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Study room not found' });
    if (room.creatorId.toString() !== userId) {
      return res.status(403).json({ error: 'Only the room creator can end the study room' });
    }

    room.status = 'ended';
    room.endedAt = new Date();
    await room.save();

    await StudyRoomMember.updateMany(
      { roomId: room._id, status: 'active' },
      { status: 'left' }
    );

    return res.json({ message: 'Study room ended successfully', room });
  } catch (err) {
    console.error('Error ending study room:', err);
    return res.status(500).json({ error: 'Failed to end study room' });
  }
});

// ------------------------------------------------------------------
// 13. GET /api/rooms/:roomId/messages — Fetch Chat History
// ------------------------------------------------------------------
router.get('/:roomId/messages', optionalAuthMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50 } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const rId = toObjectId(roomId);

    const messages = await ChatMessage.find({ roomId: rId || roomId })
      .populate('senderId', 'username displayName avatar')
      .sort({ createdAt: 1 })
      .limit(limitNum)
      .lean();

    return res.json(messages);
  } catch (err) {
    console.error('Error fetching chat messages:', err);
    return res.status(500).json({ error: 'Failed to retrieve chat messages' });
  }
});

// ------------------------------------------------------------------
// 14. POST /api/rooms/:roomId/messages — Send Chat Message
// ------------------------------------------------------------------
router.post('/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = toObjectId(req.user.id || req.user._id);
    const rId = toObjectId(roomId);

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    // Verify active membership
    const member = await StudyRoomMember.findOne({ roomId: rId || roomId, userId, status: 'active' });
    if (!member) {
      return res.status(403).json({ error: 'Must be an active room member to send messages' });
    }

    const chatMsg = await ChatMessage.create({
      roomId: rId || roomId,
      senderId: userId,
      message: message.trim()
    });

    const populatedMsg = await ChatMessage.findById(chatMsg._id)
      .populate('senderId', 'username displayName avatar')
      .lean();

    return res.status(201).json(populatedMsg);
  } catch (err) {
    console.error('Error sending chat message:', err);
    return res.status(500).json({ error: 'Failed to send chat message' });
  }
});

module.exports = router;
