import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3333/api' : '/api');

const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true
});

export function getUploadsBaseUrl() {
  return apiUrl.replace(/\/api$/, '');
}

export default api;
