const express = require('express');
const router = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const { authMiddleware: auth } = require('../middleware/auth');
const User = require('../models/User');
const AssessmentSession = require('../models/AssessmentSession');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';

function safeFormattedTopics(selectedTopics) {
  if (!Array.isArray(selectedTopics)) return [];
  return selectedTopics.map(t => {
    if (typeof t === 'string') {
      return { name: t, confidence: 0.85 };
    }
    if (typeof t === 'object' && t !== null && t.name) {
      return { name: String(t.name), confidence: typeof t.confidence === 'number' ? t.confidence : 0.85 };
    }
    return { name: String(t), confidence: 0.85 };
  });
}

// 1. Analyze Experience Text & Validate Self-Reported Level via Python ML Service
router.post('/analyze-experience', auth, async (req, res) => {
  const { selfReportedLevel = 'Beginner', externalPlatformId = '', experienceText = '', selectedTopics = [] } = req.body;
  const userId = req.user?.id || req.user?._id;

  try {
    // Call Python FastAPI ML Service
    const resp = await axios.post(`${PYTHON_SERVICE_URL}/api/ai/onboarding/analyze-experience`, {
      selfReportedLevel,
      externalPlatformId,
      experienceText,
      selectedTopics
    }, { timeout: 5000 });

    const pyResponse = resp.data;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      await User.findByIdAndUpdate(userId, {
        selfReportedLevel,
        externalPlatformId: externalPlatformId || '',
        experienceText: experienceText || '',
        initialSkillProfile: pyResponse
      }).catch(e => console.warn('Non-fatal User update error:', e.message));
    }

    return res.json(pyResponse);
  } catch (err) {
    console.warn('Analyze experience Python service warning (using fallback):', err?.response?.data || err.message);

    // Fallback response guarantees high availability
    const fallbackResponse = {
      topics: (selectedTopics || []).map(t => typeof t === 'string' ? { name: t, probability: 0.85 } : t),
      unknownTopics: [],
      initialSkill: {
        initial_level: selfReportedLevel || 'Intermediate',
        confidence: 0.80,
        ability_score: selfReportedLevel === 'Expert' ? 0.75 : selfReportedLevel === 'Intermediate' ? 0.50 : 0.25,
        reason: `Initial ability prior established for level '${selfReportedLevel}'.`
      },
      selfReportedLevel,
      matchStatus: 'MATCHED',
      recommendedAssessmentLength: 12,
      summary: 'Analyzed experience topics and established initial skill prior.',
      modelMetadata: { topic_classification: 'Rule-based Fallback', version: 'v3.0.0' }
    };

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      await User.findByIdAndUpdate(userId, {
        selfReportedLevel,
        externalPlatformId: externalPlatformId || '',
        experienceText: experienceText || '',
        initialSkillProfile: fallbackResponse
      }).catch(e => console.warn('Non-fatal User update error:', e.message));
    }

    return res.json(fallbackResponse);
  }
});

const { selectNextAdaptiveQuestion, updateStudentState, generateFinalProfile } = require('../ai/adaptiveAssessmentEngine');

