import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Flame, Target, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CodingStreakChart from '../components/CodingStreakChart';

export default function DashboardPage() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [todayChallenge, setTodayChallenge] = useState(null);
  const [mistakes, setMistakes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/recommendations'), api.get('/recommendations/mistakes')])
      .then(([recommendationResponse, mistakeResponse]) => {
        if (!active) return;
        setTodayChallenge(recommendationResponse.data.todayChallenge || null);
        setRecommendations(recommendationResponse.data.recommendations || []);
        setMistakes(mistakeResponse.data || []);
      })
      .catch((requestError) => active && setError(requestError.response?.data?.message || 'Dashboard data could not be loaded.'));
    return () => { active = false; };
  }, []);

  const stats = user?.codingStats || {};
  const solved = stats.totalSolved ?? 0;
  const accuracy = stats.accuracy ?? 0;
  const streak = stats.currentStreak ?? 0;

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <section className="bg-surface border border-surface-border rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={user?.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border border-accent-blue/50" />
          <div>
            <h1 className="text-2xl font-extrabold text-white">Welcome, {user?.displayName || user?.name || 'Student'}</h1>
            <p className="text-xs text-gray-400 font-mono">@{user?.username || 'student'} · {user?.verifiedLevel || 'Not assessed'}</p>
          </div>
        </div>
        <div className="flex gap-5 text-sm">
          <span className="text-accent-lime flex gap-1 items-center"><CheckCircle2 className="w-4 h-4" />{solved} solved</span>
          <span className="text-accent-orange flex gap-1 items-center"><Flame className="w-4 h-4" />{streak} day streak</span>
          <span className="text-accent-purple flex gap-1 items-center"><Zap className="w-4 h-4" />{accuracy}% accuracy</span>
        </div>
      </section>

      {error && <p className="text-red-400">{error}</p>}
      {todayChallenge?.problem && (
        <section className="bg-surface border border-accent-blue/40 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-accent-blue text-sm font-bold"><Target className="w-4 h-4" />Today’s challenge</div>
          <h2 className="text-xl font-bold text-white mt-3">{todayChallenge.problem.title}</h2>
          <p className="text-xs text-gray-400 mt-1">{(todayChallenge.problem.topics || []).join(' · ')}</p>
          {todayChallenge.primaryReason && <p className="text-sm text-gray-300 mt-4">{todayChallenge.primaryReason}</p>}
          <Link className="inline-block mt-5 px-4 py-2 rounded-xl bg-accent-blue text-white text-sm font-bold" to={`/problems/${todayChallenge.problem.slug}`}>Solve challenge</Link>
        </section>
      )}

      {/* Coding Activity Heatmap & Streak Chart */}
      <CodingStreakChart userStats={user?.codingStats || {}} activityCalendar={user?.activityCalendar || {}} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface border border-surface-border rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white">Recommended for you</h2>
          <div className="mt-4 space-y-3">
            {recommendations.length === 0 && <p className="text-sm text-gray-400">Complete onboarding or submit a problem to receive recommendations.</p>}
            {recommendations.slice(0, 5).map((recommendation) => recommendation.problem && (
              <Link key={recommendation.problem._id || recommendation.problem.slug} to={`/problems/${recommendation.problem.slug}`} className="block p-4 rounded-xl bg-surface-secondary border border-surface-border hover:border-accent-blue">
                <p className="font-bold text-white">{recommendation.problem.title}</p>
                <p className="text-xs text-gray-400 mt-1">{recommendation.problem.difficulty} · {(recommendation.problem.topics || []).join(', ')}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-surface-border rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-accent-orange" />Mistake insights</h2>
          <div className="mt-4 space-y-3">
            {mistakes.length === 0 && <p className="text-sm text-gray-400">No recurring mistakes recorded yet.</p>}
            {mistakes.map((mistake, index) => (
              <div key={`${mistake.topic || 'mistake'}-${index}`} className="p-4 rounded-xl bg-surface-secondary border border-surface-border">
                <p className="font-bold text-white">{mistake.topic || 'General'}</p>
                <p className="text-sm text-gray-400">{mistake.mistakeType || mistake.mistake || 'Review this pattern in your recent submissions.'}{mistake.frequency ? ` (${mistake.frequency} occurrences)` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
