import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Trophy, Flame, CheckCircle2, Award, Zap, ChevronLeft, ChevronRight, User } from 'lucide-react';

export default function LeaderboardPage() {
  const [metric, setMetric] = useState('solved');
  const [timeframe, setTimeframe] = useState('all_time');
  const [leaderboard, setLeaderboard] = useState([]);
  const [meRank, setMeRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLeaderboard();
  }, [metric, timeframe, page]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leaderboard', {
        params: { type: metric, timeframe, page, limit: 20 }
      });
      setLeaderboard(res.data.leaderboard || []);
      setMeRank(res.data.me || null);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-accent-cyan" />
              <span>Developer Leaderboard</span>
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              Real-time competitive developer rankings derived from distinct problem solutions, contest rating, and activity streaks.
            </p>
          </div>

          {/* Controls: Metric & Timeframe */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Switcher */}
            <div className="flex bg-surface-secondary border border-surface-border rounded-2xl p-1 text-xs font-mono font-bold">
              {[
                { id: 'solved', label: 'Problems Solved' },
                { id: 'rating', label: 'Contest Rating' },
                { id: 'streak', label: 'Streak' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMetric(m.id); setPage(1); }}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    metric === m.id
                      ? 'bg-accent-blue text-white shadow-glow-blue'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Timeframe Switcher */}
            <div className="flex bg-surface-secondary border border-surface-border rounded-2xl p-1 text-xs font-mono font-bold">
              {[
                { id: 'all_time', label: 'All Time' },
                { id: 'monthly', label: 'This Month' },
                { id: 'weekly', label: 'This Week' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTimeframe(t.id); setPage(1); }}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    timeframe === t.id
                      ? 'bg-accent-purple text-white shadow-glow-purple'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Authenticated User Rank Card */}
        {meRank && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-blue/15 via-accent-purple/15 to-accent-cyan/15 border border-accent-blue/40 flex items-center justify-between font-mono text-xs">
            <div className="flex items-center space-x-3">
              <span className="text-base font-extrabold text-accent-cyan">Your Rank: #{meRank.rank}</span>
              <img src={meRank.avatar} alt={meRank.username} className="w-8 h-8 rounded-full border border-accent-blue/40" />
              <span className="font-bold text-white">@{meRank.username}</span>
            </div>
            <div className="flex items-center space-x-6 text-gray-300">
              <span>{meRank.solvedCount} Solved</span>
              <span>{meRank.rating} Rating</span>
              <span className="text-accent-orange flex items-center gap-1 font-bold">
                <Flame className="w-3.5 h-3.5 fill-accent-orange" /> {meRank.streak}d
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-surface border border-surface-border rounded-3xl overflow-hidden shadow-2xl space-y-4">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-400 font-mono">Calculating developer standings...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center text-gray-400 font-mono space-y-3">
            <Trophy className="w-10 h-10 text-gray-500 mx-auto" />
            <p className="text-base font-semibold text-white">No leaderboard data available yet</p>
            <p className="text-xs text-gray-400">Solve problems or participate in contests to appear on the global leaderboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-surface-secondary text-gray-400 font-mono text-[11px] uppercase tracking-wider border-b border-surface-border">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Developer</th>
                  <th className="px-6 py-4">Verified Level</th>
                  <th className="px-6 py-4">Problems Solved</th>
                  <th className="px-6 py-4">Accuracy</th>
                  <th className="px-6 py-4">Streak</th>
                  <th className="px-6 py-4 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-gray-200">
                {leaderboard.map((item) => (
                  <tr key={item._id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-sm">
                      {item.rank === 1 ? '🥇 #1' : item.rank === 2 ? '🥈 #2' : item.rank === 3 ? '🥉 #3' : `#${item.rank}`}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/profile/${item.username}`} className="flex items-center space-x-3 group">
                        <img src={item.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'} alt={item.username} className="w-8 h-8 rounded-full border border-surface-border object-cover" />
                        <div>
                          <p className="font-bold text-white group-hover:text-accent-blue transition-colors">{item.displayName}</p>
                          <p className="text-[10px] text-gray-400 font-mono">@{item.username}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded bg-accent-blue/20 text-accent-blue border border-accent-blue/30 text-[10px] font-bold font-mono">
                        {item.verifiedLevel || 'Beginner'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-white">{item.solvedCount}</td>
                    <td className="px-6 py-4 font-mono text-accent-cyan font-bold">{item.accuracy}%</td>
                    <td className="px-6 py-4 font-mono text-accent-orange font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-accent-orange" /> {item.streak}d
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-extrabold text-accent-purple text-sm">
                      {item.rating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border text-xs font-mono text-gray-400">
            <span>Showing {leaderboard.length} of {total} developers</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl bg-surface-secondary border border-surface-border text-gray-300 disabled:opacity-40 hover:bg-surface-hover"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl bg-surface-secondary border border-surface-border text-gray-300 disabled:opacity-40 hover:bg-surface-hover"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
