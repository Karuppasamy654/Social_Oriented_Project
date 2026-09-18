import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { CheckCircle2, ArrowRight, Brain, Sparkles, Award, Code2, AlertCircle, ShieldCheck, Square, ArrowLeft, RotateCcw } from 'lucide-react';

const ALL_DSA_TOPICS = [
  'Array',
  'String',
  'Binary Search',
  'Stack',
  'Queue',
  'Linked List',
  'Tree',
  'Graph',
  'Dynamic Programming',
  'HashMap',
  'Recursion & Backtracking',
  'Heap & Priority Queue',
  'Greedy',
  'Trie',
  'Bit Manipulation'
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateUserProfile } = useAuth();

  const isAssessmentRoute = location.pathname.includes('/assessment');
  const [viewState, setViewState] = useState(isAssessmentRoute ? 'assessment' : 'experience');

  // Step 1 Form Inputs
  const [selfReportedLevel, setSelfReportedLevel] = useState('Intermediate');
  const [externalPlatformId, setExternalPlatformId] = useState('');
  const [selectedTopics, setSelectedTopics] = useState(['Array', 'String', 'HashMap', 'Tree']);
  const [experienceText, setExperienceText] = useState('I have practiced Array, String algorithms, HashMaps, Binary Search Trees, and dynamic programming. I have solved 80 problems in C++ and Python.');

  // Analysis Result
  const [analyzedProfile, setAnalyzedProfile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Assessment Session State
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(12);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [adaptationExplanation, setAdaptationExplanation] = useState([]);
  const [selectedOption, setSelectedOption] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [finalProfile, setFinalProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Toggle Topic Box Selection
  const toggleTopic = (topicName) => {
    if (selectedTopics.includes(topicName)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topicName));
    } else {
      setSelectedTopics([...selectedTopics, topicName]);
    }
  };

  const handleSelectAllTopics = () => setSelectedTopics([...ALL_DSA_TOPICS]);
  const handleClearAllTopics = () => setSelectedTopics([]);

  // 1. Analyze Experience & Validate Self-Reported Level via Python ML Model
  const handleAnalyzeExperience = async () => {
    if (!experienceText.trim() && !selectedTopics.length) return;
    setAnalyzing(true);
    setErrorMessage('');
    try {
      const res = await api.post('/onboarding/analyze-experience', {
        selfReportedLevel,
        externalPlatformId,
        experienceText,
        selectedTopics
      });
      setAnalyzedProfile(res.data);
    } catch (err) {
      console.error('Analyze experience error:', err);
      setErrorMessage(err?.response?.data?.message || 'Failed to analyze experience text via Python ML service.');
    } finally {
      setAnalyzing(false);
    }
  };

  // 2. Start Dynamic 10-15 Question Assessment Session (Receives ONLY Question 1)
  const handleStartAssessment = async () => {
    setAnalyzing(true);
    setErrorMessage('');
    try {
      const res = await api.post('/onboarding/assessment/start', {
        selfReportedLevel,
        externalPlatformId,
        experienceText,
        selectedTopics
      });
      setSessionId(res.data.sessionId);
      setCurrentQuestionIndex(res.data.currentQuestionIndex || 0);
      setTotalQuestions(res.data.totalQuestions || 12);
      setCurrentQuestion(res.data.currentQuestion);
      setAdaptationExplanation(res.data.adaptationExplanation || []);
      setSelectedOption('');
      setViewState('assessment');
      navigate('/onboarding/assessment');
    } catch (err) {
      console.error('Start assessment error:', err);
      setErrorMessage(err?.response?.data?.message || 'Failed to start assessment session.');
    } finally {
      setAnalyzing(false);
    }
  };

  // 3. Submit Answer & Adapt Next Question Dynamically (Receives ONLY Question 2 or Final Profile)
  const handleSubmitAnswer = async () => {
    if (!selectedOption || !currentQuestion || submittingAnswer) return;
    setSubmittingAnswer(true);
    setErrorMessage('');

    try {
      const res = await api.post(`/onboarding/assessment/${sessionId}/answer`, {
        questionId: currentQuestion.id,
        userAnswer: selectedOption
      });

      if (res.data.status === 'COMPLETED' || res.data.finalProfile) {
        setFinalProfile(res.data.finalProfile);
        updateUserProfile({
          onboardingCompleted: true,
          isOnboarded: true,
          selfReportedLevel,
          verifiedLevel: res.data.finalProfile?.verifiedLevel || selfReportedLevel
        });
        setViewState('summary');
      } else {
        setCurrentQuestionIndex(res.data.currentQuestionIndex);
        setTotalQuestions(res.data.totalQuestions || 12);
        setCurrentQuestion(res.data.currentQuestion);
        setAdaptationExplanation(res.data.adaptationExplanation || []);
        setSelectedOption('');
      }
    } catch (err) {
      console.error('Submit answer error:', err);
      setErrorMessage(err?.response?.data?.message || 'Failed to process answer via Python ML engine.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleGoToDashboard = () => {
    updateUserProfile({ onboardingCompleted: true, isOnboarded: true });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[85vh] max-w-4xl mx-auto px-4 py-10">

      {/* Stepper Header */}
      <div className="flex items-center justify-center space-x-4 mb-10 text-xs font-semibold">
        <div className={`flex items-center space-x-2 ${viewState === 'experience' ? 'text-pink-400 font-bold' : 'text-gray-400'}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${viewState === 'experience' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30' : 'bg-surface-secondary text-gray-400'}`}>1</span>
          <span>Topic & Experience Entry</span>
        </div>
        <div className="w-12 h-0.5 bg-surface-border"></div>
        <div className={`flex items-center space-x-2 ${viewState === 'assessment' ? 'text-amber-400 font-bold' : 'text-gray-400'}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${viewState === 'assessment' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-surface-secondary text-gray-400'}`}>2</span>
          <span>Adaptive Python ML Questions (10-15 Qs)</span>
        </div>
        <div className="w-12 h-0.5 bg-surface-border"></div>
        <div className={`flex items-center space-x-2 ${viewState === 'summary' ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${viewState === 'summary' ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-surface-secondary text-gray-400'}`}>3</span>
          <span>ML Skill Verification Result</span>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* VIEW 1: Form & Interactive Topic Selection */}
      {viewState === 'experience' && (
        <div className="bg-surface border border-surface-border rounded-3xl p-8 shadow-2xl space-y-8 animate-fadeIn">

          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-3xl font-black text-white bg-gradient-to-r from-pink-400 via-purple-300 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
              ML-Driven Adaptive Onboarding
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Select all topics you have practiced, enter your external handle, and describe your experience. Our scikit-learn TF-IDF model parses your inputs to dynamically generate 10–15 assessment questions.
            </p>
          </div>

          {/* 1. Self-Reported Coding Level */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              1. Select Your Self-Reported Coding Experience Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'Beginner', title: 'Beginner', desc: 'Basic variables, loops, arrays & fundamental logic' },
                { id: 'Intermediate', title: 'Intermediate', desc: 'HashMaps, Trees, Recursion & 50+ DSA problems' },
                { id: 'Expert', title: 'Expert / Advanced', desc: 'Graph algorithms, DP, System Design & 200+ problems' }
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelfReportedLevel(item.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    selfReportedLevel === item.id 
                      ? 'bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-transparent border-pink-500 text-white shadow-xl shadow-pink-500/20 scale-[1.02]' 
                      : 'bg-surface-secondary border-surface-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-extrabold text-sm text-white">{item.title}</h3>
                    {selfReportedLevel === item.id && <ShieldCheck className="w-5 h-5 text-pink-400" />}
                  </div>
                  <p className="text-xs text-gray-400 leading-normal">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Interactive Topic Select Boxes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                2. Select All Practiced Data Structures & Topics ({selectedTopics.length} Selected)
              </label>
              <div className="flex space-x-3 text-xs">
                <button type="button" onClick={handleSelectAllTopics} className="text-pink-400 font-bold hover:underline">Select All</button>
                <span className="text-gray-600">|</span>
                <button type="button" onClick={handleClearAllTopics} className="text-amber-400 font-bold hover:underline">Clear</button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {ALL_DSA_TOPICS.map((topicName) => {
                const isSelected = selectedTopics.includes(topicName);
                return (
                  <div
                    key={topicName}
                    onClick={() => toggleTopic(topicName)}
                    className={`p-3 rounded-2xl border cursor-pointer text-xs font-bold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 border-pink-500 text-white shadow-md shadow-pink-500/20'
                        : 'bg-surface-secondary border-surface-border text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span className="truncate mr-1">{topicName}</span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. External Platform Profile Handle */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              3. External Coding Platform Handle / Profile ID (Optional)
            </label>
            <div className="relative">
              <Code2 className="w-4 h-4 text-gray-500 absolute left-4 top-3.5" />
              <input
                type="text"
                value={externalPlatformId}
                onChange={(e) => setExternalPlatformId(e.target.value)}
                placeholder="e.g. @john_leetcode or leetcode.com/u/john or codeforces_john"
                className="w-full bg-surface-secondary border border-surface-border rounded-2xl pl-11 pr-4 py-3 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* 4. Free-Text Experience */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              4. Additional Details About Your Experience & Languages
            </label>
            <textarea
              rows={3}
              value={experienceText}
              onChange={(e) => setExperienceText(e.target.value)}
              placeholder="e.g. I have practiced Array, String algorithms, HashMaps, Binary Search Trees, and dynamic programming. I solved 80 problems in C++ and Python..."
              className="w-full bg-surface-secondary border border-surface-border rounded-2xl p-4 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors placeholder:text-gray-600"
            />
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-surface-border">
            <button
              onClick={handleAnalyzeExperience}
              disabled={analyzing || (!experienceText.trim() && !selectedTopics.length)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-surface-secondary border border-surface-border hover:border-pink-500/50 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Brain className="w-4 h-4 text-pink-400 animate-pulse" />
              <span>{analyzing ? 'Analyzing via Python ML Service...' : 'Analyze Experience via Python ML'}</span>
            </button>

            <button
              onClick={handleStartAssessment}
              disabled={analyzing || (!experienceText.trim() && !selectedTopics.length)}
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 via-amber-400 to-emerald-400 text-white font-extrabold text-xs shadow-xl shadow-pink-500/30 hover:scale-105 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>Start Adaptive ML Assessment ({analyzedProfile?.recommendedAssessmentLength || '12'} Qs)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* ML Experience Analysis Preview Card */}
          {analyzedProfile && (
            <div className="bg-surface-secondary/80 border border-surface-border rounded-2xl p-6 space-y-4 animate-fadeIn">
              
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2 text-pink-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Python ML Experience Validation Report</span>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Initial Ability: {analyzedProfile.initialSkill?.ability_score || 0.35}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-surface border border-surface-border p-3 rounded-xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Self-Reported Level</span>
                  <span className="text-white font-extrabold text-sm">{analyzedProfile.selfReportedLevel}</span>
                </div>
                <div className="bg-surface border border-surface-border p-3 rounded-xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">ML Estimated Level</span>
                  <span className="text-pink-400 font-extrabold text-sm">{analyzedProfile.initialSkill?.initial_level || 'Beginner'}</span>
                </div>
                <div className="bg-surface border border-surface-border p-3 rounded-xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">ML Confidence</span>
                  <span className="text-emerald-400 font-extrabold text-sm">{Math.round((analyzedProfile.initialSkill?.confidence || 0.8) * 100)}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Python TF-IDF Detected Topics:</span>
                <div className="flex flex-wrap gap-2">
                  {analyzedProfile.topics?.map((t, idx) => (
                    <span key={idx} className="px-3.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center space-x-1.5">
                      <span>{t.name}</span>
                      <span className="text-[10px] text-pink-400 font-mono">({Math.round((t.probability || 0.5) * 100)}%)</span>
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 italic bg-surface/50 p-3 rounded-xl border border-surface-border">
                🤖 {analyzedProfile.summary}
              </p>
            </div>
          )}

        </div>
      )}

      {/* VIEW 2: Dynamic ML Adaptive Assessment (10-15 Questions) */}
      {viewState === 'assessment' && currentQuestion && (
        <div className="bg-surface border border-surface-border rounded-3xl p-8 shadow-2xl space-y-6 animate-fadeIn">
          
          <div className="flex items-center justify-between border-b border-surface-border pb-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-6 h-6 text-amber-400 animate-pulse" />
              <span className="text-sm font-bold text-white">
                Python ML Question {currentQuestionIndex + 1} of {totalQuestions}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                Topic: {currentQuestion.topic}
              </span>
              <span className={`text-xs px-4 py-1.5 rounded-full border font-black uppercase tracking-wider flex items-center space-x-2 shadow-lg transition-all ${
                (currentQuestion.difficulty || '').toLowerCase() === 'easy'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-emerald-500/20'
                  : (currentQuestion.difficulty || '').toLowerCase() === 'hard'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-rose-500/20'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-amber-500/20'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  (currentQuestion.difficulty || '').toLowerCase() === 'easy' ? 'bg-emerald-400 shadow-sm shadow-emerald-400' :
                  (currentQuestion.difficulty || '').toLowerCase() === 'hard' ? 'bg-rose-400 shadow-sm shadow-rose-400' : 'bg-amber-400 shadow-sm shadow-amber-400'
                }`}></span>
                <span>{currentQuestion.difficulty || 'Medium'}</span>
              </span>
            </div>
          </div>

          {/* Adaptation Explanation Badges */}
          {adaptationExplanation && adaptationExplanation.length > 0 && (
            <div className="bg-surface-secondary/70 border border-surface-border p-3 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
              <span className="text-pink-400 font-bold text-[11px] uppercase tracking-wider">🤖 Python Adaptation Reasoning:</span>
              {adaptationExplanation.map((reason, rIdx) => (
                <span key={rIdx} className="px-2.5 py-0.5 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-300 text-[11px] font-mono">
                  • {reason}
                </span>
              ))}
            </div>
          )}

          <div className="w-full bg-surface-secondary h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-pink-500 via-purple-500 via-amber-400 to-emerald-400 h-full transition-all duration-500" 
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            ></div>
          </div>

          {(() => {
            const displayTitle = currentQuestion.title || currentQuestion.source_problem || (currentQuestion.question_text || currentQuestion.questionText || '').split('\n')[0] || 'Assessment Question';
            const rawStatement = currentQuestion.problemStatement || currentQuestion.problem_statement || currentQuestion.question_text || currentQuestion.questionText || currentQuestion.description;
            const displayStatement = rawStatement ? String(rawStatement).replace(/^\[[^\]]+\]\s*/, '') : `Analyze and solve the ${displayTitle} algorithm problem handling all edge cases.`;
            const displayOptions = (currentQuestion.options && currentQuestion.options.length > 0)
              ? currentQuestion.options
              : [
                  "A) Optimal O(N) linear time approach",
                  "B) Sorting-based O(N log N) approach",
                  "C) Brute-force O(N^2) quadratic nested loop approach",
                  "D) Auxiliary hash table / two-pointer approach"
                ];

            return (
              <>
                <div className="py-2 space-y-4">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {displayTitle}
                  </h3>
                  
                  <div className="p-4 rounded-2xl bg-surface-secondary/90 border border-surface-border text-xs text-gray-200 leading-relaxed font-sans">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 font-mono">PROBLEM STATEMENT:</span>
                    <p className="whitespace-pre-wrap">{displayStatement}</p>
                  </div>

                  {/* Render Example block if available */}
                  {currentQuestion.examples && currentQuestion.examples.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider font-mono">SAMPLE EXAMPLE:</span>
                      {currentQuestion.examples.map((ex, exIdx) => (
                        <div key={exIdx} className="p-3.5 rounded-xl bg-black/40 border border-surface-border text-xs font-mono space-y-1">
                          {typeof ex === 'object' ? (
                            <>
                              {ex.input && <div><span className="text-pink-400 font-bold">Input:</span> {ex.input}</div>}
                              {ex.output && <div><span className="text-emerald-400 font-bold">Output:</span> {ex.output}</div>}
                              {ex.explanation && <div className="text-gray-400 text-[11px] pt-1 border-t border-gray-800">Explanation: {ex.explanation}</div>}
                            </>
                          ) : (
                            <div className="text-gray-300">{String(ex)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Render Constraints block if available */}
                  {currentQuestion.constraints && (Array.isArray(currentQuestion.constraints) ? currentQuestion.constraints.length > 0 : Boolean(currentQuestion.constraints)) && (
                    <div className="p-3 rounded-xl bg-surface-secondary/50 border border-surface-border text-[11px] font-mono space-y-1">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">CONSTRAINTS:</span>
                      {Array.isArray(currentQuestion.constraints) ? (
                        <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                          {currentQuestion.constraints.map((c, cIdx) => (
                            <li key={cIdx}>{c}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-400">{String(currentQuestion.constraints)}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {displayOptions.map((opt, oIdx) => {
                    const isSelected = selectedOption === opt;
                    return (
                      <div
                        key={oIdx}
                        onClick={() => setSelectedOption(opt)}
                        className={`p-4 rounded-2xl border cursor-pointer text-xs font-semibold transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 border-pink-500 text-white shadow-lg shadow-pink-500/20' 
                            : 'bg-surface-secondary border-surface-border text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${isSelected ? 'bg-pink-500 text-white' : 'bg-surface border border-surface-border text-gray-400'}`}>
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-pink-400" />}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-surface-border">
            <button
              onClick={() => setViewState('experience')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-surface-secondary border border-surface-border hover:border-pink-500/50 text-gray-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4 text-pink-400" />
              <span>Back to First Page (Topic Entry)</span>
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={!selectedOption || submittingAnswer}
              className="w-full sm:w-auto px-10 py-4 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-coral-500 text-white font-extrabold text-xs shadow-xl shadow-orange-500/30 hover:scale-105 transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              <span>{submittingAnswer ? 'Evaluating Python ML Engine...' : currentQuestionIndex + 1 === totalQuestions ? 'Submit Final Answer & Compute Result' : 'Submit Answer & Adapt Next Question'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: Final Verified ML Result */}
      {viewState === 'summary' && finalProfile && (
        <div className="bg-surface border border-surface-border rounded-3xl p-8 shadow-2xl space-y-8 text-center animate-fadeIn">
          
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-emerald-400 p-1 mx-auto shadow-2xl">
            <div className="w-full h-full rounded-full bg-[#0B1020] flex items-center justify-center">
              <Award className="w-12 h-12 text-amber-400" />
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black text-white bg-gradient-to-r from-pink-400 via-purple-300 to-emerald-300 bg-clip-text text-transparent">
              scikit-learn Skill Verification Complete!
            </h2>
            <p className="text-xs text-gray-400 mt-2">
              Our trained scikit-learn ML models evaluated your responses and constructed your verified coding skill profile.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="bg-surface-secondary border border-surface-border rounded-2xl p-4 text-center">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Self-Reported Level</span>
              <h3 className="text-xl font-black text-white mt-1">{finalProfile.selfReportedLevel || 'Beginner'}</h3>
            </div>
            <div className="bg-surface-secondary border border-surface-border rounded-2xl p-4 text-center">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">ML Verified Level</span>
              <h3 className="text-xl font-black text-emerald-400 mt-1">{finalProfile.verifiedLevel || 'Intermediate'}</h3>
            </div>
            <div className="bg-surface-secondary border border-surface-border rounded-2xl p-4 text-center">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Accuracy Score</span>
              <h3 className="text-xl font-black text-purple-400 mt-1">{finalProfile.overall_skill?.score || 80}%</h3>
            </div>
            <div className="bg-surface-secondary border border-surface-border rounded-2xl p-4 text-center">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">ML Confidence</span>
              <h3 className="text-xl font-black text-amber-400 mt-1">{finalProfile.overall_skill?.confidence || 85}%</h3>
            </div>
          </div>

          <div className="bg-surface-secondary/80 border border-surface-border rounded-2xl p-6 text-left max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
                <Brain className="w-4 h-4" />
                <span>Python ML Skill Evaluation Breakdown</span>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {finalProfile.explanation?.summary || 'ML model evaluated assessment performance.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-border">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Verified Strengths:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {finalProfile.strengths?.map((s, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Target Focus Topics:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {finalProfile.weaknesses?.map((w, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-bold">
                      ⚡ {w}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setViewState('experience')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-surface-secondary border border-surface-border text-gray-300 hover:text-white hover:border-pink-500/50 text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <RotateCcw className="w-4 h-4 text-pink-400" />
              <span>Back to First Page (Topic Entry)</span>
            </button>

            <button
              onClick={handleGoToDashboard}
              className="w-full sm:w-auto px-12 py-4 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 via-amber-400 to-emerald-400 text-white font-extrabold text-xs shadow-2xl shadow-pink-500/30 hover:scale-105 transition-all flex items-center justify-center space-x-2"
            >
              <span>Go to CodeBuddy Main Dashboard Page</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
