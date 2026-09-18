import React from 'react';
import { Trophy, TrendingUp, Zap } from 'lucide-react';

export default function ContestHistoryPage() {
  const contests = [
    {
      id: 'c-1',
      title: 'Weekly Arena #42',
      rank: 4,
      totalParticipants: 128,
      ratingBefore: 1200,
      ratingAfter: 1245,
      score: 300,
      date: '2026-09-10'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <Trophy className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Contest History</h1>
          <p className="text-gray-400 text-sm">Competitive arena performance, rank placements, and Elo rating progression</p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <th className="py-4 px-6">Contest</th>
              <th className="py-4 px-6">Rank</th>
              <th className="py-4 px-6">Score</th>
              <th className="py-4 px-6">Elo Rating Delta</th>
              <th className="py-4 px-6">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {contests.map((c) => (
              <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-4 px-6 font-bold text-white">{c.title}</td>
                <td className="py-4 px-6 font-mono text-cyan-400">#{c.rank} / {c.totalParticipants}</td>
                <td className="py-4 px-6 text-gray-300 font-semibold">{c.score} pts</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center text-emerald-400 font-bold font-mono">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" /> +{c.ratingAfter - c.ratingBefore} ({c.ratingAfter})
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-500 text-xs">{c.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
