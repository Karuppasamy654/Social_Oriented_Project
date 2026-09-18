import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { 
  Code2, Flame, Award, Bot, User, LogOut, ChevronDown, 
  BookOpen, Users, Swords, Video, Trophy, LayoutDashboard,
  Search, FileCode
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggleAIModal } = useAI();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 bg-[#0B1020]/90 backdrop-blur-md border-b border-surface-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 flex-shrink-0 mr-4">
            <Link to={location.pathname === '/onboarding' ? '/onboarding' : (user ? '/dashboard' : '/')} className="flex items-center space-x-2 group">
              <img 
                src="/logo.png" 
                alt="CodeBuddy Logo" 
                className="w-10 h-10 object-contain rounded-full hover:scale-105 transition-transform drop-shadow-md" 
              />

              <div className="flex flex-col">
                <span className="text-lg font-extrabold bg-gradient-to-r from-white via-gray-200 to-accent-blue bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                  CodeBuddy
                </span>
                <span className="text-[9px] text-accent-cyan font-mono font-medium tracking-wider uppercase -mt-1 whitespace-nowrap">
                  Don't Code Alone
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links - Hidden on onboarding routes */}
          {user && !location.pathname.startsWith('/onboarding') && (
            <div className="hidden md:flex items-center gap-1 xl:gap-2 text-xs lg:text-sm font-medium overflow-x-auto no-scrollbar flex-1 min-w-0">
              <Link 
                to="/dashboard" 
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-surface-secondary text-accent-blue font-semibold border border-accent-blue/30' : 'text-gray-300 hover:text-white hover:bg-surface-hover'}`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link 
                to="/problems" 
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${isActive('/problems') ? 'bg-surface-secondary text-accent-blue font-semibold border border-accent-blue/30' : 'text-gray-300 hover:text-white hover:bg-surface-hover'}`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Problems</span>
              </Link>
              <Link 
                to="/compete" 
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${isActive('/compete') ? 'bg-surface-secondary text-accent-orange font-semibold border border-accent-orange/30' : 'text-gray-300 hover:text-white hover:bg-surface-hover'}`}
              >
                <Swords className="w-4 h-4 text-accent-orange" />
                <span>Compete</span>
              </Link>
              <Link 
                to="/study" 
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${location.pathname.startsWith('/study') ? 'bg-surface-secondary text-accent-purple font-semibold border border-accent-purple/30' : 'text-gray-300 hover:text-white hover:bg-surface-hover'}`}
              >
                <Users className="w-4 h-4 text-accent-purple" />
                <span>Study Rooms</span>
              </Link>
              <Link 
                to="/interview" 
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${isActive('/interview') ? 'bg-surface-secondary text-accent-pink font-semibold border border-accent-pink/30' : 'text-gray-300 hover:text-white hover:bg-surface-hover'}`}
              >
                <Video className="w-4 h-4 text-accent-pink" />
                <span>Interview</span>
              </Link>
              <Link 
                to="/leaderboard" 
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${isActive('/leaderboard') ? 'bg-surface-secondary text-accent-cyan font-semibold border border-accent-cyan/30' : 'text-gray-300 hover:text-white hover:bg-surface-hover'}`}
              >
                <Trophy className="w-4 h-4 text-accent-cyan" />
                <span>Leaderboard</span>
              </Link>
              <Link 
                to="/submissions" 
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${isActive('/submissions') ? 'bg-surface-secondary text-accent-lime font-semibold border border-accent-lime/30' : 'text-gray-300 hover:text-white hover:bg-surface-hover'}`}
              >
                <FileCode className="w-4 h-4 text-accent-lime" />
                <span>Submissions</span>
              </Link>
              <Link 
                to="/search" 
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-colors ${isActive('/search') ? 'bg-surface-secondary text-accent-purple font-semibold border border-accent-purple/30' : 'text-gray-300 hover:text-white hover:bg-surface-hover'}`}
              >
                <Search className="w-4 h-4 text-accent-purple" />
                <span>Search</span>
              </Link>
            </div>
          )}

          {/* Right Header Actions */}
          <div className="flex items-center space-x-3">
            {user && !location.pathname.startsWith('/onboarding') ? (
              <>
                {/* Streak Counter */}
                <div className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-accent-orange/10 border border-accent-orange/30 text-accent-orange font-bold text-xs">
                  <Flame className="w-4 h-4 fill-accent-orange animate-bounce" />
                  <span>{user.codingStats?.currentStreak || 0} Day Streak</span>
                </div>

                {/* Ask CodeBuddy AI Button */}
                <button
                  onClick={toggleAIModal}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-medium text-xs shadow-glow-purple hover:opacity-95 transition-all transform active:scale-95"
                >
                  <Bot className="w-4 h-4 animate-pulse" />
                  <span className="hidden sm:inline">Ask AI Buddy</span>
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 focus:outline-none p-1 rounded-xl hover:bg-surface-hover transition-colors"
                  >
                    <img 
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'} 
                      alt={user.username}
                      className="w-9 h-9 rounded-full object-cover border-2 border-accent-blue/50" 
                    />
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-surface border border-surface-border rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-surface-border">
                        <p className="text-sm font-semibold text-white truncate">{user.displayName || user.name}</p>
                        <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                        <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                          Verified: {user.verifiedLevel || 'Beginner'}
                        </span>
                      </div>
                      <Link 
                        to={`/profile/${user.username}`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:bg-surface-hover hover:text-white"
                      >
                        <User className="w-4 h-4" />
                        <span>My Profile & Stats</span>
                      </Link>
                      <Link 
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:bg-surface-hover hover:text-white"
                      >
                        <Award className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                      <button 
                        onClick={() => { setDropdownOpen(false); logout(); navigate('/'); }}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : !user ? (
              <div className="flex items-center space-x-3">
                <Link 
                  to="/auth" 
                  className="px-5 py-2 text-xs font-extrabold rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30 hover:scale-105 transition-all"
                >
                  Sign In
                </Link>
                <Link 
                  to="/auth?signup=true" 
                  className="px-5 py-2 text-xs font-extrabold rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 hover:scale-105 transition-all"
                >
                  Create Account
                </Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
                <span>Adaptive ML Assessment In Progress</span>
              </div>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}
