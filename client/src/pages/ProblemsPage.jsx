import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Search, Filter, Lock, Unlock, CheckCircle2, Clock,
  Sparkles, BookOpen, Layers, Building2, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [stats, setStats] = useState({ total: 500, difficultyDistribution: { Easy: 200, Medium: 250, Hard: 50 } });
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 1, total: 0 });
  
  const [mode, setMode] = useState('explore'); // 'explore' or 'recommend'
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecommendations();
  }, []);

  useEffect(() => {
    fetchProblems();
  }, [selectedDifficulty, selectedTopic, searchTerm, page, pageSize]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/problems/stats/overview');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dataset stats:', err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await api.get('/recommendations');
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
  };

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (selectedDifficulty !== 'All') params.difficulty = selectedDifficulty;
      if (selectedTopic !== 'All') params.topic = selectedTopic;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/problems', { params });
      const problemList = Array.isArray(res.data) ? res.data : (res.data.problems || []);
      const paginationData = res.data.pagination || { page: 1, limit: pageSize, totalPages: Math.ceil(problemList.length / pageSize) || 1, total: problemList.length };
      setProblems(problemList);
      setPagination(paginationData);
    } catch (err) {
      console.error('Error fetching problems:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Dataset Overview Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-accent-blue" />
            <span>LeetCode Problem Arena</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Real LeetCode problem corpus powered by verified open-source dataset.</p>
        </div>

        {/* Dataset Stats Summary Pill */}
        <div className="flex items-center space-x-3 bg-surface border border-surface-border rounded-2xl px-4 py-2 text-xs font-mono">
          <div><span className="text-gray-400">Total:</span> <span className="text-white font-bold">{stats.total || pagination.total}</span></div>
          <div className="h-4 w-px bg-surface-border"></div>
          <div><span className="text-green-400 font-bold">{stats.difficultyDistribution?.Easy || 0}</span> <span className="text-gray-500">Easy</span></div>
          <div><span className="text-yellow-400 font-bold">{stats.difficultyDistribution?.Medium || 0}</span> <span className="text-gray-500">Med</span></div>
          <div><span className="text-red-400 font-bold">{stats.difficultyDistribution?.Hard || 0}</span> <span className="text-gray-500">Hard</span></div>
        </div>

        {/* Mode Toggle Switcher */}
        <div className="flex bg-surface-secondary border border-surface-border rounded-2xl p-1.5 self-start">
          <button
            onClick={() => setMode('explore')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'explore' 
                ? 'bg-accent-blue text-white shadow-glow-blue' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Problem Library</span>
          </button>

          <button
            onClick={() => setMode('recommend')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'recommend' 
                ? 'bg-gradient-to-r from-accent-purple to-accent-cyan text-white shadow-glow-purple' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Recommended for You</span>
          </button>
        </div>
      </div>

      {/* RECOMMENDED FOR YOU SECTION */}
      {mode === 'recommend' && (
        <div className="space-y-6">
          <div className="bg-surface-secondary border border-accent-purple/30 rounded-2xl p-4 text-xs text-gray-300 flex items-center justify-between">
            <span className="flex items-center gap-2 font-bold text-accent-cyan">
              <Sparkles className="w-4 h-4" /> Content-Based Recommendation Engine Active
            </span>
            <span>Matched against your verified skill level, weak topics, and mistake memory</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((item, idx) => (
              <ProblemCard 
                key={item.problem._id || idx} 
                problem={item.problem} 
                recommendationReason={item.primaryReason}
                recommendationScore={item.recommendationScore}
              />
            ))}
          </div>
        </div>
      )}

      {/* PROBLEM LIBRARY EXPLORE */}
      {mode === 'explore' && (
        <div className="space-y-6">
          
          {/* Filters & Search Bar */}
          <div className="bg-surface border border-surface-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search problem title or description..."
                className="w-full bg-surface-secondary border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-accent-blue"
              />
            </div>

            {/* Difficulty Filter */}
            <div>
              <select
                value={selectedDifficulty}
                onChange={(e) => { setSelectedDifficulty(e.target.value); setPage(1); }}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-2.5 text-white text-xs"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Controlled Topic Filter */}
            <div>
              <select
                value={selectedTopic}
                onChange={(e) => { setSelectedTopic(e.target.value); setPage(1); }}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-2.5 text-white text-xs"
              >
                <option value="All">All Topics</option>
                {['Array', 'String', 'Hash Table', 'Two Pointers', 'Binary Search', 'Sliding Window', 'Linked List', 'Stack', 'Queue', 'Tree', 'Graph', 'Dynamic Programming', 'Math', 'Sorting', 'Recursion'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Page Size Selector */}
            <div>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-2.5 text-white text-xs font-semibold"
              >
                <option value={12}>Show 12 / Page</option>
                <option value={24}>Show 24 / Page</option>
                <option value={50}>Show 50 / Page</option>
                <option value={100}>Show 100 / Page</option>
                <option value={500}>Show All 500 Problems</option>
              </select>
            </div>

          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-xs font-mono">
              Loading LeetCode problem dataset...
            </div>
          ) : problems.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs font-mono">
              No matching problems found. Try adjusting filters or search query.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {problems.map((problem) => (
                <ProblemCard key={problem._id} problem={problem} />
              ))}
            </div>
          )}

          {/* Server-Side Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-surface-border pt-6 text-xs text-gray-400 font-mono">
              <div>
                Showing page <span className="text-white font-bold">{pagination.page}</span> of <span className="text-white font-bold">{pagination.totalPages}</span> ({pagination.total} problems)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-surface-secondary border border-surface-border disabled:opacity-40 hover:border-accent-blue text-white flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={!pagination.hasMore}
                  onClick={() => setPage(prev => prev + 1)}
                  className="px-4 py-2 rounded-xl bg-surface-secondary border border-surface-border disabled:opacity-40 hover:border-accent-blue text-white flex items-center gap-1 transition-all"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

function ProblemCard({ problem, recommendationReason, recommendationScore }) {
  const isEasy = problem.difficulty === 'Easy';
  const isMedium = problem.difficulty === 'Medium';
  const status = problem.status || 'Not Attempted';

  return (
    <Link
      to={`/problems/${problem.slug}`}
      className="group p-6 rounded-2xl bg-surface border border-surface-border hover:border-accent-blue/50 transition-all hover:-translate-y-1 shadow-xl flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
              isEasy ? 'bg-green-500/10 text-green-400 border-green-500/30' : isMedium ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {problem.difficulty}
            </span>
            {status === 'Solved' && (
              <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Solved</span>
              </span>
            )}
            {status === 'Attempted' && (
              <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                <Clock className="w-3 h-3" />
                <span>Attempted</span>
              </span>
            )}
          </div>
          {recommendationScore && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
              Score: {recommendationScore}
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-white group-hover:text-accent-blue transition-colors mb-2">
          {problem.title}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {(problem.topics || []).map((t, idx) => (
            <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary border border-surface-border text-gray-300">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Footer / Reason */}
      <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-xs">
        <span className="text-[11px] text-gray-400 truncate max-w-[80%]">
          {recommendationReason || (problem.externalId ? `LeetCode #${problem.externalId}` : 'Practice Problem')}
        </span>
        <span className="text-accent-blue font-semibold group-hover:translate-x-1 transition-transform">Solve →</span>
      </div>
    </Link>
  );
}
