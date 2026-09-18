const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const InterviewSession = require('../models/InterviewSession');
const CompanyProblem = require('../models/CompanyProblem');
const Problem = require('../models/Problem');
const User = require('../models/User');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

// 1. GET /api/interviews/companies - List companies with problem counts & metadata
router.get('/companies', optionalAuthMiddleware, async (req, res) => {
  try {
    const companyRolesPath = path.join(__dirname, '../../data/interviews/company_roles.json');
    let companiesMeta = [];
    if (fs.existsSync(companyRolesPath)) {
      const data = JSON.parse(fs.readFileSync(companyRolesPath, 'utf8'));
      companiesMeta = data.companies || [];
    } else {
      companiesMeta = [
        { id: "nvidia", name: "NVIDIA", roles: ["Software Engineer Intern"], interview_types: ["Technical", "HR / Behavioral", "Mixed", "Coding"], default_duration_minutes: 45 },
        { id: "google", name: "Google", roles: ["Software Engineering Intern"], interview_types: ["Technical", "HR / Behavioral", "Mixed", "Coding"], default_duration_minutes: 45 },
        { id: "amazon", name: "Amazon", roles: ["SDE Intern"], interview_types: ["Technical", "HR / Behavioral", "Mixed", "Coding"], default_duration_minutes: 60 }
      ];
    }

    return res.json({
      companies: companiesMeta,
      totalCompanies: companiesMeta.length
    });
  } catch (err) {
    console.error('Error fetching companies:', err);
    return res.status(500).json({ message: 'Error fetching company list.' });
  }
});

// 2. GET /api/interviews/roles - Roles for a given company
router.get('/roles', optionalAuthMiddleware, async (req, res) => {
  try {
    const { company } = req.query;
    const companyRolesPath = path.join(__dirname, '../../data/interviews/company_roles.json');
    let roles = ["Software Engineer Intern", "Software Engineer", "Systems Engineer"];
    if (fs.existsSync(companyRolesPath)) {
      const data = JSON.parse(fs.readFileSync(companyRolesPath, 'utf8'));
      const found = (data.companies || []).find(c => c.name.toLowerCase() === (company || '').toLowerCase() || c.id.toLowerCase() === (company || '').toLowerCase());
      if (found) roles = found.roles;
    }
    return res.json({ company: company || 'All', roles });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching roles.' });
  }
});

// 3. GET /api/interviews/sources - Provenance sources
router.get('/sources', optionalAuthMiddleware, async (req, res) => {
  try {
    const sourcesPath = path.join(__dirname, '../../data/interviews/interview_sources.jsonl');
    const sources = [];
    if (fs.existsSync(sourcesPath)) {
      const lines = fs.readFileSync(sourcesPath, 'utf8').split('\n');
      lines.forEach(line => {
        if (line.trim()) sources.push(JSON.parse(line.trim()));
      });
    }
    return res.json({ sources, count: sources.length });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching sources.' });
  }
});

