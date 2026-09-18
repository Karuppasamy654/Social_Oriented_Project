import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Users, BookOpen, Lock, Globe, Code2, Sparkles } from 'lucide-react';

export default function CreateStudyRoomModal({ isOpen, onClose, onRoomCreated }) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [visibility, setVisibility] = useState('request_only');
  const [editorPermissionMode, setEditorPermissionMode] = useState('everyone');
  const [linkedProblemId, setLinkedProblemId] = useState('');
  
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProblems();
    }
  }, [isOpen]);

  const fetchProblems = async () => {
    try {
      const res = await api.get('/problems?limit=50');
      setProblems(res.data.problems || []);
    } catch (err) {
      console.error('Error fetching problem list:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !topic.trim()) {
      setError('Room name and topic are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/rooms', {
        name: name.trim(),
        topic: topic.trim(),
        description: description.trim(),
        goal: goal.trim(),
        maxParticipants: parseInt(maxParticipants, 10) || 6,
        visibility,
        editorPermissionMode,
        linkedProblemId: linkedProblemId || null
      });

      setLoading(false);
      onRoomCreated(res.data);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || 'Failed to create study room');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-surface border border-surface-border rounded-3xl p-6 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Create Study Room</h2>
              <p className="text-xs text-gray-400">Set up a collaborative workspace for real-time study.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div>
            <label className="block text-gray-300 font-bold mb-1">Room Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., DSA Graph Algorithms Study"
              className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-300 font-bold mb-1">Topic / Subject *</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Graphs / BFS / DFS"
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-accent-purple"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-bold mb-1">Max Capacity (2 - 20)</label>
              <input
                type="number"
                min="2"
                max="20"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-bold mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Solving LeetCode graph problems together"
              className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-accent-purple"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-bold mb-1">Session Goal</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Master Topological Sort and Cycle Detection"
              className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-accent-purple"
            />
          </div>

          {/* Join Mode & Editor Permission */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-gray-300 font-bold mb-1">Join Mode</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-accent-purple"
              >
                <option value="request_only">Request to Join (Creator Approves)</option>
                <option value="invite_only">Invite Only</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 font-bold mb-1">Shared Editor Mode</label>
              <select
                value={editorPermissionMode}
                onChange={(e) => setEditorPermissionMode(e.target.value)}
                className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-accent-purple"
              >
                <option value="everyone">Everyone Can Edit</option>
                <option value="creator_only">Creator Only (Participants Read-Only)</option>
              </select>
            </div>
          </div>

          {/* Linked Problem Selection */}
          <div>
            <label className="block text-gray-300 font-bold mb-1">Linked CodeBuddy Problem (Optional)</label>
            <select
              value={linkedProblemId}
              onChange={(e) => setLinkedProblemId(e.target.value)}
              className="w-full bg-surface-secondary border border-surface-border rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-accent-purple"
            >
              <option value="">None (Free Coding Scratchpad)</option>
              {problems.map(p => (
                <option key={p._id} value={p._id}>
                  {p.title} ({p.difficulty})
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-surface-secondary text-gray-300 hover:text-white font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white font-bold text-xs shadow-glow-purple disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Study Room'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
