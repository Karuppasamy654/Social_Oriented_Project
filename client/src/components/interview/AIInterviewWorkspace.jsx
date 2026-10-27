import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Bot, Clock, AlertTriangle, Code2, RefreshCw, FileText
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
  // Lock strictly to C++17 compiler
  const [userCode, setUserCode] = useState(currentQuestion?.starterCode?.cpp || '// C++17 (GCC 9.2) Coding Solution\n#include <iostream>\n#include <vector>\n#include <unordered_map>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    // Implement your algorithm here\n};\n');
  const [activeTab, setActiveTab] = useState('problem');
  const [testResults, setTestResults] = useState(null);
  const [testingCode, setTestingCode] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState('Normal');
  const [violationCount, setViolationCount] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const [timeLeft, setTimeLeft] = useState((session?.durationMinutes || 15) * 60);

  const videoRef = useRef(null);

  // Initialize webcam stream & Web Audio API noise monitoring on mount
  useEffect(() => {
    let stream = null;
    let audioCtx = null;
    let noiseInterval = null;
    let noiseSustainedCount = 0;

    async function startMediaMonitoring() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Real-Time Web Audio API Ambient Noise Monitoring
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          noiseInterval = setInterval(() => {
            if (isTerminated) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avgVolume = sum / dataArray.length;
            // Threshold for high background noise level (RMS volume ~65+)
            if (avgVolume > 65) {
              noiseSustainedCount += 1;
              if (noiseSustainedCount >= 5) { // 5 consecutive samples (~5 seconds of sustained noise)
                recordViolation('HIGH_AMBIENT_NOISE');
                noiseSustainedCount = 0;
              }
            } else {
              noiseSustainedCount = Math.max(0, noiseSustainedCount - 1);
            }
          }, 1000);
        }
      } catch (e) {
        console.warn('Camera/Mic not available or permission denied:', e.message);
        recordViolation('camera_disabled');
      }
    }
    startMediaMonitoring();
    return () => {
      if (noiseInterval) clearInterval(noiseInterval);
      if (audioCtx) audioCtx.close().catch(() => {});
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);


  // Update starter code when question changes
  useEffect(() => {
    if (currentQuestion?.starterCode?.cpp) {
      setUserCode(currentQuestion.starterCode.cpp);
    } else {
      setUserCode('// C++17 Solution\n#include <iostream>\n#include <vector>\nusing namespace std;\n\n');
    }
    setTestResults(null);
  }, [currentQuestion]);

  const recordViolation = async (eventType) => {
    if (isTerminated) return;
    if (onIntegrityEvent) {
      const res = await onIntegrityEvent(eventType);
      if (res) {
        const count = res.integrityFlagCount || violationCount + 1;
        setViolationCount(count);
        if (res.terminated || count >= 5) {
          setIntegrityStatus('Integrity Threshold Reached');
          setIsTerminated(true);
          stopMediaResources();
        } else {
          setIntegrityStatus(`Flagged: ${eventType.replace('_', ' ')}`);
        }
      }
    }
  };

  // Monitor tab switches & window visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isTerminated) {
        recordViolation('tab_hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTerminated, violationCount]);


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

  useEffect(() => {
    if (timeLeft <= 0 && !isTerminated && onFinishSession) {
      setIsTerminated(true);
      onFinishSession();
    }
  }, [timeLeft, isTerminated, onFinishSession]);

  const handleRunCode = async () => {
    if (isTerminated || testingCode) return;
    setTestingCode(true);
    setActiveTab('testcases');
    try {
      const res = await onAnswerSubmit({
        durationSeconds: Math.max(1, (session?.durationMinutes || 15) * 60 - timeLeft),
        userCode,
        language: 'cpp',
        runOnly: true
      });
      if (res?.evaluation) {
        setTestResults({ ...res.evaluation, isSubmitted: false });
      }
    } catch (err) {
      console.error('Run code error:', err);
    } finally {
      setTestingCode(false);
    }
  };

  const handleSubmitCode = async () => {
    if (isTerminated || submitting) return;
    try {
      const res = await onAnswerSubmit({
        durationSeconds: Math.max(1, (session?.durationMinutes || 15) * 60 - timeLeft),
        userCode,
        language: 'cpp',
        runOnly: false
      });
      if (res?.evaluation) {
        setTestResults({ ...res.evaluation, isSubmitted: true });
      }
    } catch (err) {
      console.error('Submit code error:', err);
    }
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
          {/* Live Proctoring Webcam Video Feed Box */}
          <div className="relative w-20 h-14 rounded-xl overflow-hidden border border-surface-border bg-black shadow-inner flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          </div>

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
        
        {/* Left 5 cols: Question Details & Test Cases Panel */}
        <div className="lg:col-span-5 bg-surface border border-surface-border rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-2xl overflow-y-auto max-h-[680px]">
          
          {/* AI Avatar & Company Question Provenance Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-blue to-accent-cyan flex items-center justify-center text-white shadow-glow-blue">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{session?.company || 'Company'} Coding Interview</h3>
                  <span className="text-[10px] text-accent-cyan font-mono">Company-specific coding question</span>
                </div>
              </div>

              <span className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border ${statusColor}`}>
                {provenanceLabel}
              </span>
            </div>

            {/* Tabs for Question Details vs Test Case Results */}
            <div className="flex space-x-2 border-b border-surface-border pb-2 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('problem')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  activeTab === 'problem'
                    ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Problem Description
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('testcases')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'testcases'
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Test Execution</span>
                {testResults && (
                  <span className={`w-2 h-2 rounded-full ${testResults.executionPassed ? 'bg-green-400' : 'bg-red-400'}`}></span>
                )}
              </button>
            </div>

            {activeTab === 'problem' ? (
              /* Current Question Details */
              <div className="space-y-4 animate-fadeIn">
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

                <h2 className="text-lg font-extrabold text-white leading-snug">
                  {currentQuestion?.canonical_question || currentQuestion?.question_text?.split('\n')[0] || "Coding Problem"}
                </h2>

                <div className="text-xs text-gray-300 whitespace-pre-line leading-relaxed bg-surface-secondary/60 border border-surface-border p-4 rounded-2xl max-h-[300px] overflow-y-auto">
                  {currentQuestion?.question_text || "Given an input, write an efficient algorithm to solve the problem passing all sample and hidden test cases."}
                </div>

                {/* Sample Test Cases UI display */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-mono text-xs font-bold text-gray-300">Sample Test Cases</h4>
                  {(currentQuestion?.sampleTestCases || []).map((tc, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-surface-secondary border border-surface-border font-mono text-[11px] space-y-1">
                      <div className="text-gray-400 font-bold">Example {idx + 1}:</div>
                      <div><span className="text-gray-500">Input: </span><code className="text-accent-cyan">{tc.input}</code></div>
                      <div><span className="text-gray-500">Output: </span><code className="text-emerald-400">{tc.expectedOutput}</code></div>
                      {tc.explanation && <div><span className="text-gray-500">Explanation: </span><span className="text-gray-400">{tc.explanation}</span></div>}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(currentQuestion?.topics || ['Arrays']).map((t, idx) => (
                    <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary border border-surface-border text-gray-300">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              /* Test Results Output Panel */
              <div className="space-y-4 animate-fadeIn text-xs font-mono">
                {!testResults ? (
                  <div className="p-6 text-center text-gray-400 space-y-2 border border-surface-border rounded-2xl bg-surface-secondary/40">
                    <Code2 className="w-8 h-8 mx-auto text-gray-500" />
                    <p>Run or Submit your solution to view test case execution results.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`p-3 rounded-xl border flex items-center justify-between font-bold ${
                      testResults.executionPassed 
                        ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      <span>Status: {testResults.mainStatusDesc || (testResults.executionPassed ? 'Accepted' : 'Wrong Answer')}</span>
                      <span>Score: {testResults.performanceScore || 0}/100</span>
                    </div>

                    {/* Test cases list */}
                    <div className="space-y-2 max-h-[240px] overflow-y-auto">
                      {(testResults.executionResults || []).map((tc, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border space-y-1 ${
                          tc.passed ? 'bg-surface-secondary border-green-500/30' : 'bg-surface-secondary border-red-500/30'
                        }`}>
                          <div className="flex items-center justify-between font-bold">
                            <span className={tc.passed ? 'text-green-400' : 'text-red-400'}>
                              {tc.passed ? '✓ Passed' : '✗ Failed'} - Test Case #{idx + 1}
                            </span>
                            <span className="text-[10px] text-gray-400">{tc.timeMs || 0}ms</span>
                          </div>
                          {tc.input && (
                            <div className="text-[11px] text-gray-300">
                              <span className="text-gray-500">Input: </span>{tc.input}
                            </div>
                          )}
                          {tc.expectedOutput && (
                            <div className="text-[11px] text-gray-300">
                              <span className="text-gray-500">Expected: </span>{tc.expectedOutput}
                            </div>
                          )}
                          {tc.actualOutput && (
                            <div className="text-[11px] text-gray-300">
                              <span className="text-gray-500">Output: </span>{tc.actualOutput}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* AI Code Review Box (Rendered after question submission / evaluation) */}
                    {testResults.aiAnalysis && testResults.isSubmitted && (
                      <div className="p-3.5 rounded-xl bg-accent-blue/10 border border-accent-blue/30 space-y-2 text-[11px] animate-fadeIn">
                        <div className="font-bold text-accent-cyan flex items-center gap-1.5">
                          <Bot className="w-4 h-4" />
                          <span>AI Post-Submission Code Analysis</span>
                        </div>
                        <div className="flex items-center space-x-4 text-gray-300 font-mono">
                          <span>Time: <strong className="text-white">{testResults.aiAnalysis.timeComplexity}</strong></span>
                          <span>Space: <strong className="text-white">{testResults.aiAnalysis.spaceComplexity}</strong></span>
                        </div>
                        <p className="text-gray-300 leading-relaxed font-sans">{testResults.aiAnalysis.aiImprovementAdvice}</p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-surface-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-gray-400 font-mono">
                Question {(session?.currentQIndex || 0) + 1} of {session?.problemCount || 2}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                testResults?.isSubmitted
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {testResults?.isSubmitted ? '✓ Evaluated' : 'Pending Submission'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!testResults?.isSubmitted) {
                  handleSubmitCode();
                } else {
                  onNextQuestion();
                }
              }}
              disabled={loadingNext || submitting || isTerminated}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                testResults?.isSubmitted
                  ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white shadow-glow-blue hover:opacity-95'
                  : 'bg-surface-secondary border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10'
              } disabled:opacity-50`}
              title={testResults?.isSubmitted ? 'Proceed to next adaptive question' : 'Submit your code to continue'}
            >
              {loadingNext || submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{testResults?.isSubmitted ? 'Next Question →' : 'Submit & Next →'}</span>
            </button>
          </div>

        </div>

        {/* Right 7 cols: Monaco Code Editor & Run / Submit Toolbar */}
        <div className="lg:col-span-7 bg-[#080C19] border border-surface-border rounded-3xl overflow-hidden flex flex-col shadow-2xl">
          
          {/* Toolbar locked to C++17 Compiler */}
          <div className="bg-[#0B1020] border-b border-surface-border p-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-white font-bold">Compiler: C++17 (GCC 9.2)</span>
            </div>

            <span className="text-[10px] text-accent-cyan font-mono">
              Monitored Judge0 Sandbox Execution
            </span>
          </div>

          {/* Code Editor */}
          <div className="flex-1 min-h-[440px]">
            <Editor
              height="100%"
              language="cpp"
              value={userCode}
              onChange={(val) => setUserCode(val || '')}
              theme="vs-dark"
              options={{ fontSize: 13, minimap: { enabled: false } }}
            />
          </div>

          {/* Action Bar: Run Code & Submit Code */}
          <div className="p-4 bg-[#0B1020] border-t border-surface-border flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400 text-[11px]">Public & Hidden Test Cases Evaluated</span>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleRunCode}
                disabled={testingCode || submitting || isTerminated}
                className="px-4 py-2.5 rounded-xl bg-surface-secondary border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10 font-bold flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {testingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
                <span>Run Code</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitCode}
                disabled={submitting || testingCode || isTerminated}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-blue text-white font-bold shadow-glow-blue flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
                <span>Submit Code</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
