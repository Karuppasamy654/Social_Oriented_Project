import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Building2, BookOpen, Layers, Sparkles, Filter, 
  Search, ArrowRight, Award, ShieldCheck, BarChart3, TrendingUp
} from 'lucide-react';

export default function CompanyDashboardPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('Amazon');
  const [stats, setStats] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyStats(selectedCompany);
      fetchCompanyProblems(selectedCompany);
    }
  }, [selectedCompany, selectedDifficulty, selectedTopic, searchTerm]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/interviews/companies');
      setCompanies(res.data.companies || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const fetchCompanyStats = async (comp) => {
    setLoadingStats(true);
    try {
      const res = await api.get(`/interviews/company/${encodeURIComponent(comp)}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching company stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCompanyProblems = async (comp) => {
    try {
      const params = {};
      if (selectedDifficulty !== 'All') params.difficulty = selectedDifficulty;
      if (selectedTopic !== 'All') params.topic = selectedTopic;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get(`/interviews/company/${encodeURIComponent(comp)}/problems`, { params });
      setProblems(res.data.problems || []);
    } catch (err) {
      console.error('Error fetching company problems:', err);
    }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-8 h-8 text-accent-cyan" />
            <span>Company Interview Intelligence Dashboard</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">Real historical interview signals across 15 tech & finance leaders. Powered by verified open-source datasets.</p>
        </div>

        <button
          onClick={() => navigate('/interview', { state: { company: selectedCompany } })}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-accent-blue to-accent-cyan text-white font-bold text-xs shadow-glow-blue flex items-center gap-2 self-start"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start {selectedCompany} Mock Interview</span>
        </button>
      </div>

      {/* 15 Companies Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {companies.map((comp) => {
          const isSelected = selectedCompany === comp.name;
          return (
            <button
              key={comp.id}
              onClick={() => setSelectedCompany(comp.name)}
              className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                isSelected 
                  ? 'bg-surface-secondary border-accent-cyan shadow-glow-blue text-white' 
                  : 'bg-surface border-surface-border text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-white truncate">{comp.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-border text-gray-300">
                  {comp.problemCount || 30} Qs
                </span>
              </div>
              <span className="text-[10px] text-gray-400 truncate">{comp.tier}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Company Intelligence Summary Card */}
      {stats && (
        <div className="bg-surface border border-surface-border rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-border pb-4 gap-4">
            <div>
              <span className="text-xs text-accent-cyan font-bold uppercase tracking-wider">Company Analysis</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">{stats.company} Interview Problem Corpus</h2>
              <p className="text-xs text-gray-400">{stats.historicalSignal}</p>
            </div>

            <div className="flex items-center space-x-3 bg-surface-secondary border border-surface-border rounded-2xl px-4 py-2 text-xs font-mono">
              <div><span className="text-gray-400">Target Pool:</span> <span className="text-white font-bold">{stats.problemCount}</span></div>
              <div className="h-4 w-px bg-surface-border"></div>
              <div><span className="text-green-400 font-bold">{stats.difficulty?.Easy || 0}</span> <span className="text-gray-500">Easy</span></div>
              <div><span className="text-yellow-400 font-bold">{stats.difficulty?.Medium || 0}</span> <span className="text-gray-500">Med</span></div>
              <div><span className="text-red-400 font-bold">{stats.difficulty?.Hard || 0}</span> <span className="text-gray-500">Hard</span></div>
            </div>
          </div>

          {/* Top Topics Breakdown Badges */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-accent-cyan" />
              <span>High-Frequency Topic Signals</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.topics || {}).map(([topic, count]) => (
                <span key={topic} className="px-3 py-1.5 rounded-xl bg-surface-secondary border border-surface-border text-xs text-gray-200 font-mono flex items-center gap-2">
                  <span>{topic}</span>
                  <span className="px-1.5 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan text-[10px] font-bold">{count}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Recency Bucket Breakdown */}
          {stats.recencyDistribution && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-accent-lime" />
                <span>Historical Recency Distribution</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                {Object.entries(stats.recencyDistribution).map(([rec, count]) => (
                  <div key={rec} className="p-3 rounded-xl bg-surface-secondary border border-surface-border text-center">
                    <span className="text-gray-400 text-[10px] block capitalize">{rec.replace(/-/g, ' ')}</span>
                    <span className="text-lg font-bold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filterable Company Problem Pool */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-blue" />
            <span>{selectedCompany} Problem Pool</span>
          </h2>
        </div>

        {/* Filter Bar */}
        <div className="bg-surface border border-surface-border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search problem title or topic..."
              className="w-full bg-surface-secondary border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-accent-cyan"
            />
          </div>

          <div>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-2.5 text-white text-xs"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full bg-surface-secondary border border-surface-border rounded-xl px-4 py-2.5 text-white text-xs"
            >
              <option value="All">All Topics</option>
              {['Array', 'String', 'Hash Table', 'Two Pointers', 'Binary Search', 'Sliding Window', 'Linked List', 'Tree', 'Graph', 'Dynamic Programming', 'Math', 'Sorting'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Problems Grid */}
        {problems.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-xs font-mono">
            No matching problems in {selectedCompany} pool.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((cp) => {
              const prob = cp.problemId || cp;
              const isEasy = cp.difficulty === 'Easy';
              const isMedium = cp.difficulty === 'Medium';

              return (
                <Link
                  key={cp._id || cp.slug}
                  to={`/problems/${cp.slug}`}
                  className="group p-6 rounded-2xl bg-surface border border-surface-border hover:border-accent-cyan/50 transition-all hover:-translate-y-1 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                        isEasy ? 'bg-green-500/10 text-green-400 border-green-500/30' : isMedium ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {cp.difficulty}
                      </span>
                      {cp.frequency && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30">
                          Freq: {Math.round(cp.frequency * 100)}%
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-accent-cyan transition-colors mb-2">
                      {cp.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(cp.topics || []).map((t, idx) => (
                        <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary border border-surface-border text-gray-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-gray-400 truncate capitalize">
                      {cp.recency ? cp.recency.replace(/-/g, ' ') : 'Company signal'}
                    </span>
                    <span className="text-accent-cyan font-semibold group-hover:translate-x-1 transition-transform">Solve →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
