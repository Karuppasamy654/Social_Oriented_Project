import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('codebuddy_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      // Stale or invalid JWT token; clear token and reset state cleanly
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('codebuddy_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, username, email, password) => {
    const res = await api.post('/auth/register', { name, username, email, password });
    localStorage.setItem('codebuddy_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const initiateOAuth = (provider, action = 'login', redirect = '/dashboard') => {
    const viteApiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
      ? import.meta.env.VITE_API_BASE_URL
      : '';
    const apiBase = (typeof window !== 'undefined' && window.__CODEBUDDY_CONFIG__?.apiBaseUrl)
      ? window.__CODEBUDDY_CONFIG__.apiBaseUrl
      : viteApiBase || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');
    window.location.href = `${apiBase.replace(/\/+$/, '')}/auth/${provider}?action=${action}&redirect=${encodeURIComponent(redirect)}`;
  };

  const handleOAuthCallback = async (provider, code, state) => {
    const endpoint = `/auth/${provider}/callback`;
    const res = await api.post(endpoint, { code, state });
    if (res.data?.token) {
      localStorage.setItem('codebuddy_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };

  const exchangeTicket = async (ticket) => {
    const res = await api.post('/auth/exchange', { ticket });
    if (res.data?.token) {
      localStorage.setItem('codebuddy_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res.data;
  };


  const getLinkedProviders = async () => {
    const res = await api.get('/auth/providers');
    return res.data;
  };

  const unlinkProvider = async (provider) => {
    const res = await api.delete(`/auth/providers/${provider}`);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('codebuddy_token');
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      initiateOAuth,
      handleOAuthCallback,
      exchangeTicket,
      getLinkedProviders,

      unlinkProvider,
      logout,
      updateUserProfile,
      refreshUser: fetchCurrentUser,
      checkAuth: fetchCurrentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
