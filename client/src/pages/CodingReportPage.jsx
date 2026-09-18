import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  BrainCircuit,
  FileText,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Code2
} from 'lucide-react';
import api from '../services/api';

export default function CodingReportPage() {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.get(`/submissions/report/${sessionId}`)
      .then(res => {
        if (!isMounted) return;
        if (res.data && res.data.submission) {
          setReport(res.data);
        } else {
          setError('Session report data unreadable');
        }
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setError(err.response?.data?.message || 'Failed to load report');
        setLoading(false);
      });
    return () => { isMounted = false; };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b15] text-white flex items-center justify-center font-mono">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-cyan-400 animate-spin" />
          <span>Generating CodeBuddy Personal Evaluation Report...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#070b15] text-white flex items-center justify-center p-6 font-mono">
        <div className="p-8 bg-[#0b1021] border border-rose-500/30 rounded-2xl text-center space-y-4 max-w-md">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-rose-300">Report Unavailable</h2>
          <p className="text-xs text-slate-400">{error || 'Session ID unverified'}</p>
          <Link to="/dashboard" className="inline-block px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { problem, submission, userMistakes, attemptCount } = report;
  const { visibleTests, hiddenTests, aiCodeAnalysis, durationSeconds } = submission;

  const minutes = Math.floor((durationSeconds || 0) / 60);
  const seconds = (durationSeconds || 0) % 60;
  const formattedDuration = `${minutes}m ${seconds}s`;

  return (
    <div className="min-h-screen bg-[#070b15] text-slate-100 font-sans p-6 md:p-10 relative selection:bg-cyan-500/30">
      {/* Background Neon Orbs */}
      <div className="w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] fixed top-[-100px] left-[-100px] pointer-events-none -z-10" />
      <div className="w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[160px] fixed bottom-[-100px] right-[-100px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-500/25 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {problem?.difficulty || 'Medium'} • {problem?.topics?.[0] || 'Array'}
              </span>
              <span className="text-xs font-mono text-slate-400">Attempts: {attemptCount || 1}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {problem?.title || 'Two Sum'}
            </h1>
            <p className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Status: {submission.status.toUpperCase()}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-slate-800 font-mono text-center shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Total Solve Time</span>
              <span className="text-lg font-extrabold text-cyan-300">{formattedDuration}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Code Score</span>
              <span className="text-lg font-extrabold text-emerald-400">{submission.codeScore || 100}%</span>
            </div>
          </div>
        </div>

        {/* Execution Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
          <div className="p-4 rounded-2xl bg-[#0b1021] border border-cyan-500/20 space-y-1">
            <span className="text-[11px] text-slate-400">Visible Tests</span>
            <div className="text-xl font-extrabold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{visibleTests?.passed || 2} / {visibleTests?.total || 2}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1021] border border-cyan-500/20 space-y-1">
            <span className="text-[11px] text-slate-400">Hidden Tests</span>
            <div className="text-xl font-extrabold text-cyan-300 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span>{hiddenTests?.passed || 8} / {hiddenTests?.total || 8}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1021] border border-cyan-500/20 space-y-1">
            <span className="text-[11px] text-slate-400">Runtime</span>
            <div className="text-xl font-extrabold text-purple-300 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <span>{submission.executionTimeMs || 14} ms</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0b1021] border border-cyan-500/20 space-y-1">
            <span className="text-[11px] text-slate-400">Memory</span>
            <div className="text-xl font-extrabold text-pink-300 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-pink-400" />
              <span>{submission.memoryKb || 1024} KB</span>
            </div>
          </div>
        </div>

        {/* Complexity Analysis Panel */}
        <div className="p-6 rounded-3xl bg-[#0b1021] border border-cyan-500/25 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-sm">
              <BrainCircuit className="w-5 h-5" />
              <span>C++ Static Complexity Analysis</span>
            </div>
            <span className="text-xs font-mono text-slate-400">Confidence: {Math.round((aiCodeAnalysis?.confidence || 0.92) * 100)}%</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 font-mono">
            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Estimated Time Complexity</span>
              <span className="text-2xl font-extrabold text-cyan-300 block">{aiCodeAnalysis?.timeComplexity || 'O(N)'}</span>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">Estimated Space Complexity</span>
              <span className="text-2xl font-extrabold text-purple-300 block">{aiCodeAnalysis?.spaceComplexity || 'O(N)'}</span>
            </div>
          </div>

          {aiCodeAnalysis?.evidence && aiCodeAnalysis.evidence.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Analysis Evidence</h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 font-mono bg-black/30 p-3 rounded-xl border border-slate-800">
                {aiCodeAnalysis.evidence.map((ev, i) => <li key={i}>{ev}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Code Quality & Improvement Recommendations */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#0b1021] border border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>What You Did Well</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300 font-sans">
              {aiCodeAnalysis?.whatDidWell?.map((w, i) => (
                <li key={i} className="flex items-start gap-2 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 rounded-3xl bg-[#0b1021] border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-sm">
              <Lightbulb className="w-5 h-5" />
              <span>What Can Be Improved</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300 font-sans">
              {aiCodeAnalysis?.whatCanBeImproved?.map((imp, i) => (
                <li key={i} className="flex items-start gap-2 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/20">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Persistent Mistake Tracking */}
        {userMistakes && userMistakes.length > 0 && (
          <div className="p-6 rounded-3xl bg-[#0b1021] border border-cyan-500/20 space-y-4 font-mono">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Persistent Mistake Memory & Repeated Error History</span>
            </div>

            <div className="space-y-2 text-xs">
              {userMistakes.map((m, i) => (
                <div key={i} className="p-3 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-cyan-300 block">{m.mistakeType}</span>
                    <span className="text-slate-400 text-[11px]">{m.description}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    Occurred {m.occurrenceCount || m.frequency || 1}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Code-Understanding Viva Results */}
        {submission.understandingQnA && submission.understandingQnA.length > 0 && (
          <div className="p-6 rounded-3xl bg-[#0b1021] border border-cyan-500/25 space-y-4 shadow-xl font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Award className="w-5 h-5" />
                <span>Post-Submission AI Viva Evaluation</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Understanding Score: {submission.understandingScore}%
              </span>
            </div>

            <div className="space-y-3 font-sans">
              {submission.understandingQnA.map((q, i) => (
                <div key={i} className={`p-4 rounded-2xl border text-xs space-y-2 ${q.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                  <div className="flex items-center justify-between font-mono font-bold">
                    <span className="text-white">Q{i + 1}: {q.question}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${q.isCorrect ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                      {q.isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}
                    </span>
                  </div>
                  <div className="text-slate-300 font-mono text-[11px]">
                    <span className="text-slate-500">Your Answer:</span> {q.userAnswer}
                  </div>
                  {!q.isCorrect && (
                    <div className="text-emerald-400 font-mono text-[11px]">
                      <span className="text-slate-500">Expected Answer:</span> {q.correctAnswer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Next Problems */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="p-6 rounded-3xl bg-[#0b1021] border border-cyan-500/20 space-y-4 font-mono">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <Sparkles className="w-5 h-5" />
              <span>Recommended Next Problems to Practice</span>
            </div>

            <div className="grid md:grid-cols-3 gap-3 font-sans">
              {report.recommendations.map((rec, i) => (
                <Link
                  key={i}
                  to={`/problems/${rec.slug}`}
                  className="p-4 rounded-2xl bg-black/40 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-2 group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1 font-mono text-[10px]">
                      <span className="text-cyan-400 font-bold">{rec.topics?.[0] || 'Array'}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">{rec.difficulty}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{rec.title}</h4>
                  </div>
                  <div className="flex items-center text-xs text-cyan-400 font-mono font-bold group-hover:translate-x-1 transition-transform">
                    <span>Practice Now</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 font-mono">
          <Link to="/dashboard" className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2">
            <span>Return to Dashboard</span>
          </Link>
          <Link to={`/problems/${problem?.slug || 'two-sum'}`} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
            <span>Try Another Attempt / Practice Problem</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
