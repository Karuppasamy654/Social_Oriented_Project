const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { setupRoomSocket } = require('./roomSocket');
const { setupCompetitionSocket } = require('./competitionSocket');

function setupSocketIO(io) {
  // Middleware to authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        socket.user = decoded;
      } catch (err) {
        // Token invalid, proceed as unauthenticated socket
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    // 1. Study Room events
    setupRoomSocket(io, socket);

    // 2. Competition Arena events
    setupCompetitionSocket(io, socket);

    // 3. User Presence
    socket.on('register-presence', (userId) => {
      socket.userId = userId;
      io.emit('user-online', { userId, status: 'online' });
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        io.emit('user-offline', { userId: socket.userId, status: 'offline' });
      }
    });
  });
}

module.exports = { setupSocketIO };
