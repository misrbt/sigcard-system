import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Get CSRF cookie from Sanctum
export const getCsrfCookie = async () => {
  await axios.get(`${BASE_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
};

// Attach Bearer token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 401 handling is done in AuthContext (which ejects/re-adds its own interceptor)
// so we only reject here – no hard redirect that would fight with React Router
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
