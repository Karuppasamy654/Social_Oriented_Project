import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import confetti from 'canvas-confetti';
import {
  Code2,
  Sparkles,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Layers,
  Award,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Zap,
  HelpCircle,
  FileText,
  Terminal as TerminalIcon,
  X,
  TrendingUp,
  BrainCircuit,
  AlertTriangle,
  Lightbulb,
  Check,
  Wand2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const GENERIC_STARTER_CPP = `#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
using namespace std;

class Solution {
public:
    // Write your C++ solution here
};`;

export default function FuturisticCyberWorkspace({ problemSlugOrId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const querySlug = searchParams.get('problem') || searchParams.get('id');
  const targetSlug = problemSlugOrId || querySlug || 'two-sum';

  const { user } = useAuth();
  const userId = user?._id || user?.id || 'guest';
  const draftKey = `codebuddy_draft_${userId}_${targetSlug}`;

  const [problem, setProblem] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [code, setCode] = useState(GENERIC_STARTER_CPP);
  const [codeAlertMessage, setCodeAlertMessage] = useState(null);

  // Server-backed Timer Display
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  const [leftTab, setLeftTab] = useState('description');
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compilerError, setCompilerError] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [animatedVisibleCount, setAnimatedVisibleCount] = useState(999);

  // Inspector & Auto-Fix Modal
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  // AI Verification Modal
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [aiQuestions, setAiQuestions] = useState([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [activeVivaSessionId, setActiveVivaSessionId] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Repeat Mistake Memory Warning
  const [repeatWarning, setRepeatWarning] = useState(null);
  const [relatedProblems, setRelatedProblems] = useState([]);

  // Monaco Editor Ref
  const editorRef = useRef(null);

  // Fetch Problem & Start Server-Backed Session
  useEffect(() => {
    let isMounted = true;
    setCompilerError(null);
    setTestResults([]);
    setRepeatWarning(null);
    setRelatedProblems([]);
    setBottomPanelOpen(false);
    setShowErrorModal(false);
    setShowVerificationModal(false);
    setElapsedSeconds(0);

    const savedDraft = localStorage.getItem(draftKey);

    api.get(`/problems/${targetSlug}`)
      .then(res => {
        if (!isMounted) return;
        const p = res.data;
        if (p && p._id) {
          setProblem(p);
          if (savedDraft) {
            setCode(savedDraft);
          } else if (p.starterCode?.cpp) {
            setCode(p.starterCode.cpp);
          } else {
            setCode(GENERIC_STARTER_CPP);
          }

          // Start server-backed timer session
          api.post('/submissions/start-session', { problemId: p._id })
            .then(sRes => {
              if (sRes.data && sRes.data.sessionId) {
                setSessionId(sRes.data.sessionId);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setProblem(null);
      });

    return () => { isMounted = false; };
  }, [targetSlug, draftKey]);

  // Server-Backed Timer Interval
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    window.monacoInstance = monaco;
  };

  const updateMonacoErrorMarkers = (errText) => {
    if (!editorRef.current || !window.monacoInstance) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    if (!errText) {
      window.monacoInstance.editor.setModelMarkers(model, 'cpp', []);
      return;
    }

    const lineMatch = errText.match(/(?:solution|main)\.cpp:(\d+):(\d+)/i) || errText.match(/line\s*(\d+)/i);
    if (lineMatch) {
      const lineNum = parseInt(lineMatch[1], 10);
      const colNum = lineMatch[2] ? parseInt(lineMatch[2], 10) : 1;
      window.monacoInstance.editor.setModelMarkers(model, 'cpp', [{
        startLineNumber: lineNum,
        startColumn: colNum,
        endLineNumber: lineNum,
        endColumn: colNum + 15,
        message: errText,
        severity: window.monacoInstance.MarkerSeverity.Error
      }]);
    }
  };

  // Inspect Compiler Error & Jump to Line
  const handleInspectError = (errText) => {
    const lineMatch = errText.match(/solution\.cpp:(\d+):(\d+)/i) || errText.match(/line\s*(\d+)/i);
    const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : 1;

    if (editorRef.current && lineNum > 0) {
      editorRef.current.revealLineInCenter(lineNum);
      editorRef.current.setPosition({ lineNumber: lineNum, column: 1 });
    }

    let title = 'C++ Compilation Fault';
    let explanation = 'The GCC C++17 compiler encountered a syntax or type error on this line.';
    let fixDescription = 'Review variable type declarations, include statements, and semicolons.';
    let suggestedCode = code;

    if (errText.includes('no return statement') || errText.includes('Wreturn-type')) {
      title = 'Missing Return Statement';
      explanation = 'Function specifies a non-void return type (vector<int>), but does not return a value on all code paths.';
      fixDescription = 'Automatically insert return {}; at function end.';
      suggestedCode = code.replace(/(\}\s*$)/, '    return {};\n$1');
    }

    setErrorDetails({
      lineNumber: lineNum,
      title,
      explanation,
      fixDescription,
      rawError: errText,
      suggestedCode
    });
    setShowErrorModal(true);
  };

  const handleCodeChange = (newVal) => {
    const val = newVal || '';
    setCode(val);
    if (draftKey) {
      localStorage.setItem(draftKey, val);
    }
  };

  // Run Code (2 Visible Sample Cases Only)
  const handleRunCode = async () => {
    if (!problem || !problem._id) {
      setCodeAlertMessage('Problem details are loading or unavailable.');
      setTimeout(() => setCodeAlertMessage(null), 4000);
      return;
    }

    if (!code || !code.trim()) {
      setCodeAlertMessage('Please write your C++ solution before running.');
      setTimeout(() => setCodeAlertMessage(null), 4000);
      return;
    }

    setIsRunning(true);
    setBottomPanelOpen(true);
    setCompilerError(null);
    updateMonacoErrorMarkers(null);
    setTestResults([]);
    setCodeAlertMessage(null);
    setAnimatedVisibleCount(999);

    try {
      const res = await api.post('/submissions/run', {
        problemId: problem._id,
        sourceCode: code,
        language: 'cpp17'
      });

      setIsRunning(false);
      if (res.data && res.data.compileError) {
        setCompilerError(res.data.compileError);
        updateMonacoErrorMarkers(res.data.compileError);
      } else if (res.data && res.data.results) {
        setTestResults(res.data.results.map((r, i) => ({
          id: i + 1,
          status: r.passed ? 'pass' : 'fail',
          name: `Sample Case ${i + 1}`,
          input: r.input,
          output: r.actualOutput,
          expected: r.expectedOutput,
          time: `${r.timeMs || 14} ms`,
          isHidden: false
        })));
      }
    } catch (err) {
      setIsRunning(false);
      const errMsg = err.response?.data?.message || err.message || 'Execution failed';
      setCompilerError(errMsg);
      updateMonacoErrorMarkers(errMsg);
    }
  };

  // Submit Code (2 Visible + 8 Hidden Test Cases)
  const handleSubmitCode = async () => {
    if (!problem || !problem._id) {
      setCodeAlertMessage('Problem details are loading or unavailable.');
      setTimeout(() => setCodeAlertMessage(null), 4000);
      return;
    }

    if (!code || !code.trim()) {
      setCodeAlertMessage('Please write your C++ solution before submitting.');
      setTimeout(() => setCodeAlertMessage(null), 4000);
      return;
    }

    setIsSubmitting(true);
    setBottomPanelOpen(true);
    setCompilerError(null);
    updateMonacoErrorMarkers(null);
    setCodeAlertMessage(null);
    setAnimatedVisibleCount(0);

    try {
      const res = await api.post('/submissions/submit', {
        problemId: problem._id,
        sourceCode: code,
        language: 'cpp17',
        sessionId
      });

      setIsSubmitting(false);
      const data = res.data;

      if (data.repeatWarning) setRepeatWarning(data.repeatWarning);
      if (data.relatedProblems) setRelatedProblems(data.relatedProblems);

      if (data.compileError || data.verdict === 'Compilation Error') {
        const errMsg = data.compileError || 'Compilation Error';
        setCompilerError(errMsg);
        updateMonacoErrorMarkers(errMsg);
        return;
      }

      if (data.executionResults) {
        const formatted = data.executionResults.map((r, i) => ({
          id: i + 1,
          status: r.passed ? 'pass' : 'fail',
          name: r.name || (i < 2 ? `Public Case ${i + 1}` : `Hidden Test ${i + 1}`),
          input: r.input,
          output: r.actualOutput,
          expected: r.expectedOutput,
          time: `${r.timeMs || 15} ms`,
          isHidden: r.isHidden
        }));

        setTestResults(formatted);

        // Step-by-step test execution animation
        let step = 1;
        setAnimatedVisibleCount(1);
        const timer = setInterval(() => {
          const currentTest = formatted[step - 1];
          if (!currentTest || currentTest.status === 'fail') {
            clearInterval(timer);
            setAnimatedVisibleCount(step);
            return;
          }

          if (step < formatted.length) {
            step++;
            setAnimatedVisibleCount(step);
          } else {
            clearInterval(timer);
            if (data.verdict === 'Accepted') {
              confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
              if (data.submissionId) setActiveSubmissionId(data.submissionId);
              if (data.vivaSessionId) setActiveVivaSessionId(data.vivaSessionId);
              if (data.understandingQuestions && data.understandingQuestions.length > 0) {
                setAiQuestions(data.understandingQuestions);
                setCurrentQIdx(0);
                setUserAnswers({});
                setShowVerificationModal(true);
              }
            }
          }
        }, 150);
      }
    } catch (err) {
      setIsSubmitting(false);
      const errMsg = err.response?.data?.message || err.message || 'Submission failed';
      setCompilerError(errMsg);
    }
  };

  // Evaluate AI Verification Questions
  const handleEvaluateVerification = async () => {
    setIsEvaluating(true);
    try {
      if (activeVivaSessionId) {
        const currentQ = aiQuestions[currentQIdx];
        const userChoice = userAnswers[currentQ?.id];
        const selIdx = currentQ?.options?.indexOf(userChoice) ?? 0;
        await api.post('/coding/viva/answer', {
          viva_session_id: activeVivaSessionId,
          question_id: currentQ?.id,
          selected_index: selIdx >= 0 ? selIdx : 0
        });
      }

      const res = await api.post('/submissions/verify', {
        questions: aiQuestions,
        userAnswers,
        code,
        problemTitle: problem?.title || 'Two Sum',
        sessionId,
        submissionId: activeSubmissionId
      });

      setIsEvaluating(false);
      setShowVerificationModal(false);

      // Navigate to dedicated Report Page
      const targetId = activeSubmissionId || sessionId;
      if (targetId) {
        navigate(`/report/${targetId}`);
      }
    } catch (err) {
      setIsEvaluating(false);
      setShowVerificationModal(false);
      const targetId = activeSubmissionId || sessionId;
      if (targetId) navigate(`/report/${targetId}`);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#070b15] text-slate-100 font-sans flex flex-col overflow-hidden relative selection:bg-cyan-500/30 selection:text-white">
      {/* Background Neon Orbs */}
      <div className="w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] fixed top-[-100px] left-[-100px] pointer-events-none -z-10" />
      <div className="w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[140px] fixed bottom-[-100px] right-[-100px] pointer-events-none -z-10" />

      {/* ─── 1. TOP NAVBAR ─── */}
      <header className="px-6 py-3 shrink-0 z-20">
        <nav className="bg-[#0f172a]/80 backdrop-blur-xl px-6 py-2.5 rounded-2xl border border-cyan-500/20 flex items-center justify-between shadow-[0_0_25px_rgba(6,182,212,0.15)] font-mono">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-pink-500 p-0.5 shadow-[0_0_15px_rgba(34,211,238,0.4)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0b1021] rounded-[10px] flex items-center justify-center">
                <Code2 className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="text-sm font-extrabold bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-400 bg-clip-text text-transparent tracking-wide">
                CODEBUDDY WORKSPACE
              </span>
              <span className="block text-[10px] text-cyan-400/80 uppercase font-mono tracking-wider">
                C++17 JUDGE0 GCC EXECUTION
              </span>
            </div>
          </Link>

          {/* Server-Backed Timer Display */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-black/50 px-4 py-1.5 rounded-full border border-slate-800 text-xs text-slate-300 font-bold">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Solve Time: {formatTimer(elapsedSeconds)}</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Repeat Mistake Warning Banner */}
      {repeatWarning && (
        <div className="mx-6 mb-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-between shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{repeatWarning.warningMessage}</span>
          </div>
          <button onClick={() => setRepeatWarning(null)} className="text-amber-400/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── 2. MAIN 3-PANEL WORKSPACE ─── */}
      <main className="flex-1 px-6 pb-6 flex gap-5 overflow-hidden min-h-0">
        {/* LEFT PANEL: PROBLEM SPECIFICATION */}
        <div className="w-[40%] bg-[#0b1021]/90 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-5 flex flex-col overflow-hidden shrink-0 shadow-xl">
          <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono text-cyan-400 font-bold block mb-1">
                {problem?.category || problem?.topics?.[0] || 'Array'}
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                {problem?.title || 'Two Sum'}
              </h1>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
              {problem?.difficulty || 'Easy'}
            </span>
          </div>

          {/* Left Tabs */}
          <div className="flex items-center gap-3 mb-3 border-b border-slate-800 pb-2 font-mono">
            {[
              { id: 'description', label: 'Description', icon: <FileText className="w-3.5 h-3.5" /> },
              { id: 'testcases', label: `Visible Cases (${(problem?.sampleTestCases?.length || problem?.examples?.length || 2)})`, icon: <Layers className="w-3.5 h-3.5" /> },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setLeftTab(t.id)}
                className={`flex items-center gap-1.5 text-xs font-bold pb-1 border-b-2 transition-colors cursor-pointer ${
                  leftTab === t.id ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Problem Body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
            {leftTab === 'description' && (
              <>
                <p className="text-slate-200 leading-relaxed font-normal">
                  {problem?.description || 'Given an array or structural input, design an optimal C++17 algorithm meeting the required time and space constraints.'}
                </p>

                {/* Sample Examples */}
                {((problem?.examples && problem.examples.length > 0) 
                  ? problem.examples 
                  : (problem?.sampleTestCases && problem.sampleTestCases.length > 0)
                    ? problem.sampleTestCases.map(s => ({ input: s.input, output: s.expectedOutput, explanation: 'Sample harness verification case.' }))
                    : []
                ).map((ex, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-black/40 border border-slate-800 font-mono text-xs space-y-1.5 shadow-inner">
                    <div className="text-cyan-400 font-bold text-xs">Example 0{i + 1}</div>
                    <div className="text-slate-300"><span className="text-slate-500 font-semibold">Input:</span> <code className="text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded">{ex.input}</code></div>
                    <div className="text-slate-300"><span className="text-emerald-500 font-semibold">Output:</span> <code className="text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded">{ex.output}</code></div>
                    {ex.explanation && <div className="text-slate-400 text-[11px] pt-1.5 border-t border-slate-800/80">Explanation: {ex.explanation}</div>}
                  </div>
                ))}

                {/* Constraints */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Constraints</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 font-mono text-xs text-slate-300 bg-black/30 p-3 rounded-xl border border-slate-800">
                    {((problem?.constraints && problem.constraints.length > 0) ? problem.constraints : [
                      "1 <= input.length <= 10^5",
                      "-10^9 <= input[i] <= 10^9",
                      "C++17 Time Limit: 2.0s | Memory Limit: 256MB"
                    ]).map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              </>
            )}

            {leftTab === 'testcases' && (
              <div className="space-y-3 font-mono">
                {((problem?.sampleTestCases && problem.sampleTestCases.length > 0)
                  ? problem.sampleTestCases
                  : (problem?.examples && problem.examples.length > 0)
                    ? problem.examples.map(ex => ({ input: ex.input, expectedOutput: ex.output }))
                    : []
                ).map((tc, i) => (
                  <div key={i} className="p-4 rounded-xl bg-black/50 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-cyan-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Visible Sample Harness 0{i + 1}</span>
                      </span>
                      <span className="text-emerald-400 text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">PUBLIC TEST</span>
                    </div>
                    <div className="text-slate-300 text-xs"><span className="text-slate-500 font-bold">Input:</span> <pre className="mt-1 p-2 rounded bg-slate-900 text-cyan-300 font-mono text-[11px] overflow-x-auto">{tc.input}</pre></div>
                    <div className="text-slate-300 text-xs"><span className="text-emerald-400 font-bold">Expected Output:</span> <pre className="mt-1 p-2 rounded bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto">{tc.expectedOutput || tc.output}</pre></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT MONACO EDITOR PANEL */}
        <div className="flex-1 bg-[#090e1a] border border-cyan-500/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
          {/* Editor Action Bar */}
          <div className="px-5 py-3 bg-black/50 border-b border-slate-800 flex items-center justify-between shrink-0 font-mono">
            <div className="flex items-center gap-3">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/30">
                C++17 (GCC 9.2.0)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isRunning ? <Zap className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Play className="w-3.5 h-3.5 fill-white text-white" />}
                <span>Run Code</span>
              </button>

              <button
                onClick={handleSubmitCode}
                disabled={isRunning || isSubmitting}
                className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <Zap className="w-3.5 h-3.5 animate-spin text-white" /> : <Send className="w-3.5 h-3.5 fill-white" />}
                <span>Submit Code</span>
              </button>
            </div>
          </div>

          {/* Monaco C++17 Editor */}
          <div className="flex-1 overflow-hidden relative">
            <Editor
              height="100%"
              language="cpp"
              theme="vs-dark"
              value={code}
              onChange={(v) => handleCodeChange(v)}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 13,
                fontFamily: 'Fira Code, JetBrains Mono, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                bracketPairColorization: { enabled: true },
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always'
              }}
            />
          </div>

          {/* Console Bar Toggle Button */}
          <div className="bg-[#050811] px-4 py-1.5 border-t border-slate-800 flex items-center justify-between shrink-0 font-mono text-xs">
            <button
              onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-bold transition-colors cursor-pointer"
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Console & Test Results</span>
              {testResults.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {testResults.filter(r => r.status === 'pass').length}/{testResults.length} Passed
                </span>
              )}
            </button>
            <span className="text-[10px] text-slate-500">Judge0 C++17 Sandbox</span>
          </div>

          {/* Bottom Execution & Test Cases Panel */}
          <AnimatePresence>
            {bottomPanelOpen && (
              <motion.div
                initial={{ y: 220, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 220, opacity: 0 }}
                className="h-64 bg-[#070b15]/98 backdrop-blur-2xl border-t border-cyan-500/40 p-4 flex flex-col overflow-hidden font-mono z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-300 font-bold">Execution Output Console</span>
                    {(isRunning || isSubmitting) && (
                      <span className="flex items-center gap-1.5 text-xs text-amber-300 animate-pulse bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        <Zap className="w-3 h-3 animate-spin" />
                        <span>Running C++17 Solution...</span>
                      </span>
                    )}
                  </div>
                  <button onClick={() => setBottomPanelOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pt-3 space-y-3 text-xs">
                  {(isRunning || isSubmitting) ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-3 py-6">
                      <Zap className="w-8 h-8 text-cyan-400 animate-spin" />
                      <p className="text-slate-300 text-xs font-bold">Compiling & Executing Solution with GCC 9.2.0...</p>
                    </div>
                  ) : compilerError ? (
                    <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-3">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-2 text-rose-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          <span>C++ Compilation / Runtime Error</span>
                        </span>
                        <button
                          onClick={() => handleInspectError(compilerError)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-rose-500 cursor-pointer shadow-md"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Inspect Error Marker</span>
                        </button>
                      </div>
                      <pre className="text-xs font-mono whitespace-pre-wrap text-rose-200 bg-black/50 p-3 rounded-lg border border-rose-500/30 overflow-x-auto">
                        {compilerError}
                      </pre>
                    </div>
                  ) : testResults.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {testResults.slice(0, animatedVisibleCount).map((tr) => (
                          <div
                            key={tr.id}
                            className={`p-3 rounded-xl border text-xs flex flex-col justify-between space-y-2 ${
                              tr.status === 'pass'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold">
                                {tr.status === 'pass' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
                                <span>{tr.name}</span>
                              </div>
                              <span className="text-[10px] opacity-75">{tr.time}</span>
                            </div>
                            {tr.input && <div className="text-[11px] font-mono text-slate-300 truncate"><span className="text-slate-500">In:</span> {tr.input}</div>}
                            {tr.expected && <div className="text-[11px] font-mono text-emerald-400 truncate"><span className="text-slate-500">Exp:</span> {tr.expected}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 py-6">
                      <TerminalIcon className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-xs">Click "Run Code" or "Submit Code" to execute test harness.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ─── 3. POST-SUBMISSION AI CODE-UNDERSTANDING VIVA MODAL ─── */}
      <AnimatePresence>
        {showVerificationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-6 font-sans"
          >
            <div className="w-full max-w-2xl bg-[#0b1021] border border-cyan-500/40 rounded-3xl p-6 space-y-5 shadow-[0_0_60px_rgba(34,211,238,0.25)] relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 font-mono">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-cyan-400" />
                  <span className="text-base font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    AI CODE-UNDERSTANDING VIVA
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {aiQuestions.length > 0 && currentQIdx < aiQuestions.length && (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center justify-between text-xs font-mono text-cyan-400 font-bold">
                      <span>Question {currentQIdx + 1} of {aiQuestions.length}</span>
                      <span>Concept: {aiQuestions[currentQIdx].concept || 'C++ Logic'}</span>
                    </div>
                    <p className="text-sm font-bold text-white leading-relaxed">{aiQuestions[currentQIdx].question}</p>

                    <div className="space-y-2 pt-2">
                      {aiQuestions[currentQIdx].options?.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          onClick={() => setUserAnswers(prev => ({ ...prev, [aiQuestions[currentQIdx].id]: opt }))}
                          className={`w-full text-left p-3 rounded-xl border text-xs font-mono transition-all ${
                            userAnswers[aiQuestions[currentQIdx].id] === opt
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                              : 'bg-black/30 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <span className="font-bold mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                          {opt}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800 font-mono">
                      <button
                        disabled={currentQIdx === 0}
                        onClick={() => setCurrentQIdx(prev => prev - 1)}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 disabled:opacity-40"
                      >
                        Previous
                      </button>

                      {currentQIdx < aiQuestions.length - 1 ? (
                        <button
                          disabled={!userAnswers[aiQuestions[currentQIdx].id]}
                          onClick={() => setCurrentQIdx(prev => prev + 1)}
                          className="px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-extrabold text-xs disabled:opacity-40"
                        >
                          Next Question
                        </button>
                      ) : (
                        <button
                          disabled={isEvaluating}
                          onClick={handleEvaluateVerification}
                          className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-extrabold text-xs shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-40 flex items-center gap-1.5"
                        >
                          <span>{isEvaluating ? 'Evaluating...' : 'Complete Viva & View Report'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
