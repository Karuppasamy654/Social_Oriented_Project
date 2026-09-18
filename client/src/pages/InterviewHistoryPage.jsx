import React from 'react';
import { Award, Briefcase, CheckCircle2, AlertCircle } from 'lucide-react';

export default function InterviewHistoryPage() {
  const sessions = [
    {
      id: 'int-1',
      company: 'Google',
      role: 'Software Engineer',
      score: 86,
      recommendation: 'Strong Hire',
      date: '2026-09-12',
      metrics: { problemSolving: 9, coding: 9, communication: 8, complexity: 8 }
    },
    {
      id: 'int-2',
      company: 'Amazon',
      role: 'SDE II',
      score: 78,
      recommendation: 'Hire',
      date: '2026-09-08',
      metrics: { problemSolving: 8, coding: 8, communication: 7, complexity: 8 }
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
          <Briefcase className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Interview History</h1>
          <p className="text-gray-400 text-sm">Review your past company mock interview scorecards and hiring recommendations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sessions.map((sess) => (
          <div key={sess.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center">
                  {sess.company} <span className="ml-2 text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{sess.role}</span>
                </h3>
                <span className="text-xs text-gray-500">{sess.date}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-cyan-400">{sess.score}<span className="text-sm font-normal text-gray-400">/100</span></div>
                <span className="text-xs font-semibold text-emerald-400">{sess.recommendation}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800 text-xs">
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                <span className="text-gray-400 block">Problem Solving</span>
                <span className="text-white font-bold">{sess.metrics.problemSolving}/10</span>
              </div>
              <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                <span className="text-gray-400 block">Coding Quality</span>
                <span className="text-white font-bold">{sess.metrics.coding}/10</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
