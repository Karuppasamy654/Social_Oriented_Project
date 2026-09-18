import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import InterviewPrecheckModal from '../components/interview/InterviewPrecheckModal';
import AIInterviewWorkspace from '../components/interview/AIInterviewWorkspace';
import InterviewReportView from '../components/interview/InterviewReportView';
import { Building2, Sparkles, ArrowRight, ShieldCheck, Video, Clock } from 'lucide-react';

export default function InterviewPage() {
  const location = useLocation();
  const initialCompany = location.state?.company || 'NVIDIA';

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(initialCompany);
  const [roles, setRoles] = useState(['Software Engineer Intern', 'Software Engineer', 'Systems Engineer']);
  const [selectedRole, setSelectedRole] = useState('Software Engineer Intern');
  const [interviewType, setInterviewType] = useState('Technical');
  const [targetLevel, setTargetLevel] = useState('intern');
  const [durationMinutes, setDurationMinutes] = useState(45);

  const [showPrecheck, setShowPrecheck] = useState(false);
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchRoles(selectedCompany);
    }
  }, [selectedCompany]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/interviews/companies');
      setCompanies(res.data.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchRoles = async (comp) => {
    try {
      const res = await api.get('/interviews/roles', { params: { company: comp } });
      if (res.data.roles && res.data.roles.length > 0) {
        setRoles(res.data.roles);
        setSelectedRole(res.data.roles[0]);
      }
    } catch (err) {}
  };

  const handleStartSetup = () => {
    setShowPrecheck(true);
  };

  const handlePrecheckPassed = async () => {
    setShowPrecheck(false);
    try {
      const res = await api.post('/interviews/session/start', {
        company: selectedCompany,
        role: selectedRole,
        level: targetLevel,
        interviewType: interviewType,
        durationMinutes: durationMinutes
      });

      setSession(res.data);
      setCurrentQuestion(res.data.currentQuestion);
    } catch (err) {
      console.error('Error starting session:', err);
    }
  };

  const handleAnswerSubmit = async (answerPayload) => {
    if (!session) return;
    setSubmittingAnswer(true);

    try {
      const res = await api.post('/interviews/answer', {
        sessionId: session.sessionId,
        pySessionId: session.pySessionId,
        transcript: answerPayload.transcript,
        durationSeconds: answerPayload.durationSeconds,
        userCode: answerPayload.userCode
      });
      if (res.data.terminated) {
        handleFinishSession();
        return;
      }
      // Proceed to next question automatically if evaluation succeeded
      handleNextQuestion();
    } catch (err) {
      console.error('Answer submission error:', err);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleNextQuestion = async () => {
    if (!session) return;
    setLoadingNext(true);

    try {
      const res = await api.post('/interviews/question/next', {
        sessionId: session.sessionId,
        pySessionId: session.pySessionId
      });

      if (res.data.completed || res.data.terminated || !res.data.nextQuestion) {
        handleFinishSession();
      } else {
        setCurrentQuestion(res.data.nextQuestion);
      }
    } catch (err) {
      console.error('Error fetching next question:', err);
    } finally {
      setLoadingNext(false);
    }
  };

  const handleIntegrityEvent = async (eventType) => {
    if (!session) return null;
    try {
      const res = await api.post('/interviews/integrity-event', {
        sessionId: session.sessionId,
        pySessionId: session.pySessionId,
        eventType
      });
      return res.data;
    } catch (err) {
      return null;
    }
  };

  const handleFinishSession = async () => {
    if (!session) return;
    try {
      const res = await api.post('/interviews/session/finish', {
        sessionId: session.sessionId,
        pySessionId: session.pySessionId
      });
      setReport(res.data.report);
      setSession(null);
    } catch (err) {
      console.error('Finish session error:', err);
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Video className="w-8 h-8 text-accent-cyan" />
            <span>Realistic AI Interview Simulator</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Verified company-specific reported questions, dynamic IRT difficulty adaptation, camera/mic permissions check, and transparent integrity signals.
          </p>
        </div>
      </div>

      {/* SETUP SELECTION SCREEN */}
      {!session && !report && (
        <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-10 shadow-2xl max-w-3xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-accent-cyan/20 text-accent-cyan flex items-center justify-center mx-auto border border-accent-cyan/30">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Interview Setup & Company Selection</h2>
            <p className="text-xs text-gray-400">Configure target company, role, level, duration, and interview type.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            
            {/* Company */}
            <div>
              <label className="block text-gray-300 font-bold mb-1.5">Select Company</label>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-3 text-white font-bold"
              >
                {companies.length > 0 ? (
                  companies.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)
                ) : (
                  ['NVIDIA', 'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Uber'].map(c => <option key={c} value={c}>{c}</option>)
                )}
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="block text-gray-300 font-bold mb-1.5">Select Target Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-3 text-white"
              >
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Interview Type */}
            <div>
              <label className="block text-gray-300 font-bold mb-1.5">Interview Mode / Type</label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-3 text-white"
              >
                <option value="Technical">Technical Interview (DSA, Systems, CS)</option>
                <option value="HR / Behavioral">HR / Behavioral Interview (STAR)</option>
                <option value="Mixed">Mixed Full-Loop Interview</option>
                <option value="Coding">Coding Round (Judge0 Monitored C++)</option>
              </select>
            </div>

            {/* Target Level */}
            <div>
              <label className="block text-gray-300 font-bold mb-1.5">Target Skill Level Prior</label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-3 text-white capitalize"
              >
                <option value="intern">Entry / Intern Level</option>
                <option value="intermediate">Intermediate Level</option>
                <option value="experienced">Experienced Level</option>
              </select>
            </div>

            {/* Duration */}
            <div className="sm:col-span-2">
              <label className="block text-gray-300 font-bold mb-1.5">Session Target Duration</label>
              <div className="grid grid-cols-4 gap-3">
                {[15, 30, 45, 60].map(mins => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setDurationMinutes(mins)}
                    className={`py-2.5 rounded-xl border font-bold text-xs font-mono transition-all ${
                      durationMinutes === mins
                        ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-glow-blue'
                        : 'bg-surface-secondary border-surface-border text-gray-400 hover:text-white'
                    }`}
                  >
                    {mins} Mins
                  </button>
                ))}
              </div>
            </div>

          </div>

          <button
            type="button"
            onClick={handleStartSetup}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-blue text-white font-bold text-xs shadow-glow-blue flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Launch Pre-Interview Environment Check</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </div>
      )}

      {/* PRECHECK MODAL */}
      <InterviewPrecheckModal
        isOpen={showPrecheck}
        onPass={handlePrecheckPassed}
        onCancel={() => setShowPrecheck(false)}
      />

      {/* LIVE INTERVIEW WORKSPACE */}
      {session && !report && (
        <AIInterviewWorkspace
          session={session}
          currentQuestion={currentQuestion}
          onAnswerSubmit={handleAnswerSubmit}
          onNextQuestion={handleNextQuestion}
          onIntegrityEvent={handleIntegrityEvent}
          onFinishSession={handleFinishSession}
          submitting={submittingAnswer}
          loadingNext={loadingNext}
        />
      )}

      {/* REPORT CARD VIEW */}
      {report && (
        <InterviewReportView
          report={report}
          session={session}
          onRestart={() => { setReport(null); setSession(null); }}
        />
      )}

    </div>
  );
}
