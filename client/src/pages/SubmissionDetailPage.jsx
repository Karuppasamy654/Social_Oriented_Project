import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Code, CheckCircle2, XCircle, Clock, Database, Cpu, Lock, ArrowLeft, ShieldAlert, BookOpen } from 'lucide-react';

export default function SubmissionDetailPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submissionData, setSubmissionData] = useState(null);

  useEffect(() => {
    if (!submissionId) return;
    fetchDetail();
  }, [submissionId]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/submissions/${submissionId}`);
      setSubmissionData(res.data);
    } catch (err) {
      console.error('Failed to fetch submission detail:', err);
      setError(err.response?.data?.error || 'Failed to load submission details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm">Loading Submission Execution Details...</p>
      </div>
    );
  }

  if (error || !submissionData) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Submission Error</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">{error || "Submission record not found or access denied."}</p>
        <button
          onClick={() => navigate('/submissions')}
          className="px-6 py-2.5 bg-accent-blue text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all"
        >
          View All Submissions
        </button>
      </div>
    );
  }

  const { problem, user, status, language, runtimeMs, memoryKb, testCasesPassed, totalTestCases, aiCodeAnalysis, understandingScore, submittedAt, sourceCode, isPublic, isOwner } = submissionData;

  const isAccepted = status === 'Accepted' || status === 'accepted';

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl bg-surface-secondary border border-surface-border text-gray-400 hover:text-white hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-extrabold text-white">{problem?.title || 'Coding Submission'}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                  isAccepted ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono pt-1">
                Submitted by @{user?.username || 'user'} on {new Date(submittedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {problem?.slug && (
            <Link
              to={`/problems/${problem.slug}`}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-accent-blue/15 text-accent-blue border border-accent-blue/30 text-xs font-bold hover:bg-accent-blue/25 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Solve Problem</span>
            </Link>
          )}
        </div>

        {/* Execution Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs pt-2">
          <div className="p-4 rounded-2xl bg-surface-secondary border border-surface-border space-y-1">
            <span className="text-gray-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent-lime" /> Tests Passed</span>
            <p className="text-xl font-bold text-white">{testCasesPassed} / {totalTestCases}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-secondary border border-surface-border space-y-1">
            <span className="text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-accent-cyan" /> Runtime</span>
            <p className="text-xl font-bold text-accent-cyan">{runtimeMs} ms</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-secondary border border-surface-border space-y-1">
            <span className="text-gray-400 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-accent-purple" /> Language</span>
            <p className="text-xl font-bold text-accent-purple">{language}</p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-secondary border border-surface-border space-y-1">
            <span className="text-gray-400 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-accent-orange" /> Memory</span>
            <p className="text-xl font-bold text-accent-orange">{memoryKb} KB</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left (7 cols): Source Code View */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-accent-blue" />
                <span>Source Code ({language})</span>
              </h3>
              <span className="text-xs font-mono text-gray-400">
                {isPublic ? '🌐 Public Submission' : '🔒 Private Submission'}
              </span>
            </div>

            {sourceCode ? (
              <pre className="p-4 rounded-2xl bg-[#090d16] border border-surface-border text-xs font-mono text-cyan-300 overflow-x-auto max-h-[500px] leading-relaxed">
                {sourceCode}
              </pre>
            ) : (
              <div className="py-16 text-center space-y-3 bg-surface-secondary/40 border border-surface-border rounded-2xl">
                <Lock className="w-10 h-10 text-gray-500 mx-auto" />
                <p className="text-sm font-bold text-white">Private Source Code</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto font-mono">
                  This submission is marked as private by the user. Only the submission status and execution statistics are visible.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right (5 cols): AI Code Analysis & Viva Score */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Code Analysis Card */}
          {aiCodeAnalysis && (
            <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent-purple" />
                <span>AI Algorithmic Analysis</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-surface-secondary border border-surface-border">
                  <span className="text-gray-400 text-[10px]">Time Complexity</span>
                  <p className="text-base font-bold text-accent-lime">{aiCodeAnalysis.timeComplexity}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-secondary border border-surface-border">
                  <span className="text-gray-400 text-[10px]">Space Complexity</span>
                  <p className="text-base font-bold text-accent-cyan">{aiCodeAnalysis.spaceComplexity}</p>
                </div>
              </div>

              {aiCodeAnalysis.whatDidWell && aiCodeAnalysis.whatDidWell.length > 0 && (
                <div className="space-y-1.5 text-xs font-mono">
                  <p className="text-gray-400">Highlights:</p>
                  <ul className="list-disc list-inside space-y-1 text-emerald-400">
                    {aiCodeAnalysis.whatDidWell.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Post-Submission Viva Score */}
          {understandingScore !== undefined && (
            <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-3 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent-lime" />
                <span>Code Understanding Viva</span>
              </h3>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-secondary border border-surface-border">
                <span className="text-xs text-gray-400 font-mono">Viva Accuracy Score</span>
                <span className="text-xl font-extrabold text-accent-lime font-mono">{understandingScore}%</span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
