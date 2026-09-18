import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FileCode, CheckCircle, XCircle, Clock, Cpu, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function SubmissionHistoryPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSubmissions();
  }, [statusFilter, languageFilter, page]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      let url = `/submissions?page=${page}&limit=15`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      if (languageFilter) url += `&language=${encodeURIComponent(languageFilter)}`;

      const res = await api.get(url);
      setSubmissions(res.data.submissions || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch submission history:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-2xl">
              <FileCode className="w-7 h-7 text-accent-blue" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Submission History</h1>
              <p className="text-xs text-gray-400 font-mono pt-0.5">
                Track real code execution metrics, test case verdicts, and AI complexity analyses.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-surface-border text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
            >
              <option value="">All Statuses</option>
              <option value="Accepted">Accepted</option>
              <option value="Wrong Answer">Wrong Answer</option>
              <option value="Compilation Error">Compilation Error</option>
              <option value="Runtime Error">Runtime Error</option>
              <option value="Time Limit Exceeded">Time Limit Exceeded</option>
            </select>

            <select
              value={languageFilter}
              onChange={(e) => { setLanguageFilter(e.target.value); setPage(1); }}
              className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-surface-border text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
            >
              <option value="">All Languages</option>
              <option value="cpp17">C++17</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-surface border border-surface-border rounded-3xl overflow-hidden shadow-2xl space-y-4">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-400 font-mono">Loading submission history...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center text-gray-400 font-mono space-y-3">
            <FileCode className="w-10 h-10 text-gray-500 mx-auto" />
            <p className="text-base font-semibold text-white">No submissions found</p>
            <p className="text-xs text-gray-400">
              {statusFilter || languageFilter ? "No submissions match your active filter." : "Start solving coding problems to build your submission history."}
            </p>
            <Link to="/problems" className="inline-block mt-2 px-5 py-2 bg-accent-blue text-white rounded-xl text-xs font-bold hover:opacity-90">
              Explore Problems
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-surface-secondary text-gray-400 uppercase text-[10px] border-b border-surface-border">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Problem</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Language</th>
                  <th className="px-6 py-4">Runtime</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-gray-300">
                {submissions.map((sub) => {
                  const isAccepted = sub.status === 'Accepted' || sub.status === 'accepted';
                  return (
                    <tr key={sub._id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${
                          isAccepted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {isAccepted ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {sub.problem ? sub.problem.title : 'Problem'}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {sub.user ? (
                          <Link to={`/profile/${sub.user.username}`} className="hover:text-accent-blue hover:underline">
                            @{sub.user.username}
                          </Link>
                        ) : 'Me'}
                      </td>
                      <td className="px-6 py-4 text-accent-purple uppercase">{sub.language}</td>
                      <td className="px-6 py-4 text-gray-300">
                        <span className="inline-flex items-center"><Clock className="w-3 h-3 mr-1 text-gray-500" /> {sub.runtimeMs} ms</span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{new Date(sub.submittedAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/submissions/${sub.submissionId || sub._id}`}
                          className="px-3 py-1.5 rounded-lg bg-surface-secondary text-accent-blue font-bold hover:bg-surface-hover border border-accent-blue/30 transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border text-xs font-mono text-gray-400">
            <span>Showing {submissions.length} of {total} submissions</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl bg-surface-secondary border border-surface-border text-gray-300 disabled:opacity-40 hover:bg-surface-hover"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl bg-surface-secondary border border-surface-border text-gray-300 disabled:opacity-40 hover:bg-surface-hover"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
