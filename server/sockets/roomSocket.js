const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { JWT_SECRET } = require('../middleware/auth');
const StudyRoom = require('../models/StudyRoom');
const StudyRoomMember = require('../models/StudyRoomMember');
const StudyRoomJoinRequest = require('../models/StudyRoomJoinRequest');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

// Track active socket sessions per room: { roomId: Set(socketId) }
const roomPresence = new Map();
// Map socketId -> { userId, username, roomId }
const socketUserMap = new Map();

function setupRoomSocket(io, socket) {

  // Authenticate socket user via token handshake or message
  function getUserIdFromSocket(data) {
    let uid = socket.userId || null;
    if (socket.user && (socket.user.id || socket.user._id)) {
      uid = (socket.user.id || socket.user._id).toString();
    } else if (!uid) {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token || data?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
          uid = (decoded.id || decoded._id).toString();
        } catch (err) {}
      }
    }
    if (!uid && data?.userId) {
      uid = data.userId.toString();
    }
    if (uid) {
      socket.join(`user:${uid}`);
      socket.userId = uid;
    }
    return uid;
  }

  // Auto-join user personal channel on socket connection if authenticated
  const initUserId = getUserIdFromSocket({});
  if (initUserId) {
    socket.join(`user:${initUserId}`);
  }

  // ------------------------------------------------------------------
  // 0. Subscribe to Room Events (For Requesters/Viewers)
  // ------------------------------------------------------------------
  socket.on('room:subscribe', (data = {}) => {
    try {
      const { roomId } = data;
      const userId = getUserIdFromSocket(data);
      if (roomId) {
        socket.join(roomId.toString());
      }
      if (userId) {
        socket.join(`user:${userId}`);
      }
    } catch (err) {}
  });

  // ------------------------------------------------------------------
  // 1. Join Room & Establish Real-Time Presence
  // ------------------------------------------------------------------
  socket.on('room:join', async (data = {}) => {
    try {
      const { roomId } = data;
      const userId = getUserIdFromSocket(data);
      if (!roomId || !userId) return;

      const rId = toObjectId(roomId) || roomId;
      const uId = toObjectId(userId) || userId;

      const room = await StudyRoom.findById(rId);
      if (!room || room.status !== 'active') {
        return socket.emit('room:error', { error: 'Study room is not active' });
      }

      // Check active membership
      let member = await StudyRoomMember.findOne({ 
        roomId: { $in: [rId, roomId] }, 
        userId: { $in: [uId, userId] }, 
        status: 'active' 
      });

      const isCreator = room.creatorId.toString() === userId.toString();
      if (!member && isCreator) {
        member = await StudyRoomMember.findOneAndUpdate(
          { roomId: room._id, userId: uId },
          { role: 'creator', status: 'active' },
          { upsert: true, new: true }
        );
      }

      if (!member) {
        return socket.emit('room:error', { error: 'Not an active member of this study room' });
      }

      const user = await User.findById(uId).select('username displayName avatar');
      if (!user) return;

      socket.join(roomId.toString());
      socket.userId = userId.toString();
      socket.roomId = roomId.toString();
      socket.username = user.username;

      socketUserMap.set(socket.id, { userId: userId.toString(), username: user.username, roomId: roomId.toString() });

      if (!roomPresence.has(roomId.toString())) {
        roomPresence.set(roomId.toString(), new Map());
      }
      const roomUsers = roomPresence.get(roomId.toString());
      roomUsers.set(socket.id, {
        userId: userId.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        socketId: socket.id,
        role: member.role || (isCreator ? 'creator' : 'participant'),
        micOn: true,
        cameraOn: true
      });

      // Broadcast updated presence to room
      const activePresenceList = Array.from(roomUsers.values());
      io.in(roomId.toString()).emit('presence:update', {
        roomId: roomId.toString(),
        activeUsers: activePresenceList
      });

      // Send initial room state to joining socket
      socket.emit('room:joined', {
        roomId: roomId.toString(),
        sharedDocument: room.sharedDocument,
        sharedLanguage: room.sharedLanguage,
        docVersion: room.docVersion || 0,
        editorPermissionMode: room.editorPermissionMode,
        activeUsers: activePresenceList
      });
    } catch (err) {
      console.error('Error in room:join socket event:', err);
    }
  });

  // ------------------------------------------------------------------
  // 2. Collaborative Shared Editor Operational Updates
  // ------------------------------------------------------------------
  socket.on('editor:update', async (data = {}) => {
    try {
      const { roomId, sharedDocument, sharedLanguage, cursor, docVersion } = data;
      const userId = getUserIdFromSocket(data);
      if (!roomId || !userId) return;

      const rId = toObjectId(roomId) || roomId;
      const uId = toObjectId(userId) || userId;

      const room = await StudyRoom.findById(rId);
      if (!room || room.status !== 'active') return;

      // Server-Side Permission Check
      const isCreator = room.creatorId.toString() === userId.toString();
      if (room.editorPermissionMode === 'creator_only' && !isCreator) {
        return socket.emit('editor:permission-denied', {
          error: 'Editing is restricted to the room creator only',
          sharedDocument: room.sharedDocument,
          docVersion: room.docVersion || 0
        });
      }

      // Verify active membership or creator
      const member = await StudyRoomMember.findOne({ 
        roomId: { $in: [rId, roomId] }, 
        userId: { $in: [uId, userId] }, 
        status: 'active' 
      });
      if (!member && !isCreator) return;

      if (sharedDocument !== undefined) {
        room.sharedDocument = sharedDocument;
      }
      if (sharedLanguage !== undefined) {
        room.sharedLanguage = sharedLanguage;
      }
      room.docVersion = (room.docVersion || 0) + 1;
      await room.save();

      // Broadcast change to ALL connected participants in room
      io.in(roomId.toString()).emit('editor:update', {
        roomId: roomId.toString(),
        sharedDocument: room.sharedDocument,
        sharedLanguage: room.sharedLanguage,
        docVersion: room.docVersion,
        senderId: userId.toString(),
        senderSocketId: socket.id,
        cursor
      });
    } catch (err) {
      console.error('Error in editor:update socket event:', err);
    }
  });

  // ------------------------------------------------------------------
  // 3. Toggle Editor Permission Mode (Creator Only)
  // ------------------------------------------------------------------
  socket.on('editor:permission-change', async (data = {}) => {
    try {
      const { roomId, editorPermissionMode } = data;
      const userId = getUserIdFromSocket(data);
      if (!roomId || !userId) return;

      const rId = toObjectId(roomId) || roomId;
      const room = await StudyRoom.findById(rId);
      if (!room || room.creatorId.toString() !== userId.toString()) return;

      room.editorPermissionMode = editorPermissionMode === 'creator_only' ? 'creator_only' : 'everyone';
      await room.save();

      io.in(roomId.toString()).emit('editor:permission-changed', {
        roomId: roomId.toString(),
        editorPermissionMode: room.editorPermissionMode
      });
    } catch (err) {
      console.error('Error in editor:permission-change socket event:', err);
    }
  });

  // ------------------------------------------------------------------
  // 4. Live Room Chat
  // ------------------------------------------------------------------
  socket.on('chat:message', async (data = {}) => {
    try {
      const { roomId, message } = data;
      const userId = getUserIdFromSocket(data);
      if (!roomId || !userId || !message || !message.trim()) return;

      const rId = toObjectId(roomId) || roomId;
      const uId = toObjectId(userId) || userId;

      const room = await StudyRoom.findById(rId);
      if (!room) return;
      const isCreator = room.creatorId.toString() === userId.toString();

      const member = await StudyRoomMember.findOne({ 
        roomId: { $in: [rId, roomId] }, 
        userId: { $in: [uId, userId] }, 
        status: 'active' 
      });
      if (!member && !isCreator) return;

      const chatMsg = await ChatMessage.create({
        roomId: rId,
        senderId: uId,
        message: message.trim()
      });

      const populatedMsg = await ChatMessage.findById(chatMsg._id)
        .populate('senderId', 'username displayName avatar')
        .lean();

      io.in(roomId.toString()).emit('chat:message', populatedMsg);
    } catch (err) {
      console.error('Error in chat:message socket event:', err);
    }
  });

  socket.on('chat:typing', (data = {}) => {
    const { roomId, isTyping } = data;
    const info = socketUserMap.get(socket.id);
    if (roomId && info) {
      socket.to(roomId.toString()).emit('chat:typing', {
        username: info.username,
        isTyping: Boolean(isTyping)
      });
    }
  });

  // ------------------------------------------------------------------
  // 5. Real-Time WebRTC Audio / Video Signaling
  // ------------------------------------------------------------------
  socket.on('webrtc:offer', (data = {}) => {
    const { roomId, targetSocketId, offer } = data;
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:offer', {
        senderSocketId: socket.id,
        senderUserId: socket.userId,
        offer
      });
    } else if (roomId) {
      socket.to(roomId.toString()).emit('webrtc:offer', {
        senderSocketId: socket.id,
        senderUserId: socket.userId,
        offer
      });
    }
  });

  socket.on('webrtc:answer', (data = {}) => {
    const { targetSocketId, answer } = data;
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:answer', {
        senderSocketId: socket.id,
        answer
      });
    }
  });

  socket.on('webrtc:ice-candidate', (data = {}) => {
    const { targetSocketId, candidate } = data;
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        senderSocketId: socket.id,
        candidate
      });
    }
  });

  socket.on('media:state-change', (data = {}) => {
    const { roomId, micOn, cameraOn, isScreenSharing } = data;
    if (roomId) {
      const roomUsers = roomPresence.get(roomId.toString());
      if (roomUsers && roomUsers.has(socket.id)) {
        const u = roomUsers.get(socket.id);
        if (micOn !== undefined) u.micOn = micOn;
        if (cameraOn !== undefined) u.cameraOn = cameraOn;
        if (isScreenSharing !== undefined) u.isScreenSharing = isScreenSharing;
      }
      socket.to(roomId.toString()).emit('media:state-change', {
        socketId: socket.id,
        userId: socket.userId,
        micOn,
        cameraOn,
        isScreenSharing
      });
    }
  });

  // ------------------------------------------------------------------
  // 5.5 Hand Raise, Emoji Reactions & Direct Invitations
  // ------------------------------------------------------------------
  socket.on('room:reaction', (data = {}) => {
    const { roomId, emoji } = data;
    const info = socketUserMap.get(socket.id);
    if (roomId && info && emoji) {
      io.in(roomId.toString()).emit('room:reaction', {
        roomId: roomId.toString(),
        userId: socket.userId,
        username: info.username,
        emoji,
        id: Date.now() + Math.random().toString(36).substring(2, 6)
      });
    }
  });

  socket.on('room:hand-raise', (data = {}) => {
    const { roomId, isHandRaised } = data;
    if (roomId) {
      const roomUsers = roomPresence.get(roomId.toString());
      if (roomUsers && roomUsers.has(socket.id)) {
        const u = roomUsers.get(socket.id);
        u.isHandRaised = Boolean(isHandRaised);
      }
      io.in(roomId.toString()).emit('room:hand-raise', {
        roomId: roomId.toString(),
        socketId: socket.id,
        userId: socket.userId,
        username: socket.username,
        isHandRaised: Boolean(isHandRaised)
      });
    }
  });

  socket.on('room:invite-user', async (data = {}) => {
    try {
      const { roomId, targetUserId } = data;
      const info = socketUserMap.get(socket.id);
      if (!roomId || !targetUserId || !info) return;

      const rId = toObjectId(roomId) || roomId;
      const room = await StudyRoom.findById(rId).populate('creatorId', 'username displayName');
      if (!room) return;

      io.to(`user:${targetUserId}`).emit('room:invited', {
        roomId: room._id.toString(),
        roomName: room.name,
        topic: room.topic,
        inviterName: info.username
      });
    } catch (err) {
      console.error('Error sending room invitation:', err);
    }
  });

  // ------------------------------------------------------------------
  // 6. Leave Room & Disconnect Handling
  // ------------------------------------------------------------------
  socket.on('room:leave', (data = {}) => {
    handleUserLeave(socket, io, data.roomId);
  });

  socket.on('disconnect', () => {
    const info = socketUserMap.get(socket.id);
    if (info) {
      handleUserLeave(socket, io, info.roomId);
      socketUserMap.delete(socket.id);
    }
  });
}

function handleUserLeave(socket, io, roomId) {
  const targetRoomId = roomId || socket.roomId;
  if (!targetRoomId) return;

  socket.leave(targetRoomId.toString());

  const roomUsers = roomPresence.get(targetRoomId.toString());
  if (roomUsers) {
    roomUsers.delete(socket.id);
    if (roomUsers.size === 0) {
      roomPresence.delete(targetRoomId.toString());
    } else {
      io.in(targetRoomId.toString()).emit('presence:update', {
        roomId: targetRoomId.toString(),
        activeUsers: Array.from(roomUsers.values())
      });
    }
  }

  socket.to(targetRoomId.toString()).emit('user-left', {
    userId: socket.userId,
    socketId: socket.id,
    timestamp: new Date()
  });
}

module.exports = { setupRoomSocket };
