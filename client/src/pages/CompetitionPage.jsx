import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Swords, Trophy, Clock, CheckCircle2, Flame, Sparkles, ArrowRight, ShieldCheck 
} from 'lucide-react';

export default function CompetitionPage() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [activeArena, setActiveArena] = useState(null);
  const [timeLeft, setTimeLeft] = useState(2700); // 45 mins countdown

  useEffect(() => {
    fetchCompetitions();
  }, []);

  useEffect(() => {
    if (activeArena) {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeArena]);

  const fetchCompetitions = async () => {
    try {
      const res = await api.get('/competitions');
      setCompetitions(res.data || []);
    } catch (err) {
      console.error('Error fetching competitions:', err);
    }
  };

  const handleJoinArena = async (comp) => {
    try {
      const res = await api.post(`/competitions/${comp._id}/join`);
      setActiveArena(res.data);
    } catch (err) {
      console.error('Error joining arena:', err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Swords className="w-8 h-8 text-accent-orange" />
            <span>CodeBuddy Arena</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Compete in real-time algorithmic sprints against matched coders to boost your Elo rating.</p>
        </div>

        {/* AI Recommended Banner */}
        <div className="px-4 py-2 rounded-2xl bg-accent-orange/10 border border-accent-orange/30 text-accent-orange text-xs font-bold flex items-center space-x-2">
          <Sparkles className="w-4 h-4" />
          <span>Match Confidence: 91% (Intermediate Tier)</span>
        </div>
      </div>

      {/* ACTIVE CONTEST ARENA */}
      {activeArena ? (
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="bg-surface border border-surface-border rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
            <div>
              <h2 className="text-xl font-extrabold text-white">{activeArena.title}</h2>
              <p className="text-xs text-gray-400 font-sans mt-0.5">Live Contest Arena • 12 Active Players</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase">Time Remaining</p>
                <p className="text-2xl font-bold text-accent-orange flex items-center gap-1.5">
                  <Clock className="w-5 h-5 animate-pulse" /> {formatTime(timeLeft)}
                </p>
              </div>
              <button
                onClick={() => setActiveArena(null)}
                className="px-4 py-2 rounded-xl bg-surface-secondary border border-surface-border text-xs text-gray-300 font-sans font-bold hover:text-white"
              >
                Exit Arena
              </button>
            </div>
          </div>

          {/* Arena Grid: Problems & Live Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left 7 cols: Contest Problem Set */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Contest Problems</h3>
              {(activeArena.problems || []).map((p, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-surface border border-surface-border hover:border-accent-orange/50 transition-all flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-accent-orange mr-2">Problem {String.fromCharCode(65 + idx)}</span>
                    <h4 className="inline text-base font-bold text-white">{p.title || `Contest Challenge #${idx + 1}`}</h4>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{p.difficulty || 'Medium'} • {p.expectedComplexity?.time || 'O(N)'}</p>
                  </div>
                  <Link
                    to={`/problems/${p.slug || 'two-sum'}`}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-orange to-accent-pink text-white text-xs font-bold shadow-glow-purple"
                  >
                    Solve Now
                  </Link>
                </div>
              ))}
            </div>

            {/* Right 5 cols: Live Real-time Leaderboard */}
            <div className="lg:col-span-5 bg-surface border border-surface-border rounded-3xl p-6 space-y-4 font-mono text-xs">
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
                <Trophy className="w-5 h-5 text-accent-cyan" />
                <span>Live Arena Leaderboard</span>
              </h3>

              <div className="space-y-3">
                {[
                  { rank: 1, name: 'Alex', score: 480, solved: '2/4', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=250' },
                  { rank: 2, name: 'Priya', score: 430, solved: '2/4', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250' },
                  { rank: 3, name: user?.username || 'You', score: 390, solved: '1/4', avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250', isYou: true }
                ].map((item) => (
                  <div key={item.rank} className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    item.isYou ? 'bg-accent-orange/10 border-accent-orange text-white' : 'bg-surface-secondary border-surface-border text-gray-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-sm text-gray-400">#{item.rank}</span>
                      <img src={item.avatar} alt={item.name} className="w-8 h-8 rounded-full border border-gray-600" />
                      <div>
                        <p className="font-bold text-white">{item.name} {item.isYou && '(You)'}</p>
                        <p className="text-[10px] text-gray-400">Solved: {item.solved}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-accent-orange">{item.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ARENA LOBBY */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((comp) => (
            <div key={comp._id} className="p-6 rounded-3xl bg-surface border border-surface-border hover:border-accent-orange/50 transition-all shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent-orange/20 text-accent-orange border border-accent-orange/30">
                  {comp.difficultyTier}
                </span>
                <span className="text-xs text-gray-400 font-mono">45 Mins</span>
              </div>

              <h3 className="text-xl font-bold text-white">{comp.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{comp.description}</p>

              <button
                onClick={() => handleJoinArena(comp)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-orange to-accent-pink text-white text-xs font-bold shadow-glow-purple transition-all"
              >
                Enter Contest Arena →
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
