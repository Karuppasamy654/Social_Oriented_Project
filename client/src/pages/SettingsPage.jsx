import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Settings, Save, Shield, User, Globe, Github, Building2, CheckCircle2, KeyRound, Lock } from 'lucide-react';

export default function SettingsPage() {
  const { user, checkAuth, getLinkedProviders, initiateOAuth, unlinkProvider } = useAuth();

  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    college: '',
    organization: '',
    website: '',
    githubUrl: '',
    linkedinUrl: '',
    avatar: '',
    skills: '',
    emailDiscoverability: false,
    profileVisibility: 'public',
    submissionVisibility: 'public'
  });

  const [providers, setProviders] = useState({
    google: { connected: false, email: null },
    github: { connected: false, email: null },
    hasPassword: true
  });

  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        college: user.college || '',
        organization: user.organization || '',
        website: user.website || '',
        githubUrl: user.githubUrl || '',
        linkedinUrl: user.linkedinUrl || '',
        avatar: user.avatar || '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : (user.skills || ''),
        emailDiscoverability: user.privacyPreferences?.emailDiscoverability || false,
        profileVisibility: user.privacyPreferences?.profileVisibility || 'public',
        submissionVisibility: user.privacyPreferences?.submissionVisibility || 'public'
      });
    }
    fetchProviders();
  }, [user]);

  const fetchProviders = async () => {
    try {
      if (getLinkedProviders) {
        const data = await getLinkedProviders();
        setProviders(data);
      }
    } catch (err) {
      console.error('Failed to load linked providers:', err);
    }
  };

  const handleConnectProvider = async (provider) => {
    try {
      setError('');
      await initiateOAuth(provider, 'link', '/settings');
    } catch (err) {
      setError(err.response?.data?.message || `Failed to initiate ${provider} account linking.`);
    }
  };

  const handleUnlinkProvider = async (provider) => {
    try {
      setError('');
      setMessage('');
      setUnlinking(provider);
      const res = await unlinkProvider(provider);
      setMessage(res.message || `${provider} account unlinked successfully.`);
      await fetchProviders();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to unlink ${provider} account.`);
    } finally {
      setUnlinking(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      setError('');

      const skillsArray = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        displayName: formData.displayName,
        bio: formData.bio,
        location: formData.location,
        college: formData.college,
        organization: formData.organization,
        website: formData.website,
        githubUrl: formData.githubUrl,
        linkedinUrl: formData.linkedinUrl,
        avatar: formData.avatar,
        skills: skillsArray,
        privacyPreferences: {
          emailDiscoverability: formData.emailDiscoverability,
          profileVisibility: formData.profileVisibility,
          submissionVisibility: formData.submissionVisibility
        }
      };

      const res = await api.put('/users/profile', payload);
      setMessage('Profile updated successfully!');
      if (checkAuth) await checkAuth();
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 space-y-2 shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-2xl">
            <Settings className="w-6 h-6 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Profile & Security Settings</h1>
            <p className="text-xs text-gray-400 font-mono">Manage your public developer identity, OAuth login methods, and privacy settings.</p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-surface border border-surface-border rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
        
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Connected Accounts & Security Panel */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-surface-border pb-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>Login Methods & OAuth Connections</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Google Provider Card */}
            <div className="p-4 bg-surface-secondary border border-surface-border rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                  </svg>
                  <span className="text-xs font-bold text-white">Google</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${providers.google?.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'}`}>
                  {providers.google?.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono truncate">
                {providers.google?.connected ? (providers.google.email || 'Google Account Connected') : 'Authenticate securely using Google.'}
              </p>
              {providers.google?.connected ? (
                <button
                  type="button"
                  onClick={() => handleUnlinkProvider('google')}
                  disabled={unlinking === 'google'}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-all"
                >
                  {unlinking === 'google' ? 'Unlinking...' : 'Unlink Google'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnectProvider('google')}
                  className="w-full py-1.5 px-3 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-white text-xs font-semibold transition-all"
                >
                  Connect Google
                </button>
              )}
            </div>

            {/* GitHub Provider Card */}
            <div className="p-4 bg-surface-secondary border border-surface-border rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Github className="w-5 h-5 text-white" />
                  <span className="text-xs font-bold text-white">GitHub</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${providers.github?.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-400'}`}>
                  {providers.github?.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono truncate">
                {providers.github?.connected ? (providers.github.email || 'GitHub Account Connected') : 'Connect your developer identity.'}
              </p>
              {providers.github?.connected ? (
                <button
                  type="button"
                  onClick={() => handleUnlinkProvider('github')}
                  disabled={unlinking === 'github'}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-all"
                >
                  {unlinking === 'github' ? 'Unlinking...' : 'Unlink GitHub'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnectProvider('github')}
                  className="w-full py-1.5 px-3 rounded-lg bg-surface hover:bg-surface-border border border-surface-border text-white text-xs font-semibold transition-all"
                >
                  Connect GitHub
                </button>
              )}
            </div>

            {/* Password Method Card */}
            <div className="p-4 bg-surface-secondary border border-surface-border rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-accent-purple" />
                  <span className="text-xs font-bold text-white">Password</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${providers.hasPassword ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                  {providers.hasPassword ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                {providers.hasPassword ? 'Active for email/password sign-in.' : 'OAuth-only account. Password disabled.'}
              </p>
            </div>
          </div>
        </div>

        {/* Identity Information */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-surface-border pb-2">
            <User className="w-4 h-4 text-accent-blue" />
            <span>Developer Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">Avatar Image URL</label>
              <input
                type="text"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5">Short Bio</label>
            <textarea
              rows="3"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell other developers about your background, interests, and target goals..."
              className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
            ></textarea>
          </div>
        </div>

        {/* Organization / College / Location */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-surface-border pb-2">
            <Building2 className="w-4 h-4 text-accent-purple" />
            <span>Education & Location</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">College / University</label>
              <input
                type="text"
                value={formData.college}
                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                placeholder="e.g. CEG, Anna University"
                className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">Organization / Company</label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="e.g. CodeBuddy"
                className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Chennai, India"
                className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1.5">Skills (comma separated)</label>
            <input
              type="text"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              placeholder="C++, Python, JavaScript, Algorithms, Data Structures"
              className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-surface-border pb-2">
            <Globe className="w-4 h-4 text-accent-cyan" />
            <span>Social & Portfolio Links</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://yourportfolio.dev"
                className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">GitHub URL</label>
              <input
                type="url"
                value={formData.githubUrl}
                onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                placeholder="https://github.com/username"
                className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1.5">LinkedIn URL</label>
              <input
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-accent-blue font-mono"
              />
            </div>
          </div>
        </div>

        {/* Privacy Preferences */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-surface-border pb-2">
            <Shield className="w-4 h-4 text-accent-pink" />
            <span>Privacy Preferences</span>
          </h3>

          <div className="space-y-3 font-mono text-xs text-gray-300">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emailDiscoverability}
                onChange={(e) => setFormData({ ...formData, emailDiscoverability: e.target.checked })}
                className="w-4 h-4 rounded bg-surface-secondary border-surface-border text-accent-blue focus:ring-0"
              />
              <span>Allow users to find me by email address in search</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-gradient-to-r from-accent-blue to-accent-purple text-white font-bold text-xs rounded-xl shadow-glow-blue hover:opacity-95 transition-all inline-flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Profile Settings'}</span>
        </button>
      </form>
    </div>
  );
}
