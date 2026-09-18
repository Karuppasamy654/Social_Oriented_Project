import React from 'react';
import { Award, Flame, Target, Sparkles, CheckCircle2 } from 'lucide-react';

export default function AchievementsPage() {
  const achievements = [
    { key: 'first_solve', title: 'First Steps', desc: 'Solved your first coding problem on CodeBuddy', xp: 50, unlocked: true },
    { key: 'streak_7', title: 'Consistency King', desc: 'Maintained a 7-day active coding streak', xp: 150, unlocked: true },
    { key: 'assessment_done', title: 'Verified Coder', desc: 'Completed adaptive AI skill assessment', xp: 100, unlocked: true },
    { key: 'algo_master', title: 'Algorithm Specialist', desc: 'Solved 10 Hard difficulty algorithm problems', xp: 300, unlocked: false },
    { key: 'mock_hero', title: 'Interview Ready', desc: 'Scored 80+ on a Company Mock Interview session', xp: 250, unlocked: true }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
          <Award className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Achievements & Badges</h1>
          <p className="text-gray-400 text-sm">Earn badges, unlock XP rewards, and level up your developer profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((item) => (
          <div key={item.key} className={`p-6 rounded-2xl border transition-all ${item.unlocked ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-950/40 border-slate-900 opacity-60'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${item.unlocked ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-slate-800 text-gray-500'}`}>
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">+ {item.xp} XP</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center">
              {item.title} {item.unlocked && <CheckCircle2 className="w-4 h-4 ml-2 text-emerald-400" />}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
