import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { ROLE_PRIORITY } from '../constants/roles';

export const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes (matches backend session_timeout)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000; // refresh every 10 min (safe for short token lifetimes)
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const inactivityTimer = useRef(null);
  const refreshTimer = useRef(null);
  const lastActivity = useRef(Date.now());

  // ── clear auth state ────────────────────────────────────────
  const clearAuth = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setIsAuthenticated(false);
    clearTimeout(inactivityTimer.current);
    clearInterval(refreshTimer.current);
  }, []);

  // ── auto-logout on inactivity ───────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    lastActivity.current = Date.now();

    clearTimeout(inactivityTimer.current);

    if (!localStorage.getItem('authToken')) return;

    inactivityTimer.current = setTimeout(() => {
      setSessionExpired(true);
      clearAuth();
    }, INACTIVITY_TIMEOUT);
  }, [clearAuth]);

  // ── token refresh ───────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const res = await api.post('/auth/refresh-token');
      const newToken = res.data?.data?.token;
      if (newToken) {
        localStorage.setItem('authToken', newToken);
      }
    } catch (err) {
      // Only force logout on 401 – the response interceptor already handles this.
      // Any other error (network, 500, etc.) should NOT end the session; just skip
      // the refresh and let the next API call surface the issue naturally.
      if (err?.response?.status === 401) {
        clearAuth();
      }
    }
  }, [clearAuth]);

  // ── start session watchers (inactivity + token refresh) ─────
  const startSessionWatchers = useCallback(() => {
    // inactivity detection
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetInactivityTimer, { passive: true })
    );
    resetInactivityTimer();

    // periodic token refresh
    refreshTimer.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
  }, [resetInactivityTimer, refreshToken]);

  const stopSessionWatchers = useCallback(() => {
    ACTIVITY_EVENTS.forEach((evt) =>
      window.removeEventListener(evt, resetInactivityTimer)
    );
    clearTimeout(inactivityTimer.current);
    clearInterval(refreshTimer.current);
  }, [resetInactivityTimer]);

  // ── fetch user on mount / verify token ──────────────────────
  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/auth/me');
      const data = response.data.data;

      setUser(data.user);
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      setIsAuthenticated(true);
      setSessionExpired(false);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // start / stop watchers when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      startSessionWatchers();
    } else {
      stopSessionWatchers();
    }
    return stopSessionWatchers;
  }, [isAuthenticated, startSessionWatchers, stopSessionWatchers]);

  // listen for 401s from any API call (token expired server-side)
  // NOTE: do NOT set sessionExpired here — that flag is reserved for genuine
  // inactivity timeouts so the login page shows the correct message.
  // A server-side 401 (e.g. token too short, revoked) just clears auth quietly.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401 && isAuthenticated) {
          clearAuth();
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, [isAuthenticated, clearAuth]);

  // ── login ───────────────────────────────────────────────────
  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const { token, user: userData } = response.data.data;

    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));

    await fetchUser();
    return response.data;
  };

  // ── logout ──────────────────────────────────────────────────
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      clearAuth();
      setSessionExpired(false);
    }
  };

  const hasRole = (role) => {
    if (Array.isArray(role)) {
      return role.some((r) => roles.includes(r));
    }
    return roles.includes(role);
  };

  const hasPermission = (permission) => permissions.includes(permission);

  const getPrimaryRole = () => {
    for (const role of ROLE_PRIORITY) {
      if (roles.includes(role)) return role;
    }
    return roles[0] || null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        permissions,
        loading,
        isAuthenticated,
        sessionExpired,
        login,
        logout,
        hasRole,
        hasPermission,
        getPrimaryRole,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