// 2. Start Dynamic Adaptive Assessment Session (Returns ONLY Question 1)
router.post('/assessment/start', auth, async (req, res) => {
  const { selfReportedLevel = 'Beginner', externalPlatformId = '', experienceText = '', selectedTopics = [] } = req.body;
  const userId = req.user?.id || req.user?._id;
  const validUserId = (userId && mongoose.Types.ObjectId.isValid(userId)) ? userId : new mongoose.Types.ObjectId();

  const userTopicList = (Array.isArray(selectedTopics) && selectedTopics.length > 0)
    ? selectedTopics.map(t => typeof t === 'string' ? t : t.name)
    : ['Array', 'String', 'HashMap'];

  const levelPriorMap = { 'Beginner': -0.8, 'Intermediate': 0.0, 'Expert': 0.8, 'Advanced': 0.8 };
  const initialTheta = levelPriorMap[selfReportedLevel] || 0.0;

  try {
    // Attempt Python FastAPI service first
    const resp = await axios.post(`${PYTHON_SERVICE_URL}/api/ai/onboarding/assessment/start`, {
      userId: validUserId.toString(),
      experienceText: experienceText || '',
      selfReportedLevel,
      selectedTopics: userTopicList
    }, { timeout: 3000 });

    const sessionData = resp.data;
    const sid = sessionData.sessionId;

    try {
      const newSession = new AssessmentSession({
        sessionId: sid,
        userId: validUserId,
        experienceText: experienceText || '',
        externalPlatformId: externalPlatformId || '',
        selfReportedLevel,
        mlExtractedLevel: sessionData.initialEstimate?.initial_level || selfReportedLevel,
        matchStatus: sessionData.matchStatus || 'MATCHED',
        matchScore: Math.round((sessionData.initialEstimate?.confidence || 0.85) * 100),
        detectedTopics: safeFormattedTopics(userTopicList),
        initialLevel: selfReportedLevel,
        status: 'IN_PROGRESS',
        currentQuestionIndex: 0,
        totalQuestions: sessionData.totalQuestions || 12,
        questions: sessionData.currentQuestion ? [sessionData.currentQuestion] : []
      });
      await newSession.save();
    } catch (dbErr) {
      console.warn('MongoDB session save warning:', dbErr.message);
    }

    return res.json(sessionData);
  } catch (err) {
    console.warn('Start assessment Python service warning (using Node Adaptive Engine fallback):', err?.response?.data || err.message);

    const sid = 'session_' + Math.random().toString(36).substring(2, 14);

    // Filter strictly from user experienced topics and ensure no duplicates
    const { question: firstQ, reasoning } = selectNextAdaptiveQuestion({
      selectedTopics: userTopicList,
      askedQuestionIds: [],
      askedTitles: [],
      currentTheta: initialTheta,
      currentQuestionIndex: 0
    });

    const sessionData = {
      sessionId: sid,
      status: 'IN_PROGRESS',
      currentQuestionIndex: 0,
      totalQuestions: 12,
      currentQuestion: firstQ,
      adaptationExplanation: reasoning,
      initialEstimate: { initial_level: selfReportedLevel, confidence: 0.85 }
    };

    try {
      const newSession = new AssessmentSession({
        sessionId: sid,
        userId: validUserId,
        experienceText: experienceText || '',
        externalPlatformId: externalPlatformId || '',
        selfReportedLevel,
        mlExtractedLevel: selfReportedLevel,
        matchStatus: 'MATCHED',
        matchScore: 85,
        detectedTopics: safeFormattedTopics(userTopicList),
        initialLevel: selfReportedLevel,
        status: 'IN_PROGRESS',
        currentQuestionIndex: 0,
        totalQuestions: 12,
        questions: [firstQ]
      });
      await newSession.save();

      await User.findByIdAndUpdate(validUserId, {
        assessmentSessionId: sid,
        selfReportedLevel,
        externalPlatformId: externalPlatformId || ''
      }).catch(e => console.warn('Non-fatal User update error:', e.message));
    } catch (dbErr) {
      console.warn('MongoDB fallback session save warning:', dbErr.message);
    }

    return res.json(sessionData);
  }
});

