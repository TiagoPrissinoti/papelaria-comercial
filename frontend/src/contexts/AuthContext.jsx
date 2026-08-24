import { createContext, useEffect, useState } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

function clearLegacyAuthStorage() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = Boolean(user);

  useEffect(() => {
    clearLegacyAuthStorage();

    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) setUser(null);
        return Promise.reject(error);
      }
    );

    return () => api.interceptors.response.eject(interceptorId);
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
  }

  async function register(payload) {
    await api.post('/auth/register', payload);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearLegacyAuthStorage();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
