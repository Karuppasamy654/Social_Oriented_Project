import axios from 'axios';

const viteApiBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : '';

const runtimeApiBase = (typeof window !== 'undefined' && window.__CODEBUDDY_CONFIG__?.apiBaseUrl)
  ? window.__CODEBUDDY_CONFIG__.apiBaseUrl
  : viteApiBase || (typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

const API_BASE_URL = runtimeApiBase.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codebuddy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export default api;
