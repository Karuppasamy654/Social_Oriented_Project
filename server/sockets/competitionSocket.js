function setupCompetitionSocket(io, socket) {
  socket.on('join-competition', ({ competitionId, user }) => {
    socket.join(`comp-${competitionId}`);
  });

  socket.on('submit-competition-score', ({ competitionId, user, score, timeTaken }) => {
    // Broadcast live leaderboard rank updates
    io.in(`comp-${competitionId}`).emit('leaderboard-update', {
      userId: user._id || user.id,
      name: user.name,
      score,
      timeTaken,
      timestamp: new Date()
    });
  });
}

module.exports = { setupCompetitionSocket };
