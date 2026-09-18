const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const StudyRoom = require('../models/StudyRoom');
const StudyRoomMember = require('../models/StudyRoomMember');
const StudyRoomJoinRequest = require('../models/StudyRoomJoinRequest');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');

// Track active socket sessions per room: { roomId: Set(socketId) }
const roomPresence = new Map();
// Map socketId -> { userId, username, roomId }
const socketUserMap = new Map();

function setupRoomSocket(io, socket) {

  // Authenticate socket user via token handshake or message
  function getUserIdFromSocket(data) {
    if (socket.user && socket.user.id) return socket.user.id.toString();
    const token = socket.handshake.auth?.token || socket.handshake.query?.token || data?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        return (decoded.id || decoded._id).toString();
      } catch (err) {}
    }
    return data?.userId ? data.userId.toString() : null;
  }

  // ------------------------------------------------------------------
  // 1. Join Room & Establish Real-Time Presence
  // ------------------------------------------------------------------
  socket.on('room:join', async (data = {}) => {
    try {
      const { roomId } = data;
      const userId = getUserIdFromSocket(data);
      if (!roomId || !userId) return;

      const room = await StudyRoom.findById(roomId);
      if (!room || room.status !== 'active') {
        return socket.emit('room:error', { error: 'Study room is not active' });
      }

      // Check active membership
      const member = await StudyRoomMember.findOne({ roomId: room._id, userId, status: 'active' });
      if (!member) {
        return socket.emit('room:error', { error: 'Not an active member of this study room' });
      }

      const user = await User.findById(userId).select('username displayName avatar');
      if (!user) return;

      socket.join(roomId.toString());
      socket.userId = userId;
      socket.roomId = roomId.toString();
      socket.username = user.username;

      socketUserMap.set(socket.id, { userId, username: user.username, roomId: roomId.toString() });

      if (!roomPresence.has(roomId.toString())) {
        roomPresence.set(roomId.toString(), new Map());
      }
      const roomUsers = roomPresence.get(roomId.toString());
      roomUsers.set(userId, {
        userId,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        socketId: socket.id,
        role: member.role,
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

      const room = await StudyRoom.findById(roomId);
      if (!room || room.status !== 'active') return;

      // Server-Side Permission Check
      const isCreator = room.creatorId.toString() === userId;
      if (room.editorPermissionMode === 'creator_only' && !isCreator) {
        return socket.emit('editor:permission-denied', {
          error: 'Editing is restricted to the room creator only',
          sharedDocument: room.sharedDocument,
          docVersion: room.docVersion || 0
        });
      }

      // Verify active membership
      const member = await StudyRoomMember.findOne({ roomId: room._id, userId, status: 'active' });
      if (!member) return;

      if (sharedDocument !== undefined) {
        room.sharedDocument = sharedDocument;
      }
      if (sharedLanguage !== undefined) {
        room.sharedLanguage = sharedLanguage;
      }
      room.docVersion = (room.docVersion || 0) + 1;
      await room.save();

      // Broadcast change to other room participants
      socket.to(roomId.toString()).emit('editor:update', {
        roomId: roomId.toString(),
        sharedDocument: room.sharedDocument,
        sharedLanguage: room.sharedLanguage,
        docVersion: room.docVersion,
        senderId: userId,
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

      const room = await StudyRoom.findById(roomId);
      if (!room || room.creatorId.toString() !== userId) return;

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

      const member = await StudyRoomMember.findOne({ roomId, userId, status: 'active' });
      if (!member) return;

      const chatMsg = await ChatMessage.create({
        roomId,
        senderId: userId,
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
    if (roomId && socket.userId) {
      const roomUsers = roomPresence.get(roomId.toString());
      if (roomUsers && roomUsers.has(socket.userId)) {
        const u = roomUsers.get(socket.userId);
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
  if (!targetRoomId || !socket.userId) return;

  socket.leave(targetRoomId.toString());

  const roomUsers = roomPresence.get(targetRoomId.toString());
  if (roomUsers) {
    roomUsers.delete(socket.userId);
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