// 4. POST /api/interviews/session/start - Start AI interview session
router.post('/session/start', authMiddleware, async (req, res) => {
  try {
    const { company, role, level, interviewType, durationMinutes } = req.body;
    if (!company) return res.status(400).json({ message: 'Company selection is required.' });

    // Call Python AI Service
    let pySession = null;
    try {
      const pyRes = await axios.post(`${AI_SERVICE_URL}/ml/interview/session/start`, {
        user_id: req.user.id,
        company: company,
        role: role || 'Software Engineer Intern',
        level: level || 'intern',
        interview_type: interviewType || 'Technical',
        duration_minutes: durationMinutes || 45,
        weak_topics: ['arrays', 'graphs']
      });
      pySession = pyRes.data;
    } catch (e) {
      console.warn('Python AI service session start fallback active:', e.message);
    }

    const firstQ = (pySession && pySession.question_history && pySession.question_history.length > 0)
      ? pySession.question_history[0]
      : {
          question_id: 'q_nv_2025_001',
          canonical_question: 'Maximum Subarray Sum',
          question_text: 'Given an array of integers, find contiguous subarray with maximum sum and explain complexity.',
          question_type: 'dsa',
          difficulty: 'medium',
          verification_status: 'verified_reported',
          provenance: 'Verified Candidate Report (2025)',
          topics: ['arrays']
        };

    const initialSlug = firstQ.coding_problem_slug || 'maximum-subarray';
    const dbProb = await Problem.findOne({ slug: initialSlug });

    const session = await InterviewSession.create({
      userId: req.user.id,
      company: company,
      role: role || 'Software Engineer Intern',
      targetLevel: level || 'intern',
      durationMinutes: durationMinutes || 45,
      currentQIndex: 1,
      questions: [{
        problemId: dbProb ? dbProb._id : null,
        title: firstQ.canonical_question,
        slug: initialSlug,
        description: firstQ.question_text,
        difficulty: (firstQ.difficulty || 'Medium').charAt(0).toUpperCase() + (firstQ.difficulty || 'medium').slice(1),
        topics: firstQ.topics || ['arrays'],
        userCode: '',
        status: 'unanswered'
      }],
      antiCheatLogs: [],
      status: 'in_progress'
    });

    return res.json({
      sessionId: session._id,
      pySessionId: pySession ? pySession.session_id : session._id.toString(),
      company: session.company,
      role: session.role,
      level: session.targetLevel,
      currentQuestion: firstQ,
      session
    });
  } catch (err) {
    console.error('Start interview error:', err);
    return res.status(500).json({ message: 'Error starting interview session.' });
  }
});

// Backward compatibility alias for /start
router.post('/start', authMiddleware, async (req, res) => {
  req.url = '/session/start';
  return router.handle(req, res);
});

// 5. GET /api/interviews/session/:sessionId - Fetch session detail
router.get(['/session/:sessionId', '/:id'], authMiddleware, async (req, res) => {
  try {
    const sessionId = req.params.sessionId || req.params.id;
    const session = await InterviewSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Interview session not found.' });

    return res.json(session);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching session.' });
  }
});