// 3. Get Current Assessment Session Status
router.get('/assessment/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const resp = await axios.get(`${PYTHON_SERVICE_URL}/api/ai/onboarding/assessment/${sessionId}`, { timeout: 2000 });
    return res.json(resp.data);
  } catch (err) {
    try {
      const dbSession = await AssessmentSession.findOne({ sessionId: req.params.sessionId });
      if (!dbSession) return res.status(404).json({ message: 'Session not found' });
      return res.json(dbSession);
    } catch (e) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// 4. Submit Answer & Adapt Next Question (Returns ONLY Question 2 or Final Profile)
router.post('/assessment/:sessionId/answer', auth, async (req, res) => {
  const { sessionId } = req.params;
  const { questionId, userAnswer } = req.body;
  const userId = req.user?.id || req.user?._id;

  try {
    const resp = await axios.post(`${PYTHON_SERVICE_URL}/api/ai/onboarding/assessment/${sessionId}/answer`, {
      questionId,
      userAnswer
    }, { timeout: 3000 });

    const pyResult = resp.data;

    try {
      const dbSession = await AssessmentSession.findOne({ sessionId });
      if (dbSession) {
        dbSession.currentQuestionIndex = pyResult.currentQuestionIndex;
        dbSession.status = pyResult.status;

        if (pyResult.currentQuestion) {
          dbSession.questions.push(pyResult.currentQuestion);
        }

        if (pyResult.status === 'COMPLETED' && pyResult.finalProfile) {
          dbSession.finalProfile = pyResult.finalProfile;
          dbSession.completedAt = new Date();

          if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            await User.findByIdAndUpdate(userId, {
              onboardingCompleted: true,
              isOnboarded: true,
              selfReportedLevel: dbSession.selfReportedLevel,
              verifiedLevel: pyResult.finalProfile.verifiedLevel || 'Intermediate',
              confidenceScore: Math.round(pyResult.finalProfile.overall_skill?.confidence || 85),
              currentSkillProfile: pyResult.finalProfile,
              assessmentCompletedAt: new Date()
            }).catch(e => console.warn('Non-fatal User update error:', e.message));
          }
        }

        await dbSession.save();
      }
    } catch (dbErr) {
      console.warn('MongoDB session answer sync warning:', dbErr.message);
    }

    return res.json(pyResult);
  } catch (err) {
    console.warn('Submit answer Python service warning (using Node Adaptive Engine fallback):', err?.response?.data || err.message);

    try {
      const dbSession = await AssessmentSession.findOne({ sessionId });
      if (dbSession) {
        const rawTopics = dbSession.detectedTopics || [];
        const userTopicList = rawTopics.map(t => typeof t === 'object' ? t.name : t);

        const currentQIndex = dbSession.currentQuestionIndex || 0;
        const currentQ = dbSession.questions[currentQIndex] || dbSession.questions[dbSession.questions.length - 1];

        // Evaluate answer and update IRT theta
        const currentTheta = dbSession.currentTheta || 0.0;
        const evalState = updateStudentState({
          currentTheta,
          question: currentQ,
          userAnswer
        });

        dbSession.currentTheta = evalState.newTheta;
        dbSession.answers.push({
          questionId: questionId || currentQ?.id,
          topic: currentQ?.topic || 'Array',
          difficulty: currentQ?.difficulty || 'Intermediate',
          userAnswer,
          isCorrect: evalState.isCorrect,
          evalResult: evalState
        });

        dbSession.currentQuestionIndex += 1;

        if (dbSession.currentQuestionIndex >= dbSession.totalQuestions) {
          dbSession.status = 'COMPLETED';
          const finalProfile = generateFinalProfile({
            selfReportedLevel: dbSession.selfReportedLevel,
            answers: dbSession.answers,
            finalTheta: evalState.newTheta,
            selectedTopics: userTopicList
          });

          dbSession.finalProfile = finalProfile;
          dbSession.completedAt = new Date();

          if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            await User.findByIdAndUpdate(userId, {
              onboardingCompleted: true,
              isOnboarded: true,
              verifiedLevel: finalProfile.verifiedLevel,
              confidenceScore: finalProfile.overall_skill?.confidence || 85,
              currentSkillProfile: finalProfile,
              assessmentCompletedAt: new Date()
            }).catch(e => console.warn('Non-fatal User update error:', e.message));
          }

          await dbSession.save();
          return res.json({ status: 'COMPLETED', finalProfile, currentQuestionIndex: dbSession.totalQuestions });
        } else {
          // Select next question strictly from user topics, avoiding repeats
          const askedQuestionIds = dbSession.questions.map(q => q.id).filter(Boolean);
          const askedTitles = dbSession.questions.map(q => q.title).filter(Boolean);

          const { question: nextQ, reasoning } = selectNextAdaptiveQuestion({
            selectedTopics: userTopicList,
            askedQuestionIds,
            askedTitles,
            currentTheta: evalState.newTheta,
            currentQuestionIndex: dbSession.currentQuestionIndex
          });

          dbSession.questions.push(nextQ);
          await dbSession.save();

          return res.json({
            status: 'IN_PROGRESS',
            currentQuestionIndex: dbSession.currentQuestionIndex,
            totalQuestions: dbSession.totalQuestions,
            currentQuestion: nextQ,
            adaptationExplanation: reasoning
          });
        }
      }
    } catch (fallbackErr) {
      console.warn('Fallback answer handler error:', fallbackErr.message);
    }

    return res.status(404).json({ message: 'Session not found' });
  }
});

module.exports = router;


