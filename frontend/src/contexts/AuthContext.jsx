import { createContext, useEffect, useState } from 'react';
import api, { setAuthToken } from '../services/api';

export const AuthContext = createContext();

function normalizeStoredToken(rawToken) {
  if (!rawToken) return '';
  if (rawToken === 'null' || rawToken === 'undefined') return '';
  return rawToken;
}

function isTokenStillValid(token) {
  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return false;
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const storedToken = normalizeStoredToken(sessionStorage.getItem('token'));
    const validToken = storedToken && isTokenStillValid(storedToken) ? storedToken : '';

    // Limpa legado de persistencia antiga
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Garante header ja no primeiro render
    setAuthToken(validToken);
    return validToken;
  });

  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('user') || 'null'));

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      return;
    }
    setAuthToken('');
  }, [token]);

  useEffect(() => {
    if (token) return;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  }, [token]);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setAuthToken(data.token);
  }

  async function register(payload) {
    await api.post('/auth/register', payload);
  }

  function logout() {
    setToken('');
    setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthToken('');
  }

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptorId);
  }, []);

  return <AuthContext.Provider value={{ token, user, login, register, logout }}>{children}</AuthContext.Provider>;
}
