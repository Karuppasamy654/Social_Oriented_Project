import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, User, Building2, UserPlus, UserCheck, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

export default function UserSearchPage() {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchUsers();
  }, [debouncedQuery, page]);

  const fetchUsers = async () => {
    if (!debouncedQuery.trim()) {
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/users/search?q=${encodeURIComponent(debouncedQuery.trim())}&page=${page}&limit=12`);
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('User search error:', err);
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
      console.error('Follow toggle error in search:', err);
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header & Search Bar */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Search className="w-8 h-8 text-accent-blue" />
            <span>Search Developers</span>
          </h1>
          <p className="text-sm text-gray-400 font-mono">
            Find and connect with developers across CodeBuddy by username, name, college, or skills.
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by username, name, college, skills (e.g. Karuppasamy, CEG, C++)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-surface-secondary border border-surface-border rounded-2xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue font-mono shadow-inner transition-colors"
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between text-xs font-mono text-gray-400">
          <span>{total} user(s) found</span>
          {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-400 font-mono">Searching CodeBuddy users...</p>
          </div>
        ) : !debouncedQuery.trim() ? (
          <div className="py-16 text-center text-gray-400 font-mono space-y-3 bg-surface/50 border border-surface-border rounded-3xl">
            <User className="w-10 h-10 text-gray-500 mx-auto" />
            <p className="text-sm font-semibold text-white">Start typing to search users</p>
            <p className="text-xs">Type a username or college name above.</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-400 font-mono space-y-3 bg-surface/50 border border-surface-border rounded-3xl">
            <p className="text-base font-semibold text-white">No users found</p>
            <p className="text-xs text-gray-400">No developer profiles match "{debouncedQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {users.map((u) => (
              <div
                key={u._id}
                className="p-5 rounded-3xl bg-surface border border-surface-border hover:border-accent-blue/40 transition-all space-y-4 flex flex-col justify-between shadow-lg group"
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

                  {u.skills && u.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {u.skills.slice(0, 3).map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-surface-secondary text-[10px] text-gray-300 font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-mono">{u.solvedCount} Solved</span>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/profile/${u.username}`}
                      className="px-3 py-1.5 rounded-xl bg-surface-secondary text-gray-300 hover:text-white font-medium hover:bg-surface-hover transition-colors"
                    >
                      View Profile
                    </Link>
                    {!u.isSelf && (
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
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-3 pt-6 font-mono text-xs">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl bg-surface border border-surface-border text-gray-300 disabled:opacity-40 hover:bg-surface-hover"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-gray-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl bg-surface border border-surface-border text-gray-300 disabled:opacity-40 hover:bg-surface-hover"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
