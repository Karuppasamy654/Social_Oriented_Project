import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.username) {
      setLoading(false);
      return;
    }
    let active = true;
    api.get(`/users/profile/${encodeURIComponent(user.username)}`)
      .then(({ data }) => active && setAchievements(data.achievements || []))
      .catch((err) => active && setError(err.response?.data?.message || 'Could not load your achievements.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user?.username]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl"><Award className="w-6 h-6 text-violet-400" /></div>
        <div>
          <h1 className="text-2xl font-bold text-white">Achievements & Badges</h1>
          <p className="text-gray-400 text-sm">Badges earned from your real CodeBuddy activity</p>
        </div>
      </div>
      {loading && <p className="text-gray-400">Loading achievements…</p>}
      {!loading && error && <p className="text-red-400">{error}</p>}
      {!loading && !error && achievements.length === 0 && <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 text-gray-400">No achievements yet. Submit an accepted solution to earn your first badge.</div>}
      {!loading && !error && achievements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((item) => (
            <div key={`${item.title}-${item.unlockedAt}`} className="p-6 rounded-2xl border bg-slate-900/80 border-slate-800">
              <div className="flex items-center justify-between mb-4"><div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"><Sparkles className="w-6 h-6" /></div><CheckCircle2 className="w-5 h-5 text-emerald-400" /></div>
              <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
              <p className="text-xs text-gray-400">Earned {new Date(item.unlockedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
