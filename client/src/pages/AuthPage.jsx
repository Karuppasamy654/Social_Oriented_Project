import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Code2, Mail, Lock, User, ArrowRight, Github, Sparkles } from 'lucide-react';

export default function AuthPage({ isRegister = false }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginOAuthMock, user } = useAuth();

  const [isSignUp, setIsSignUp] = useState(isRegister || location.pathname === '/register' || searchParams.get('signup') === 'true');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [oauthLoading, setOauthLoading] = useState(null);

  useEffect(() => {
    setIsSignUp(isRegister || location.pathname === '/register' || searchParams.get('signup') === 'true');
  }, [location.pathname, isRegister, searchParams]);

  useEffect(() => {
    if (user) {
      if (!user.onboardingCompleted && !user.isOnboarded) {
        navigate('/onboarding/experience');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        await register(name, username, email, password);
        navigate('/onboarding/experience');
      } else {
        const res = await login(email, password);
        if (!res.user.onboardingCompleted && !res.user.isOnboarded) {
          navigate('/onboarding/experience');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    setOauthLoading(provider);
    try {
      await initiateOAuth(provider, 'login', '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || `Failed to connect to ${provider === 'google' ? 'Google' : 'GitHub'}.`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface/90 border border-surface-border rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        
        {/* Glow Element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="CodeBuddy Logo" 
            className="w-20 h-20 object-contain rounded-full mx-auto drop-shadow-xl mb-3 hover:scale-105 transition-transform" 
          />
          <h2 className="text-2xl font-extrabold text-white">
            {isSignUp ? 'Create your CodeBuddy Account' : 'Welcome back to CodeBuddy'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {isSignUp ? 'Join the AI-powered social coding platform' : 'Enter your credentials to continue your journey'}
          </p>
        </div>


        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Social Auth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={loading || Boolean(oauthLoading)}
            className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl bg-surface-secondary border border-surface-border hover:border-accent-blue text-white text-xs font-semibold transition-all hover:bg-surface-hover disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"/>
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
            </svg>
            <span>{oauthLoading === 'google' ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('github')}
            disabled={loading || Boolean(oauthLoading)}
            className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl bg-surface-secondary border border-surface-border hover:border-accent-purple text-white text-xs font-semibold transition-all hover:bg-surface-hover disabled:opacity-60"
          >
            <Github className="w-4 h-4 text-white" />
            <span>{oauthLoading === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
          </button>
        </div>


        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-border"></div></div>
          <span className="relative px-3 bg-surface text-gray-500 text-[11px] uppercase tracking-wider">or with email</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Arun Kumar"
                    className="w-full bg-surface-secondary border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Username</label>
                <div className="relative">
                  <span className="text-gray-500 text-xs absolute left-3.5 top-2.5 font-mono">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="arunkumar"
                    className="w-full bg-surface-secondary border border-surface-border rounded-xl pl-9 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-surface-secondary border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-accent-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-secondary border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-accent-blue"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-secondary border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-white text-xs focus:outline-none focus:border-accent-blue"
                />
              </div>
            </div>
          )}

          {!isSignUp && (
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-gray-400 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                  className="rounded bg-surface-secondary border-surface-border text-accent-blue focus:ring-0"
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="text-accent-blue hover:underline">Forgot password?</a>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 via-amber-400 to-green-400 text-white font-extrabold text-sm shadow-lg shadow-pink-500/30 hover:scale-105 hover:shadow-pink-500/50 transition-all flex items-center justify-center space-x-2 mt-6"
          >
            <span>{loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="text-center mt-6 text-xs text-gray-400">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button onClick={() => setIsSignUp(false)} className="text-pink-400 font-bold hover:underline">
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button onClick={() => setIsSignUp(true)} className="text-amber-400 font-bold hover:underline">
                Create Account
              </button>
            </p>
          )}
        </div>


      </div>
    </div>
  );
}
