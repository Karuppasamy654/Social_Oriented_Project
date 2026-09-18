require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { connectDB } = require('./config/db');
const { securityMiddleware, apiLimiter } = require('./middleware/security');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const assessmentRoutes = require('./routes/assessment');
const problemsRoutes = require('./routes/problems');
const submissionsRoutes = require('./routes/submissions');
const recommendationsRoutes = require('./routes/recommendations');
const interviewsRoutes = require('./routes/interviews');
const roomsRoutes = require('./routes/rooms');
const competitionsRoutes = require('./routes/competitions');
const leaderboardRoutes = require('./routes/leaderboard');

const { respondAsStudyBuddy } = require('./ai/studyBuddyService');
const { setupSocketIO } = require('./sockets/socketHandler');
const { seedInitialData } = require('./scripts/seedData');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware & Security
app.use(securityMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use('/api/', apiLimiter);

// Setup WebSockets
setupSocketIO(io);

const aiOnboardingRoutes = require('./routes/aiOnboarding');

const codingRoutes = require('./routes/coding');

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/onboarding', aiOnboardingRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/competitions', competitionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Global Persistent AI Assistant Endpoint
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { prompt, pageContext, currentProblemTitle, userCode } = req.body;
    const responseText = await respondAsStudyBuddy({
      userPrompt: prompt || 'How can CodeBuddy help me today?',
      currentProblemTitle,
      userCode,
      pageContext: pageContext || 'global'
    });
    return res.json({ response: responseText });
  } catch (err) {
    return res.status(500).json({ response: 'I am here to help! Feel free to ask any question about your code or roadmap.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'CodeBuddy',
    stack: 'MERN + Python FastAPI AI/ML Microservice',
    timestamp: new Date()
  });
});

let currentPort = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDB();
  await seedInitialData();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const failedPort = currentPort;
      currentPort += 1;
      console.warn(`⚠️ Port ${failedPort} is in use. Retrying on port ${currentPort}...`);
      setTimeout(() => {
        server.listen(currentPort);
      }, 500);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(currentPort, () => {
    console.log(`🚀 CodeBuddy Node.js Server running on http://localhost:${currentPort}`);
  });
}

startServer();
