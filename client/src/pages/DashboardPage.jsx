import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Flame, Award, Target, BookOpen, AlertTriangle, 
  ArrowRight, CheckCircle2, Clock, Zap, TrendingUp, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { user } = useAuth();
  const [todayChallenge, setTodayChallenge] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [recRes, mistRes] = await Promise.all([
        api.get('/recommendations'),
        api.get('/recommendations/mistakes')
      ]);
      setTodayChallenge(recRes.data.todayChallenge);
      setRecommendations(recRes.data.recommendations || []);
      setMistakes(mistRes.data || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const solvedCount = user?.codingStats?.totalSolved || 12;
  const accuracy = user?.codingStats?.accuracy || 84;
  const streak = user?.codingStats?.currentStreak || 5;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile & Stats Header */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent-blue/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center space-x-5 text-left">
          <img 
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'} 
            alt="Avatar" 
            className="w-20 h-20 rounded-2xl object-cover border-2 border-accent-blue/50 shadow-glow-blue"
          />
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{user?.name || 'Arun Kumar'}</h1>
              <span className="px-3 py-1 rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30 text-xs font-bold">
                Verified: {user?.verifiedLevel || 'Intermediate+'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 font-mono">@{user?.username || 'arunkumar'} • Global Rank #42</p>
            <div className="flex items-center space-x-4 mt-3 text-xs">
              <span className="flex items-center text-accent-orange font-bold">
                <Flame className="w-4 h-4 mr-1 fill-accent-orange" /> {streak} Day Streak
              </span>
              <span className="flex items-center text-accent-lime font-bold">
                <CheckCircle2 className="w-4 h-4 mr-1" /> {solvedCount} Solved
              </span>
              <span className="flex items-center text-accent-purple font-bold">
                <Zap className="w-4 h-4 mr-1" /> {accuracy}% Accuracy
              </span>
            </div>
          </div>
        </div>

        {/* Level Rating Card */}
        <div className="bg-surface-secondary border border-surface-border rounded-2xl p-5 w-full md:w-auto min-w-[240px] text-center font-mono space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Competition Rating</p>
          <p className="text-3xl font-extrabold text-white">{user?.codingStats?.rating || 1420}</p>
          <div className="flex items-center justify-center space-x-1 text-[11px] text-accent-cyan font-sans">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Top 8% on CodeBuddy</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Challenge & Level Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 7 cols: Today's Recommendation & Continue Learning */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Today's Challenge Card */}
          {todayChallenge && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-surface-secondary via-surface to-[#1A233D] border border-accent-blue/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30 text-xs font-bold">
                  <Target className="w-4 h-4" />
                  <span>Today's Challenge</span>
                </span>
                <span className="text-xs px-2.5 py-1 rounded-md bg-green-500/20 text-green-400 font-bold border border-green-500/30">
                  {todayChallenge.problem?.difficulty || 'Easy'}
                </span>
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-2">
                {todayChallenge.problem?.title || 'Two Sum'}
              </h2>
              <p className="text-xs text-accent-cyan font-mono mb-4">
                Topics: {(todayChallenge.problem?.topics || ['Array', 'HashMap']).join(' • ')}
              </p>

              {/* AI Recommendation Reason */}
              <div className="p-4 rounded-xl bg-[#0B1020]/70 border border-surface-border text-xs text-gray-300 space-y-1 mb-6">
                <span className="font-bold text-accent-purple flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> CodeBuddy AI Recommendation Reason:
                </span>
                <p className="text-gray-300 leading-normal">{todayChallenge.primaryReason}</p>
              </div>

              <Link
                to={`/problems/${todayChallenge.problem?.slug || 'two-sum'}`}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold text-xs shadow-glow-blue hover:opacity-90 transition-all"
              >
                <span>Solve Challenge Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          )}

          {/* Continue Learning / Recommended Problems */}
          <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent-purple" />
                <span>Recommended Problems For You</span>
              </h3>
              <Link to="/problems" className="text-xs font-semibold text-accent-blue hover:underline">
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              {recommendations.slice(1, 4).map((rec, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-surface-secondary border border-surface-border hover:border-accent-blue/40 transition-all flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-white">{rec.problem?.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        rec.problem?.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {rec.problem?.difficulty}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">{(rec.problem?.topics || []).join(' • ')}</p>
                  </div>
                  <Link
                    to={`/problems/${rec.problem?.slug}`}
                    className="px-4 py-2 rounded-xl bg-surface border border-surface-border text-xs font-bold text-gray-300 hover:text-white hover:border-accent-blue transition-colors"
                  >
                    Solve
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 5 cols: Animated Progress & Mistake Insights */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Animated Skill Progress */}
          <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-accent-cyan" />
              <span>Skill Mastery Progress</span>
            </h3>

            <div className="space-y-5 font-mono text-xs">
              <div>
                <div className="flex justify-between mb-1.5 font-sans font-semibold text-gray-300">
                  <span>Beginner Level</span>
                  <span className="text-accent-lime font-bold">100%</span>
                </div>
                <div className="w-full bg-surface-secondary rounded-full h-3 overflow-hidden p-0.5 border border-surface-border">
                  <div className="bg-accent-lime h-full rounded-full w-[100%] shadow-glow-blue"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 font-sans font-semibold text-gray-300">
                  <span>Intermediate Level</span>
                  <span className="text-accent-blue font-bold">70%</span>
                </div>
                <div className="w-full bg-surface-secondary rounded-full h-3 overflow-hidden p-0.5 border border-surface-border">
                  <div className="bg-accent-blue h-full rounded-full w-[70%] shadow-glow-blue"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 font-sans font-semibold text-gray-300">
                  <span>Advanced / Expert</span>
                  <span className="text-accent-purple font-bold">30%</span>
                </div>
                <div className="w-full bg-surface-secondary rounded-full h-3 overflow-hidden p-0.5 border border-surface-border">
                  <div className="bg-accent-purple h-full rounded-full w-[30%] shadow-glow-purple"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Mistake Insights */}
          <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 text-accent-orange">
              <AlertTriangle className="w-5 h-5" />
              <span>Mistake Insights</span>
            </h3>

            <p className="text-xs text-gray-400">
              CodeBuddy tracks your recurring code flaws across array boundaries, maps, and recursion.
            </p>

            <div className="space-y-3 font-sans text-xs">
              {[
                { topic: 'Sliding Window', mistake: 'Off-by-one boundary condition × 4', color: 'border-accent-orange/40 bg-accent-orange/5' },
                { topic: 'HashMap', mistake: 'Forgetting to check key existence × 3', color: 'border-accent-purple/40 bg-accent-purple/5' },
                { topic: 'Recursion', mistake: 'Missing explicit base case × 2', color: 'border-accent-pink/40 bg-accent-pink/5' }
              ].map((item, idx) => (
                <div key={idx} className={`p-3.5 rounded-xl border ${item.color} flex items-start space-x-3`}>
                  <div className="w-2 h-2 rounded-full bg-accent-orange mt-1.5"></div>
                  <div>
                    <p className="font-bold text-white">{item.topic}</p>
                    <p className="text-gray-300 mt-0.5">{item.mistake}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
