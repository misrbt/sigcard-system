import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000/api' : '');
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

// The auth token lives in an httpOnly cookie (set by the backend) and is sent
// automatically via withCredentials — no Authorization header to attach here.

// 401 handling is done in AuthContext (which ejects/re-adds its own interceptor)
// so we only reject here – no hard redirect that would fight with React Router
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503 && window.location.pathname !== '/maintenance') {
      // Admins are exempt from maintenance mode — never redirect them to the maintenance page.
      try {
        const stored = localStorage.getItem('user');
        const u = stored ? JSON.parse(stored) : null;
        const isAdmin = Array.isArray(u?.roles) && u.roles.some((r) => (r.name ?? r) === 'admin');
        if (isAdmin) return Promise.reject(error);
      } catch {
        // fall through on parse failure
      }

      // Non-admin: clear session so /login shows the form instead of auto-redirecting
      // to a dashboard that would 503 again.
      localStorage.removeItem('user');
      window.location.replace('/maintenance');
    }
    return Promise.reject(error);
  }
);

export default api;