// 6. POST /api/interviews/question/next - Fetch next adaptive question
router.post('/question/next', authMiddleware, async (req, res) => {
  try {
    const { sessionId, pySessionId } = req.body;
    const sId = pySessionId || sessionId;

    // Check if session is already terminated due to integrity threshold
    if (sessionId) {
      const session = await InterviewSession.findById(sessionId);
      if (session && (session.status === 'terminated_integrity' || (session.antiCheatLogs && session.antiCheatLogs.length >= 5))) {
        return res.json({
          success: false,
          completed: true,
          terminated: true,
          reason: 'integrity_threshold_reached',
          status: 'terminated_integrity',
          sessionId,
          nextQuestion: null
        });
      }
    }

    let pyRes = null;
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/ml/interview/question/next`, {
        session_id: sId
      });
      pyRes = response.data;
    } catch (e) {
      console.warn('Python next question fallback:', e.message);
    }

    if (pyRes && (pyRes.completed || pyRes.terminated)) {
      return res.json({
        completed: true,
        terminated: pyRes.terminated || false,
        reason: pyRes.reason || null,
        status: pyRes.status || 'completed',
        nextQuestion: null
      });
    }

    const nextQ = pyRes && pyRes.question ? pyRes.question : {
      question_id: 'q_nv_2025_002',
      canonical_question: 'Process vs Thread',
      question_text: 'Explain difference between process and thread and how CUDA threads differ.',
      question_type: 'os',
      difficulty: 'medium',
      verification_status: 'verified_reported',
      provenance: 'Verified Candidate Report (2025)',
      topics: ['operating_systems']
    };

    return res.json({
      completed: false,
      terminated: false,
      nextQuestion: nextQ
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching next question.' });
  }
});

// Backward compatibility alias
router.post('/:id/next', authMiddleware, async (req, res) => {
  req.body.sessionId = req.params.id;
  req.url = '/question/next';
  return router.handle(req, res);
});

// 7. POST /api/interviews/answer - Submit answer transcript
router.post('/answer', authMiddleware, async (req, res) => {
  try {
    const { evaluateQuestionSubmission } = require('../ai/interviewService');
    const { sessionId, pySessionId, transcript, durationSeconds, userCode } = req.body;
    const sId = pySessionId || sessionId;

    // Check if session is already terminated due to integrity threshold
    if (sessionId) {
      const session = await InterviewSession.findById(sessionId);
      if (session && (session.status === 'terminated_integrity' || (session.antiCheatLogs && session.antiCheatLogs.length >= 5))) {
        return res.json({
          success: false,
          terminated: true,
          reason: 'integrity_threshold_reached',
          status: 'terminated_integrity',
          message: 'Interview terminated due to integrity threshold. No further answers accepted.'
        });
      }

      if (session) {
        const qIndex = Math.max(0, session.questions.length - 1);
        const evalResult = await evaluateQuestionSubmission({
          session,
          questionIndex: qIndex,
          userCode: userCode || '// Code submission\n',
          timeSpent: durationSeconds || 120
        });

        return res.json({
          success: true,
          evaluation: evalResult,
          needs_followup: false
        });
      }
    }

    let evalRes = null;
    try {
      const pyRes = await axios.post(`${AI_SERVICE_URL}/ml/interview/answer`, {
        session_id: sId,
        transcript: transcript || '',
        duration_seconds: durationSeconds || 30.0,
        user_code: userCode
      });
      evalRes = pyRes.data;
    } catch (e) {
      evalRes = {
        evaluation: {
          technical_score: 85.0,
          reasoning_score: 80.0,
          completeness_score: 80.0,
          total_score_pct: 83.5,
          feedback: "Solid technical execution.",
          weak_concepts: []
        },
        needs_followup: false
      };
    }

    return res.json(evalRes);
  } catch (err) {
    console.error('Error submitting answer:', err);
    return res.status(500).json({ message: 'Error submitting answer.' });
  }
});

// Backward compatibility alias
router.post(['/:id/submit-question', '/:id/answer'], authMiddleware, async (req, res) => {
  req.body.sessionId = req.params.id;
  req.url = '/answer';
  return router.handle(req, res);
});

// 8. POST /api/interviews/integrity-event - Log proctoring event & handle threshold
router.post(['/integrity-event', '/:id/event'], authMiddleware, async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.params.id;
    const pySessionId = req.body.pySessionId || sessionId;
    const eventType = req.body.eventType || req.body.event || 'tab_hidden';

    let count = 0;
    let isTerminated = false;

    // 1. Log in MongoDB session
    if (sessionId) {
      const session = await InterviewSession.findById(sessionId);
      if (session) {
        // If already terminated, return idempotent response
        if (session.status === 'terminated_integrity') {
          return res.json({
            success: true,
            terminated: true,
            reason: 'integrity_threshold_reached',
            integrityFlagCount: session.antiCheatLogs.length,
            status: 'terminated_integrity',
            sessionId: session._id
          });
        }

        session.antiCheatLogs.push({ event: eventType, timestamp: new Date() });
        count = session.antiCheatLogs.length;

        if (count >= 5) {
          session.status = 'terminated_integrity';
          isTerminated = true;
          console.log(`[INTEGRITY] Session ${sessionId} reached 5 flags. Marking status = terminated_integrity.`);
        }
        await session.save();
      }
    }

    // 2. Log in Python AI service
    let pyResult = null;
    try {
      const pyRes = await axios.post(`${AI_SERVICE_URL}/ml/interview/integrity-event`, {
        session_id: pySessionId,
        event_type: eventType,
        duration_ms: req.body.durationMs || 1000,
        severity: 'medium'
      });
      pyResult = pyRes.data;
      if (pyResult.terminated) {
        isTerminated = true;
        count = pyResult.integrity_flag_count || count;
      }
    } catch (e) {}

    if (isTerminated || count >= 5) {
      return res.json({
        success: true,
        terminated: true,
        reason: 'integrity_threshold_reached',
        integrityFlagCount: count || 5,
        status: 'terminated_integrity',
        sessionId: sessionId,
        message: 'Maximum integrity events (5) reached. Session gracefully terminated.'
      });
    }

    return res.json({
      success: true,
      terminated: false,
      integrityFlagCount: count,
      warning: `Integrity Warning: This interview has recorded ${count} integrity events. At 5 events, the interview will be terminated.`,
      status: 'in_progress',
      sessionId: sessionId
    });
  } catch (err) {
    console.error('Error logging integrity event:', err);
    return res.status(500).json({ message: 'Error logging integrity event.' });
  }
});

// 9. POST /api/interviews/session/finish - Complete interview and generate scores/report
router.post(['/session/finish', '/:id/submit'], authMiddleware, async (req, res) => {
  try {
    const { evaluateInterview } = require('../ai/interviewService');
    const sessionId = req.body.sessionId || req.params.id;
    const pySessionId = req.body.pySessionId || sessionId;

    let pyReport = null;
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/ml/interview/session/finish`, {
        session_id: pySessionId
      });
      pyReport = response.data;
    } catch (e) {}

    let session = null;
    if (sessionId) {
      session = await InterviewSession.findById(sessionId);
    }

    // Build evidence-aware evaluation
    const localEval = evaluateInterview({
      questions: session ? session.questions : [],
      antiCheatLogs: session ? session.antiCheatLogs : [],
      performanceHistory: session ? session.performanceHistory : []
    });

    let baseReport = pyReport;
    if (baseReport) {
      if (baseReport.scores && baseReport.scores.sub_scores) {
        baseReport.scores.sub_scores.communication = "Not Applicable";
      }
      baseReport.evidenceSummary = localEval.evidenceSummary;
      baseReport.scoreStatus = localEval.scoreStatus;
      baseReport.mlPrediction = localEval.mlPrediction;
      if (localEval.overallScore === null && baseReport.scores) {
        baseReport.scores.overall_score = null;
        baseReport.scores.sub_scores.technical_knowledge = null;
        baseReport.scores.sub_scores.problem_solving = null;
        baseReport.scores.sub_scores.coding = null;
      }
    }

    const finalReport = baseReport || {
      scores: {
        overall_score: localEval.overallScore,
        sub_scores: {
          technical_knowledge: localEval.technicalKnowledge,
          problem_solving: localEval.problemSolving,
          coding: localEval.codingScore,
          communication: "Not Applicable",
          behavioral: null
        },
        explanation: localEval.reason || (localEval.overallScore !== null ? `Evaluation score: ${localEval.overallScore}%` : 'No coding tasks or interview questions were attempted.')
      },
      proctoring_report: {
        status: session && (session.status === 'terminated_integrity' || session.antiCheatLogs.length >= 5) ? "Integrity Threshold Reached" : "Normal",
        summary: session && session.antiCheatLogs.length > 0 ? `${session.antiCheatLogs.length} proctoring signals recorded.` : "Session conducted cleanly.",
        event_counts: { flags: session ? session.antiCheatLogs.length : 0 }
      },
      feedback: {
        strengths: localEval.strengths,
        weaknesses: localEval.weaknesses,
        actionable_plan: localEval.recommendations
      },
      company_preparation_plan: {
        target_company: session ? session.company : "NVIDIA",
        target_role: session ? session.role : "Software Engineer Intern",
        priority_topics: session ? (session.topicsAsked || ["arrays"]) : ["arrays"],
        recommended_coding_problems: []
      },
      evidenceSummary: localEval.evidenceSummary,
      scoreStatus: localEval.scoreStatus,
      mlPrediction: localEval.mlPrediction
    };

    if (session) {
      if (session.status !== 'terminated_integrity') {
        session.status = 'completed';
      }
      session.evaluation = {
        overallScore: localEval.overallScore,
        problemSolving: localEval.problemSolving,
        codingScore: localEval.codingScore,
        communicationScore: 0,
        strengths: localEval.strengths,
        weaknesses: localEval.weaknesses
      };
      await session.save();
    }

    return res.json({
      status: session ? session.status : 'completed',
      report: finalReport
    });
  } catch (err) {
    console.error('Error finishing interview session:', err);
    return res.status(500).json({ message: 'Error finishing session.' });
  }
});

