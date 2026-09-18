import React from 'react';
import { Award, CheckCircle2, AlertTriangle, ShieldCheck, BookOpen, Sparkles, ArrowRight, BarChart3, Target, FileText, Info } from 'lucide-react';

export default function InterviewReportView({ report, session, onRestart }) {
  const scores = report?.scores || {
    overall_score: null,
    sub_scores: { technical_knowledge: null, problem_solving: null, coding: null, communication: "Not Applicable" },
    explanation: "No interview questions or coding problems were attempted."
  };

  const evidenceSummary = report?.evidenceSummary || {
    questionsPresented: session?.questions?.length || 0,
    questionsAttempted: 0,
    questionsEvaluated: 0,
    codingSubmissions: 0,
    acceptedSubmissions: 0
  };

  const scoreStatus = report?.scoreStatus || (scores.overall_score === null ? 'NOT_EVALUATED' : 'EVALUATED');
  const mlPrediction = report?.mlPrediction || {
    status: scoreStatus === 'NOT_EVALUATED' ? 'unavailable' : 'provisional',
    prediction: scoreStatus === 'NOT_EVALUATED' ? 'Not available yet' : 'Provisional readiness estimate',
    confidence: scoreStatus === 'NOT_EVALUATED' ? 'None' : 'Low'
  };

  const proctoring = report?.proctoring_report || {
    status: session?.status === 'terminated_integrity' ? "Integrity Threshold Reached" : "Normal",
    summary: session?.antiCheatLogs?.length > 0 ? `${session.antiCheatLogs.length} proctoring signals recorded.` : "Session conducted cleanly with no integrity flags.",
    event_counts: {}
  };

  const feedback = report?.feedback || {
    strengths: ["Insufficient evidence"],
    weaknesses: ["Insufficient evidence"],
    actionable_plan: []
  };

  const prepPlan = report?.company_preparation_plan || {
    target_company: session?.company || "NVIDIA",
    target_role: session?.role || "Software Engineer Intern",
    priority_topics: session?.topicsAsked || ["arrays"],
    recommended_coding_problems: []
  };

  return (
    <div className="bg-surface border border-surface-border rounded-3xl p-6 md:p-10 shadow-2xl space-y-8 animate-fadeIn max-w-5xl mx-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-surface-border pb-6 gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent-blue to-accent-cyan flex items-center justify-center text-white shadow-glow-blue">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs text-accent-cyan font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <span>Coding Interview Evaluation Report</span>
              <span className="px-2 py-0.5 rounded bg-accent-blue/20 border border-accent-blue/30 text-[10px] text-accent-blue font-mono">
                {scoreStatus}
              </span>
            </span>
            <h2 className="text-2xl font-extrabold text-white mt-0.5">
              {session?.company || 'NVIDIA'} • {session?.role || 'Software Engineer Intern'}
            </h2>
            <p className="text-xs text-gray-400">Target Level: <span className="text-white capitalize">{session?.level || 'intern'}</span></p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRestart}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-blue text-white font-bold text-xs shadow-glow-blue flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start New Mock Interview</span>
        </button>
      </div>

      {/* Zero Attempt / Provisional Banner Alert */}
      {scoreStatus === 'NOT_EVALUATED' && (
        <div className="p-4 rounded-2xl bg-accent-orange/10 border border-accent-orange/30 text-accent-orange text-xs flex items-start space-x-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm">Insufficient Evidence</h4>
            <p className="mt-0.5 text-gray-300">
              You have not attempted any interview questions or coding tasks yet. No technical performance score has been calculated.
            </p>
          </div>
        </div>
      )}

      {scoreStatus === 'PROVISIONAL' && (
        <div className="p-4 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-xs flex items-start space-x-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-white text-sm">Provisional Evaluation</h4>
            <p className="mt-0.5 text-gray-300">
              Evaluation is based on {evidenceSummary.questionsEvaluated} evaluated attempt. Complete additional coding questions to establish a reliable readiness profile.
            </p>
          </div>
        </div>
      )}

      {/* Evidence Summary Card */}
      <div className="bg-surface-secondary border border-surface-border rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-accent-cyan" />
          <span>Session Evidence Summary</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-surface border border-surface-border">
            <span className="text-gray-400 text-[10px] block">Questions Shown</span>
            <span className="text-lg font-bold text-white">{evidenceSummary.questionsPresented}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-surface-border">
            <span className="text-gray-400 text-[10px] block">Attempted</span>
            <span className="text-lg font-bold text-accent-cyan">{evidenceSummary.questionsAttempted}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-surface-border">
            <span className="text-gray-400 text-[10px] block">Evaluated</span>
            <span className="text-lg font-bold text-accent-blue">{evidenceSummary.questionsEvaluated}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-surface-border">
            <span className="text-gray-400 text-[10px] block">Coding Submissions</span>
            <span className="text-lg font-bold text-accent-purple">{evidenceSummary.codingSubmissions}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface border border-surface-border">
            <span className="text-gray-400 text-[10px] block">Accepted</span>
            <span className="text-lg font-bold text-accent-lime">{evidenceSummary.acceptedSubmissions}</span>
          </div>
        </div>
      </div>

      {/* Overall Score & Sub-Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Main Readiness Gauge */}
        <div className="md:col-span-5 bg-surface-secondary border border-surface-border rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
          <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Overall Technical Score</span>
          <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-accent-blue">
            {scores.overall_score !== null ? `${scores.overall_score}%` : 'N/A'}
          </div>
          <p className="text-xs text-gray-300 px-4 leading-relaxed font-sans">{scores.explanation}</p>
        </div>

        {/* Technical Sub-Scores Grid (Coding Interview - No Communication Score) */}
        <div className="md:col-span-7 grid grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-4 rounded-xl bg-surface-secondary border border-surface-border space-y-1">
            <span className="text-gray-400 text-[10px] block">Technical Knowledge (40%)</span>
            <span className="text-xl font-bold text-accent-cyan">
              {scores.sub_scores.technical_knowledge !== null ? `${scores.sub_scores.technical_knowledge}/100` : 'N/A'}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-surface-secondary border border-surface-border space-y-1">
            <span className="text-gray-400 text-[10px] block">Problem Solving (30%)</span>
            <span className="text-xl font-bold text-accent-blue">
              {scores.sub_scores.problem_solving !== null ? `${scores.sub_scores.problem_solving}/100` : 'N/A'}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-surface-secondary border border-surface-border space-y-1">
            <span className="text-gray-400 text-[10px] block">Coding Execution (30%)</span>
            <span className="text-xl font-bold text-accent-purple">
              {scores.sub_scores.coding !== null ? `${scores.sub_scores.coding}/100` : 'N/A'}
            </span>
          </div>
        </div>

      </div>

      {/* Proctoring Integrity Summary Card */}
      <div className="p-5 rounded-2xl bg-surface-secondary border border-surface-border flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <ShieldCheck className={`w-6 h-6 ${proctoring.status === 'Normal' ? 'text-green-400' : 'text-yellow-400'}`} />
          <div>
            <h4 className="font-bold text-white">Interview Integrity Signals: <span className={proctoring.status === 'Normal' ? 'text-green-400' : 'text-yellow-400'}>{proctoring.status}</span></h4>
            <p className="text-[11px] text-gray-400">{proctoring.summary}</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-surface border border-surface-border text-gray-300">
          Proctoring signals do not affect technical score
        </span>
      </div>

      {/* Candidate Strengths vs Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        
        {/* Strengths */}
        <div className="bg-surface-secondary border border-surface-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-green-400 uppercase tracking-wider text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Demonstrated Technical Strengths</span>
          </h3>
          <ul className="space-y-2">
            {(feedback.strengths || []).map((s, idx) => (
              <li key={idx} className="flex items-start space-x-2 text-gray-300 leading-relaxed">
                <span className="text-green-400 font-bold">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-surface-secondary border border-surface-border rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-yellow-400 uppercase tracking-wider text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Areas for Concept Improvement</span>
          </h3>
          <ul className="space-y-2">
            {(feedback.weaknesses || []).map((w, idx) => (
              <li key={idx} className="flex items-start space-x-2 text-gray-300 leading-relaxed">
                <span className="text-yellow-400 font-bold">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* ML Readiness & Preparation Roadmap */}
      <div className="bg-surface-secondary border border-surface-border rounded-2xl p-6 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-accent-cyan uppercase tracking-wider text-xs flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>{prepPlan.target_company} Evidence-Based Preparation Roadmap</span>
          </h3>
          <span className="text-[10px] font-mono text-gray-400">
            ML Prediction: <span className="text-white">{mlPrediction.prediction}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold text-gray-300 mb-2 font-mono text-[11px]">Recommended Priority Topics:</h4>
            <div className="flex flex-wrap gap-2">
              {(prepPlan.priority_topics || []).map((t, idx) => (
                <span key={idx} className="px-3 py-1 rounded-xl bg-surface border border-surface-border text-accent-cyan font-mono text-[11px]">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-300 mb-2 font-mono text-[11px]">Actionable Recommendations:</h4>
            <div className="space-y-1.5">
              {(feedback.actionable_plan || feedback.recommendations || []).map((p, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-surface border border-surface-border text-gray-200 text-[11px]">
                  <span>{typeof p === 'string' ? p : (p.recommendation || p.concept)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
