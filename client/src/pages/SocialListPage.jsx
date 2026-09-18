import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { Users, UserPlus, UserCheck, Building2, ChevronLeft, ArrowLeft } from 'lucide-react';

export default function SocialListPage({ mode: propMode }) {
  const { username } = useParams();
  const location = useLocation();

  const mode = propMode || (location.pathname.includes('/followers') ? 'followers' : 'following');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!username) return;
    fetchList();
  }, [username, mode]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${username}/${mode}`);
      if (mode === 'followers') {
        setUsers(res.data.followers || []);
      } else {
        setUsers(res.data.following || []);
      }
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(`Failed to fetch ${mode}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetUser) => {
    try {
      if (targetUser.isFollowing) {
        await api.delete(`/users/${targetUser.username}/follow`);
        setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, isFollowing: false } : u));
      } else {
        await api.post(`/users/${targetUser.username}/follow`);
        setUsers(prev => prev.map(u => u._id === targetUser._id ? { ...u, isFollowing: true } : u));
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center space-x-4">
          <Link
            to={`/profile/${username}`}
            className="p-2.5 rounded-xl bg-surface-secondary border border-surface-border text-gray-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white capitalize flex items-center gap-2">
              <Users className="w-6 h-6 text-accent-blue" />
              <span>@{username}'s {mode} ({total})</span>
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              {mode === 'followers' ? 'Real users following this profile.' : 'Real users followed by this profile.'}
            </p>
          </div>
        </div>
      </div>

      {/* User Grid */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-400 font-mono">Loading {mode}...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center text-gray-400 font-mono space-y-3 bg-surface border border-surface-border rounded-3xl">
          <Users className="w-10 h-10 text-gray-500 mx-auto" />
          <p className="text-base font-semibold text-white">No {mode} yet.</p>
          <p className="text-xs">This profile currently has no {mode}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {users.map((u) => (
            <div
              key={u._id}
              className="p-5 rounded-3xl bg-surface border border-surface-border hover:border-accent-blue/40 transition-all space-y-4 flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
                      alt={u.displayName}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-accent-blue/40"
                    />
                    <div className="min-w-0">
                      <Link to={`/profile/${u.username}`} className="font-bold text-white hover:text-accent-blue transition-colors text-base truncate block">
                        {u.displayName}
                      </Link>
                      <p className="text-xs text-gray-400 font-mono truncate">@{u.username}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/30 text-[10px] font-bold font-mono">
                    {u.verifiedLevel}
                  </span>
                </div>

                {u.bio && <p className="text-xs text-gray-300 line-clamp-2">{u.bio}</p>}

                {u.college && (
                  <p className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-accent-purple" />
                    <span className="truncate">{u.college}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">{u.solvedCount} Solved</span>
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/profile/${u.username}`}
                    className="px-3 py-1.5 rounded-xl bg-surface-secondary text-gray-300 hover:text-white font-medium hover:bg-surface-hover transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => handleFollowToggle(u)}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1 ${
                      u.isFollowing
                        ? 'bg-surface-secondary text-accent-blue border border-accent-blue/30'
                        : 'bg-accent-blue text-white hover:opacity-90'
                    }`}
                  >
                    {u.isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>{u.isFollowing ? 'Following' : 'Follow'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