// 10. GET /api/interviews/report/:sessionId - Fetch full report
router.get(['/report/:sessionId', '/:id/result'], authMiddleware, async (req, res) => {
  try {
    const { evaluateInterview } = require('../ai/interviewService');
    const sessionId = req.params.sessionId || req.params.id;
    const session = await InterviewSession.findById(sessionId);

    let pyReport = null;
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/ml/interview/session/finish`, {
        session_id: sessionId
      });
      pyReport = response.data;
    } catch (e) {}

    const localEval = evaluateInterview({
      questions: session ? session.questions : [],
      antiCheatLogs: session ? session.antiCheatLogs : [],
      performanceHistory: session ? session.performanceHistory : []
    });

    let baseReport = pyReport;
    if (baseReport) {
      if (baseReport.scores && baseReport.scores.sub_scores) {
        baseReport.scores.sub_scores.communication = "Not Applicable";
      }
      baseReport.evidenceSummary = localEval.evidenceSummary;
      baseReport.scoreStatus = localEval.scoreStatus;
      baseReport.mlPrediction = localEval.mlPrediction;
      if (localEval.overallScore === null && baseReport.scores) {
        baseReport.scores.overall_score = null;
        baseReport.scores.sub_scores.technical_knowledge = null;
        baseReport.scores.sub_scores.problem_solving = null;
        baseReport.scores.sub_scores.coding = null;
      }
    }

    const report = baseReport || {
      scores: {
        overall_score: localEval.overallScore,
        sub_scores: {
          technical_knowledge: localEval.technicalKnowledge,
          problem_solving: localEval.problemSolving,
          coding: localEval.codingScore,
          communication: "Not Applicable",
          behavioral: null
        },
        explanation: localEval.reason || (localEval.overallScore !== null ? `Evaluation score: ${localEval.overallScore}%` : 'No coding tasks or interview questions were attempted.')
      },
      proctoring_report: {
        status: session && (session.status === 'terminated_integrity' || session.antiCheatLogs.length >= 5) ? "Integrity Threshold Reached" : "Normal",
        summary: session && session.antiCheatLogs.length > 0 ? `${session.antiCheatLogs.length} proctoring signals recorded.` : "Session conducted cleanly."
      },
      feedback: {
        strengths: localEval.strengths,
        weaknesses: localEval.weaknesses,
        actionable_plan: localEval.recommendations
      },
      company_preparation_plan: {
        target_company: session ? session.company : "NVIDIA",
        target_role: session ? session.role : "Software Engineer Intern",
        priority_topics: session ? (session.topicsAsked || ["arrays"]) : ["arrays"],
        recommended_coding_problems: []
      },
      evidenceSummary: localEval.evidenceSummary,
      scoreStatus: localEval.scoreStatus,
      mlPrediction: localEval.mlPrediction
    };

    return res.json({
      session,
      report
    });
  } catch (err) {
    console.error('Error fetching interview report:', err);
    return res.status(500).json({ message: 'Error fetching report.' });
  }
});

// 11. GET /api/interviews/history - Fetch past interviews
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await InterviewSession.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.json({ history, count: history.length });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching history.' });
  }
});

// 12. GET /api/interviews/recommendations - Fetch personalized problem recommendations
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('solvedProblems');
    const problems = await Problem.find().limit(5).select('title slug difficulty topics');
    return res.json({
      recommendations: problems,
      count: problems.length
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching recommendations.' });
  }
});

module.exports = router;
