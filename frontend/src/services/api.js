import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3333/api'
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

export function getUploadsBaseUrl() {
  return (import.meta.env.VITE_API_URL || 'http://localhost:3333/api').replace(/\/api$/, '');
}

export default api;
