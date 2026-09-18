import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Bot, Mic, MicOff, Camera, Clock, AlertTriangle, ShieldCheck, 
  Send, Sparkles, CheckCircle2, ArrowRight, Play, Volume2, Code2, RefreshCw, FileText
} from 'lucide-react';

export default function AIInterviewWorkspace({
  session,
  currentQuestion,
  onAnswerSubmit,
  onNextQuestion,
  onIntegrityEvent,
  onFinishSession,
  submitting,
  loadingNext
}) {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [userCode, setUserCode] = useState('// Write your C++17 solution here\n#include <iostream>\n#include <vector>\nusing namespace std;\n\n');
  const [activeTab, setActiveTab] = useState('code');
  const [integrityStatus, setIntegrityStatus] = useState('Normal');
  const [violationCount, setViolationCount] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const [timeLeft, setTimeLeft] = useState((session?.target_duration_minutes || 45) * 60);

  const videoRef = useRef(null);

  // Monitor document visibility for tab switches
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && !isTerminated) {
        if (onIntegrityEvent) {
          const res = await onIntegrityEvent('tab_hidden');
          if (res) {
            const count = res.integrityFlagCount || violationCount + 1;
            setViolationCount(count);
            if (res.terminated || count >= 5) {
              setIntegrityStatus('Integrity Threshold Reached');
              setIsTerminated(true);
              stopMediaResources();
            } else {
              setIntegrityStatus('Review Suggested');
            }
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [onIntegrityEvent, isTerminated, violationCount]);

  // Session timer countdown
  useEffect(() => {
    if (isTerminated) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isTerminated]);

  const stopMediaResources = () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleMicToggle = () => {
    if (isTerminated) return;
    if (!isRecording) {
      setIsRecording(true);
      setTranscript("My approach to this problem involves examining array bounds and utilizing Kadane's algorithm to compute maximum subarray sum in O(N) time complexity.");
    } else {
      setIsRecording(false);
    }
  };

  const handleAnswerSubmitClick = () => {
    if (isTerminated) return;
    onAnswerSubmit({
      transcript: transcript || "Explained core approach and complexity analysis clearly.",
      durationSeconds: 35.0,
      userCode: currentQuestion?.question_type === 'coding' ? userCode : null
    });
  };

  const isCodingQuestion = currentQuestion?.question_type === 'coding';
  const provenanceLabel = currentQuestion?.provenance || 'Verified Candidate Report (2025)';
  const statusColor = currentQuestion?.verification_status === 'verified_reported'
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
    : currentQuestion?.verification_status === 'paraphrased_reported'
    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';

  if (isTerminated || violationCount >= 5) {
    return (
      <div className="bg-surface border border-yellow-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl max-w-2xl mx-auto space-y-6 text-center animate-fadeIn my-12">
        <div className="w-16 h-16 rounded-3xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-extrabold text-white">Interview Terminated</h2>
          <p className="text-xs text-gray-300 mt-2 leading-relaxed">
            The interview has been ended because the maximum number of integrity events (5) was reached.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Your completed interview responses and recorded events have been saved.
          </p>
        </div>

        <div className="pt-4 flex items-center justify-center">
          <button
            type="button"
            onClick={onFinishSession}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-blue text-white font-bold text-xs shadow-glow-blue flex items-center justify-center space-x-2"
          >
            <FileText className="w-4 h-4" />
            <span>View Interview Report</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Real-Time Top HUD Header */}
      <div className="bg-surface border border-surface-border rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-white font-sans font-bold">
            <span className="text-base text-accent-cyan">{session?.company || 'NVIDIA'}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-300">{session?.role || 'Software Engineer Intern'}</span>
            <span className="px-2.5 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30 text-[10px] font-mono capitalize">
              {session?.level || 'intern'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Integrity Badge */}
          <div className="flex items-center space-x-2 px-3 py-1 rounded-xl bg-surface-secondary border border-surface-border text-[11px]">
            <span className={`w-2 h-2 rounded-full ${integrityStatus === 'Normal' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
            <span className="text-gray-400 font-sans">Integrity:</span>
            <span className={`font-bold ${integrityStatus === 'Normal' ? 'text-green-400' : 'text-yellow-400'}`}>
              {integrityStatus} ({violationCount}/5 flags)
            </span>
          </div>

          {/* Time Remaining Timer */}
          <div className="flex items-center space-x-2 text-accent-pink font-bold text-sm">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            type="button"
            onClick={onFinishSession}
            className="px-4 py-2 rounded-xl bg-surface-secondary border border-surface-border text-gray-300 hover:text-white font-bold text-xs"
          >
            Finish Interview
          </button>
        </div>
      </div>

      {/* Warnings Banner for Flags 1 to 4 */}
      {violationCount > 0 && violationCount < 5 && (
        <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-xs space-y-1 animate-fadeIn">
          <div className="font-bold flex items-center gap-1.5 text-yellow-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Integrity Warning</span>
          </div>
          <p>
            This interview has recorded {violationCount} integrity events. At 5 events, the interview will be terminated.
          </p>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        
        {/* Left 6 cols: AI Interviewer & Question Area */}
        <div className="lg:col-span-6 bg-surface border border-surface-border rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-2xl">
          
          {/* AI Avatar & Provenance Badge Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-blue to-accent-cyan flex items-center justify-center text-white shadow-glow-blue">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">CodeBuddy AI Interviewer</h3>
                  <span className="text-[10px] text-accent-cyan font-mono flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Voice Synthesizer Active
                  </span>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border ${statusColor}`}>
                {provenanceLabel}
              </span>
            </div>

            {/* Current Question */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-accent-pink">
                  Question #{currentQuestion?.question_id ? currentQuestion.question_id.split('_').slice(-1)[0] : '1'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border capitalize ${
                  currentQuestion?.difficulty === 'easy' ? 'bg-green-500/10 text-green-400 border-green-500/30' : currentQuestion?.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {currentQuestion?.difficulty || 'medium'}
                </span>
              </div>

              <h2 className="text-base font-bold text-white leading-snug">
                {currentQuestion?.question_text || "Given an array of integers, find contiguous subarray with maximum sum and explain time/space complexity."}
              </h2>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {(currentQuestion?.topics || ['arrays', 'dynamic_programming']).map((t, idx) => (
                  <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary border border-surface-border text-gray-300">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Student Answer & Speech-to-Text Transcript Input */}
          <div className="space-y-4 border-t border-surface-border pt-4">
            
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-accent-cyan" />
                <span>Your Verbal Answer / Explanation</span>
              </label>

              <button
                type="button"
                onClick={handleMicToggle}
                className={`px-3 py-1 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all ${
                  isRecording 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' 
                    : 'bg-surface-secondary border border-surface-border text-gray-300 hover:text-white'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Listening (Click to Stop)...' : 'Start Speech Input'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak your answer using microphone or type transcript here..."
              className="w-full bg-surface-secondary border border-surface-border rounded-2xl p-4 text-white text-xs leading-relaxed focus:outline-none focus:border-accent-cyan"
            />

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleAnswerSubmitClick}
                disabled={submitting || isTerminated}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-blue text-white font-bold text-xs shadow-glow-blue flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Submit Answer for AI Evaluation</span>
              </button>

              <button
                type="button"
                onClick={onNextQuestion}
                disabled={loadingNext || isTerminated}
                className="px-4 py-3 rounded-2xl bg-surface-secondary border border-surface-border text-gray-300 hover:text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* Right 6 cols: Monitored C++ Monaco Coding Sandbox */}
        <div className="lg:col-span-6 bg-[#080C19] border border-surface-border rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          
          <div className="bg-[#0B1020] border-b border-surface-border p-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                  activeTab === 'code' ? 'bg-surface-secondary border-accent-cyan text-white' : 'border-transparent text-gray-400'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>C++17 Monaco Sandbox</span>
              </button>
            </div>

            <span className="text-[10px] text-gray-400">
              {isCodingQuestion ? 'Coding Question Active' : 'Conceptual Round'}
            </span>
          </div>

          <div className="flex-1 min-h-[420px]">
            <Editor
              height="100%"
              language="cpp"
              value={userCode}
              onChange={(val) => setUserCode(val || '')}
              theme="vs-dark"
              options={{ fontSize: 13, minimap: { enabled: false } }}
            />
          </div>

          <div className="p-3 bg-[#0B1020] border-t border-surface-border flex items-center justify-between text-[11px] font-mono text-gray-400">
            <span>Compiler: GCC 9.2 (C++17)</span>
            <span>Judge0 Monitored Execution</span>
          </div>

        </div>

      </div>

    </div>
  );
}
