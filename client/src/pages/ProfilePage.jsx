import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  User, Flame, CheckCircle2, Zap, BarChart2, Target, Trophy,
  Building2, BookOpen, MapPin, Globe, Github, Linkedin, Calendar,
  UserPlus, UserCheck, MessageSquare, Edit3, ArrowRight, ShieldCheck,
  Clock, Code, Award, Activity as ActivityIcon, ChevronRight
} from 'lucide-react';

export default function ProfilePage() {
  const { username: paramUsername } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const targetUsername = paramUsername || currentUser?.username;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [followLoading, setFollowLoading] = useState(false);
  const [solvedSearch, setSolvedSearch] = useState('');
  const [solvedDiffFilter, setSolvedDiffFilter] = useState('all');

  useEffect(() => {
    if (!targetUsername) return;
    fetchProfile();
  }, [targetUsername]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/users/profile/${targetUsername}`);
      setProfileData(res.data);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.message || 'User profile not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profileData || followLoading) return;
    try {
      setFollowLoading(true);
      const isFollowing = profileData.profile.isFollowing;
      if (isFollowing) {
        const res = await api.delete(`/users/${targetUsername}/follow`);
        setProfileData(prev => ({
          ...prev,
          profile: { ...prev.profile, isFollowing: false },
          stats: { ...prev.stats, followersCount: res.data.followersCount }
        }));
      } else {
        const res = await api.post(`/users/${targetUsername}/follow`);
        setProfileData(prev => ({
          ...prev,
          profile: { ...prev.profile, isFollowing: true },
          stats: { ...prev.stats, followersCount: res.data.followersCount }
        }));
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin"></div>
        <p className="text-gray-400 font-mono text-sm">Loading Developer Profile...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-surface-secondary border border-surface-border rounded-full flex items-center justify-center mx-auto text-gray-500">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Profile Not Found</h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">{error || "The requested user profile does not exist or has been made private."}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 bg-accent-blue text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { profile, stats, topicStats, activityCalendar, recentSubmissions, solvedProblems, interviews, activities, achievements } = profileData;

  // Filter Solved Problems
  const filteredSolvedProblems = (solvedProblems || []).filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(solvedSearch.toLowerCase());
    const matchesDiff = solvedDiffFilter === 'all' || (p.difficulty || '').toLowerCase() === solvedDiffFilter.toLowerCase();
    return matchesSearch && matchesDiff;
  });

  // Calculate Calendar Grid (Last 12 weeks / 84 days)
  const calendarDays = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = (activityCalendar && activityCalendar[dateStr]) || 0;
    calendarDays.push({ date: dateStr, count, dayOfWeek: d.getDay() });
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Profile Header Card */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Avatar & Core Bio */}
          <div className="flex items-start sm:items-center space-x-5">
            <img
              src={profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'}
              alt={profile.displayName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-4 border-accent-blue/40 shadow-glow-blue flex-shrink-0"
            />
            <div className="space-y-1.5">
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{profile.displayName}</h1>
                <span className="px-3 py-0.5 rounded-full bg-accent-blue/20 text-accent-blue border border-accent-blue/30 text-xs font-bold font-mono">
                  {profile.verifiedLevel || 'Beginner'}
                </span>
              </div>
              <p className="text-xs font-mono text-gray-400">@{profile.username} • Joined {new Date(profile.createdAt).getFullYear()}</p>
              {profile.bio && <p className="text-sm text-gray-300 max-w-xl">{profile.bio}</p>}
              
              {/* Location / Org / Social Links */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-1 font-mono">
                {profile.college && (
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-accent-purple" />{profile.college}</span>
                )}
                {profile.organization && !profile.college && (
                  <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-accent-purple" />{profile.organization}</span>
                )}
                {profile.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-accent-pink" />{profile.location}</span>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-accent-cyan hover:underline">
                    <Globe className="w-3.5 h-3.5" />Website
                  </a>
                )}
                {profile.githubUrl && (
                  <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-gray-300 hover:text-white">
                    <Github className="w-3.5 h-3.5" />GitHub
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-accent-blue hover:underline">
                    <Linkedin className="w-3.5 h-3.5" />LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Profile Actions: Follow / Edit Profile */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {profile.isSelf ? (
              <Link
                to="/settings"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-surface-secondary border border-surface-border text-white text-xs font-semibold hover:bg-surface-hover transition-all"
              >
                <Edit3 className="w-4 h-4 text-accent-blue" />
                <span>Edit Profile</span>
              </Link>
            ) : (
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                  profile.isFollowing
                    ? 'bg-surface-secondary border border-accent-blue/40 text-accent-blue hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40'
                    : 'bg-gradient-to-r from-accent-blue to-accent-purple text-white shadow-glow-blue hover:opacity-90'
                }`}
              >
                {profile.isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs pt-4 border-t border-surface-border">
          <div className="p-3.5 rounded-2xl bg-surface-secondary/70 border border-surface-border text-center">
            <p className="text-gray-400 text-[11px] mb-1">Solved</p>
            <p className="text-xl font-bold text-accent-lime">{stats.totalSolved}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-secondary/70 border border-surface-border text-center">
            <p className="text-gray-400 text-[11px] mb-1">Streak</p>
            <p className="text-xl font-bold text-accent-orange flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 fill-accent-orange" /> {stats.currentStreak}d
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-secondary/70 border border-surface-border text-center">
            <p className="text-gray-400 text-[11px] mb-1">Accuracy</p>
            <p className="text-xl font-bold text-accent-cyan">{stats.accuracy}%</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-secondary/70 border border-surface-border text-center">
            <p className="text-gray-400 text-[11px] mb-1">Rating</p>
            <p className="text-xl font-bold text-accent-purple">{profile.rating}</p>
          </div>

          <Link to={`/profile/${profile.username}/followers`} className="p-3.5 rounded-2xl bg-surface-secondary/70 border border-surface-border text-center hover:border-accent-blue/40 transition-colors group">
            <p className="text-gray-400 text-[11px] mb-1 group-hover:text-accent-blue">Followers</p>
            <p className="text-xl font-bold text-white">{stats.followersCount}</p>
          </Link>

          <Link to={`/profile/${profile.username}/following`} className="p-3.5 rounded-2xl bg-surface-secondary/70 border border-surface-border text-center hover:border-accent-purple/40 transition-colors group">
            <p className="text-gray-400 text-[11px] mb-1 group-hover:text-accent-purple">Following</p>
            <p className="text-xl font-bold text-white">{stats.followingCount}</p>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-surface-border pb-3 overflow-x-auto no-scrollbar font-medium text-sm">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart2 },
          { id: 'solved', label: `Solved (${stats.totalSolved})`, icon: CheckCircle2 },
          { id: 'submissions', label: `Submissions (${stats.totalSubmissions})`, icon: Code },
          { id: 'badges', label: `Badges (${achievements.length})`, icon: Trophy },
          { id: 'interviews', label: `Interviews (${stats.interviewsCompleted})`, icon: ShieldCheck },
          { id: 'activity', label: 'Activity Feed', icon: ActivityIcon }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-surface-hover'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (7 cols): Activity Calendar & Difficulty Breakdown */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Real Activity Calendar (GitHub/LeetCode style grid) */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent-blue" />
                  <span>Coding Activity Calendar</span>
                </h3>
                <span className="text-xs font-mono text-gray-400">Past 12 Weeks</span>
              </div>

              {/* Grid of days */}
              <div className="pt-2">
                <div className="grid grid-rows-7 grid-flow-col gap-1.5 overflow-x-auto pb-2 no-scrollbar">
                  {calendarDays.map((d, idx) => {
                    let bg = 'bg-surface-secondary border border-surface-border';
                    if (d.count >= 5) bg = 'bg-accent-lime text-slate-950';
                    else if (d.count >= 3) bg = 'bg-accent-lime/80';
                    else if (d.count >= 1) bg = 'bg-accent-lime/40';

                    return (
                      <div
                        key={idx}
                        title={`${d.date}: ${d.count} submission(s)`}
                        className={`w-3.5 h-3.5 rounded-sm transition-all hover:scale-125 ${bg}`}
                      ></div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 text-[10px] font-mono text-gray-400 pt-2">
                  <span>Less</span>
                  <div className="w-2.5 h-2.5 bg-surface-secondary border border-surface-border rounded-sm"></div>
                  <div className="w-2.5 h-2.5 bg-accent-lime/40 rounded-sm"></div>
                  <div className="w-2.5 h-2.5 bg-accent-lime/80 rounded-sm"></div>
                  <div className="w-2.5 h-2.5 bg-accent-lime rounded-sm"></div>
                  <span>More</span>
                </div>
              </div>
            </div>

            {/* Problem Solving Difficulty Breakdown */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-accent-cyan" />
                <span>Difficulty Breakdown</span>
              </h3>

              <div className="grid grid-cols-3 gap-4 text-center font-mono">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <span className="text-xs font-bold text-emerald-400 uppercase">Easy</span>
                  <p className="text-2xl font-extrabold text-white">{stats.easySolved}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <span className="text-xs font-bold text-amber-400 uppercase">Medium</span>
                  <p className="text-2xl font-extrabold text-white">{stats.mediumSolved}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                  <span className="text-xs font-bold text-rose-400 uppercase">Hard</span>
                  <p className="text-2xl font-extrabold text-white">{stats.hardSolved}</p>
                </div>
              </div>
            </div>

            {/* Topic Proficiency Statistics */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent-purple" />
                <span>Topic Mastery</span>
              </h3>

              {topicStats.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm font-mono">
                  No topic statistics available yet. Solve problems to build your topic mastery profile.
                </div>
              ) : (
                <div className="space-y-3">
                  {topicStats.slice(0, 6).map((topic, idx) => (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between text-gray-300 font-mono">
                        <span>{topic.topic}</span>
                        <span className="font-bold text-accent-purple">{topic.solvedCount} solved ({topic.percentage}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, topic.percentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column (5 cols): Badges, Skills & Recent Activity */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Skills & Platform Tags */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent-orange" />
                <span>Skills & Technologies</span>
              </h3>

              {(profile.skills && profile.skills.length > 0) ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-surface-border text-white text-xs font-mono font-medium">
                      ⚡ {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-xs font-mono">No skills listed on profile.</p>
              )}
            </div>

            {/* Badges / Achievements Summary */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-accent-lime" />
                  <span>Unlocked Badges</span>
                </h3>
                <button onClick={() => setActiveTab('badges')} className="text-xs text-accent-blue font-mono hover:underline">
                  View All ({achievements.length})
                </button>
              </div>

              {achievements.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs font-mono">
                  No badges unlocked yet. Complete submissions, streaks and interviews to earn badges!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {achievements.slice(0, 4).map((badge, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-surface-secondary border border-surface-border flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-accent-lime/10 border border-accent-lime/30 text-accent-lime flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{badge.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{new Date(badge.unlockedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Submissions Snippet */}
            <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-accent-blue" />
                  <span>Recent Submissions</span>
                </h3>
                <button onClick={() => setActiveTab('submissions')} className="text-xs text-accent-blue font-mono hover:underline">
                  View All
                </button>
              </div>

              {recentSubmissions.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs font-mono">
                  No submissions yet. Start solving problems to build your coding history!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentSubmissions.slice(0, 5).map((sub, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-surface-secondary/70 border border-surface-border flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{sub.problemTitle}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{sub.language} • {new Date(sub.submittedAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                        (sub.status === 'Accepted' || sub.status === 'accepted')
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT: SOLVED PROBLEMS */}
      {activeTab === 'solved' && (
        <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-white">Distinct Solved Problems ({solvedProblems.length})</h3>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Filter by problem title..."
                value={solvedSearch}
                onChange={(e) => setSolvedSearch(e.target.value)}
                className="px-4 py-2 rounded-xl bg-surface-secondary border border-surface-border text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-blue"
              />
              <select
                value={solvedDiffFilter}
                onChange={(e) => setSolvedDiffFilter(e.target.value)}
                className="px-4 py-2 rounded-xl bg-surface-secondary border border-surface-border text-xs text-white focus:outline-none focus:border-accent-blue"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {filteredSolvedProblems.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-mono space-y-3">
              <p className="text-base font-semibold text-white">No solved problems found.</p>
              <p className="text-xs">
                {solvedProblems.length === 0 ? "You have not solved any problems yet. Explore the problems catalog to get started." : "No problems match your current filter."}
              </p>
              {profile.isSelf && (
                <Link to="/problems" className="inline-block mt-2 px-5 py-2 bg-accent-blue text-white rounded-xl text-xs font-bold hover:opacity-90">
                  Explore Problems
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSolvedProblems.map((prob) => (
                <Link
                  key={prob._id}
                  to={`/problems/${prob.slug || prob._id}`}
                  className="p-5 rounded-2xl bg-surface-secondary border border-surface-border hover:border-accent-blue/50 transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                      (prob.difficulty || '').toLowerCase() === 'easy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      (prob.difficulty || '').toLowerCase() === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {prob.difficulty || 'Easy'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-accent-blue group-hover:translate-x-1 transition-all" />
                  </div>
                  <h4 className="font-bold text-white text-base group-hover:text-accent-blue transition-colors">{prob.title}</h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(prob.topics || []).slice(0, 3).map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-surface-hover text-[10px] text-gray-400 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-white">Submission History ({recentSubmissions.length})</h3>

          {recentSubmissions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-mono space-y-3">
              <p className="text-base font-semibold text-white">No submissions recorded yet.</p>
              <p className="text-xs">Start submitting code solutions to track your execution history.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-surface-secondary text-gray-400 uppercase text-[10px] border-b border-surface-border">
                  <tr>
                    <th className="px-4 py-3">Problem</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Language</th>
                    <th className="px-4 py-3">Runtime</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border text-gray-300">
                  {recentSubmissions.map((sub) => (
                    <tr key={sub._id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{sub.problemTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          (sub.status === 'Accepted' || sub.status === 'accepted')
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{sub.language}</td>
                      <td className="px-4 py-3 text-gray-400">{sub.runtimeMs} ms</td>
                      <td className="px-4 py-3 text-gray-400">{new Date(sub.submittedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/submissions/${sub.submissionId || sub._id}`}
                          className="text-accent-blue hover:underline font-bold"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: BADGES / ACHIEVEMENTS */}
      {activeTab === 'badges' && (
        <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-white">Achievements & Badges</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Unlocked Badges */}
            {achievements.map((badge, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-surface-secondary border border-accent-lime/40 space-y-2 relative overflow-hidden">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-accent-lime/20 text-accent-lime flex items-center justify-center font-bold">
                    🏆
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{badge.title}</h4>
                    <p className="text-[10px] text-accent-lime font-mono">Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Locked Badges */}
            {[
              { title: '10 Problems Solved', requirement: 'Solve 10 distinct problems', current: Math.min(stats.totalSolved, 10), max: 10 },
              { title: '50 Problems Solved', requirement: 'Solve 50 distinct problems', current: Math.min(stats.totalSolved, 50), max: 50 },
              { title: '7-Day Streak', requirement: 'Maintain a 7-day coding streak', current: Math.min(stats.currentStreak, 7), max: 7 },
              { title: 'First Interview Completed', requirement: 'Complete a mock interview', current: Math.min(stats.interviewsCompleted, 1), max: 1 }
            ].filter(b => !achievements.some(a => a.title === b.title)).map((locked, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-surface-secondary/40 border border-surface-border opacity-70 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-surface-border text-gray-500 flex items-center justify-center font-bold">
                    🔒
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-300 text-sm">{locked.title}</h4>
                    <p className="text-[10px] text-gray-500 font-mono">{locked.requirement}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-gray-400">
                    <span>Progress</span>
                    <span>{locked.current} / {locked.max}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-border overflow-hidden">
                    <div
                      className="h-full bg-accent-blue rounded-full"
                      style={{ width: `${(locked.current / locked.max) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: INTERVIEWS */}
      {activeTab === 'interviews' && (
        <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-white">Interview Performance</h3>

          {interviews.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-mono space-y-3">
              <p className="text-base font-semibold text-white">No interview sessions completed yet.</p>
              <p className="text-xs">Take an AI mock interview to practice company-wise questions.</p>
              {profile.isSelf && (
                <Link to="/interview" className="inline-block mt-2 px-5 py-2 bg-accent-pink text-white rounded-xl text-xs font-bold hover:opacity-90">
                  Start Mock Interview
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {interviews.map((iv, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-surface-secondary border border-surface-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-xl bg-accent-pink/20 text-accent-pink border border-accent-pink/30 text-xs font-bold">
                      🏢 {iv.company || 'Technical Interview'}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{new Date(iv.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{iv.role || 'Software Engineer'}</h4>
                    <p className="text-xs text-gray-400 font-mono">Target Level: {iv.targetLevel || 'Intermediate'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ACTIVITY FEED */}
      {activeTab === 'activity' && (
        <div className="bg-surface border border-surface-border rounded-3xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-white">Recent Activity Timeline</h3>

          {activities.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-mono space-y-3">
              <p className="text-base font-semibold text-white">No recent activity recorded.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((act, idx) => (
                <div key={idx} className="flex items-start space-x-4 p-4 rounded-2xl bg-surface-secondary/60 border border-surface-border text-xs">
                  <div className="w-8 h-8 rounded-xl bg-accent-blue/20 text-accent-blue flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                    <ActivityIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="font-bold text-white">{act.title}</p>
                    {act.description && <p className="text-gray-400">{act.description}</p>}
                    <p className="text-[10px] text-gray-500 font-mono">{new Date(act.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
