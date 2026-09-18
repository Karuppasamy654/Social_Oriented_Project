import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { handleOAuthCallback, exchangeTicket } = useAuth();

  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [providerName, setProviderName] = useState('OAuth');

  useEffect(() => {
    let provider = 'google';
    if (location.pathname.includes('github') || searchParams.get('provider') === 'github') {
      provider = 'github';
    } else if (location.pathname.includes('google') || searchParams.get('provider') === 'google') {
      provider = 'google';
    }
    setProviderName(provider === 'google' ? 'Google' : 'GitHub');

    const ticket = searchParams.get('ticket');
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error') || searchParams.get('error_description');

    if (errorParam) {
      setStatus('error');
      setErrorMessage(errorParam === 'access_denied'
        ? `Access permission was denied by the authentication provider.`
        : errorParam);
      return;
    }

    const processAuth = async () => {
      try {
        let res;
        if (ticket) {
          res = await exchangeTicket(ticket);
        } else if (code && state) {
          res = await handleOAuthCallback(provider, code, state);
        } else {
          setStatus('error');
          setErrorMessage('Missing authorization credentials or exchange ticket.');
          return;
        }

        setStatus('success');
        const redirectUrl = res.redirect || (res.user && !res.user.isOnboarded ? '/onboarding/experience' : '/dashboard');
        setTimeout(() => {
          navigate(redirectUrl, { replace: true });
        }, 500);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.message || err.message || `Authentication failed.`
        );
      }
    };

    processAuth();
  }, [location.pathname, searchParams]);


  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface/90 border border-surface-border rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">
        
        <img 
          src="/logo.png" 
          alt="CodeBuddy Logo" 
          className="w-16 h-16 object-contain rounded-full mx-auto mb-2 drop-shadow-xl hover:scale-105 transition-transform" 
        />

        {status === 'processing' && (
          <div className="space-y-4 py-6">
            <div className="inline-flex items-center justify-center p-4 bg-accent-blue/10 border border-accent-blue/30 rounded-full animate-pulse">
              <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Connecting to {providerName}...
            </h2>
            <p className="text-xs text-gray-400 font-mono">
              Verifying security credentials and retrieving identity...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-6">
            <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Authenticated Successfully!
            </h2>
            <p className="text-xs text-emerald-400 font-mono">
              Redirecting to your CodeBuddy workspace...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 py-4">
            <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 border border-rose-500/30 rounded-full">
              <ShieldAlert className="w-8 h-8 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white mb-2">
                Authentication Failed
              </h2>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 font-mono text-left">
                {errorMessage}
              </div>
            </div>

            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full py-3 px-4 rounded-xl bg-surface-secondary border border-surface-border hover:border-accent-blue text-white text-xs font-bold transition-all flex items-center justify-center space-x-2"
            >
              <span>Return to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
