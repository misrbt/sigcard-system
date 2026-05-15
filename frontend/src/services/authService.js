import api, { getCsrfCookie } from './api';

/**
 * Auth API Endpoints Service
 * Complete authentication service for Laravel backend integration
 * Supports: Login, Register, Logout, Password Reset, Email Verification, Profile Management
 */

export const authService = {
  // ==================== Authentication ====================

  /**
   * Login with email and password
   * @param {Object} credentials - { email, password, remember_me }
   * @returns {Promise} Response with token and user data
   */
  login: async (credentials) => {
    // Get CSRF cookie first for Sanctum SPA authentication
    await getCsrfCookie();
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Register new user
   * @param {Object} userData - { name, email, password, password_confirmation }
   * @returns {Promise} Response with user data
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  /**
   * Logout current user
   * @returns {Promise} Logout response
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('refreshToken');
    }
  },

  /**
   * Refresh authentication token
   * @returns {Promise} Response with new token
   */
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  // ==================== Password Management ====================

  /**
   * Request password reset email
   * @param {string} email - User email address
   * @returns {Promise} Response message
   */
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   * @param {Object} data - { token, email, password, password_confirmation }
   * @returns {Promise} Response message
   */
  resetPassword: async (data) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  /**
   * Change password for authenticated user
   * @param {Object} passwords - { current_password, password, password_confirmation }
   * @returns {Promise} Response message
   */
  changePassword: async (passwords) => {
    const response = await api.put('/auth/change-password', passwords);
    return response.data;
  },

  // ==================== Email Verification ====================

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {Promise} Response message
   */
  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  /**
   * Resend email verification link
   * @returns {Promise} Response message
   */
  resendVerification: async () => {
    const response = await api.post('/auth/resend-verification');
    return response.data;
  },

  // ==================== User Profile ====================

  /**
   * Get authenticated user profile
   * @returns {Promise} User data
   */
  getProfile: async () => {
    const response = await api.get('/auth/user');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  /**
   * Update user profile
   * @param {Object} userData - Updated user data
   * @returns {Promise} Updated user data
   */
  updateProfile: async (userData) => {
    const response = await api.put('/auth/user', userData);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  /**
   * Upload user profile picture
   * @param {File} file - Image file
   * @returns {Promise} Response with image URL
   */
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);

    const response = await api.post('/auth/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Update user in localStorage with new profile picture
    const user = authService.getCurrentUser();
    if (user) {
      user.profile_picture = response.data.profile_picture_url;
      localStorage.setItem('user', JSON.stringify(user));
    }

    return response.data;
  },

  /**
   * Delete user account
   * @param {string} password - User password for confirmation
   * @returns {Promise} Response message
   */
  deleteAccount: async (password) => {
    const response = await api.delete('/auth/user', { data: { password } });
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return response.data;
  },

  // ==================== Two-Factor Authentication (2FA) ====================

  /**
   * Begin 2FA setup — returns QR code URL and Base32 secret.
   * @returns {Promise} Response with qr_code_url, secret, otpauth_url
   */
  enableTwoFactor: async () => {
    const response = await api.post('/auth/enable-2fa');
    return response.data;
  },

  /**
   * Confirm 2FA setup with the first TOTP code from the authenticator app.
   * @param {string} otpCode - 6-digit code
   * @returns {Promise} Response message
   */
  confirmTwoFactor: async (otpCode) => {
    const response = await api.post('/auth/confirm-2fa', { otp_code: otpCode });
    return response.data;
  },

  /**
   * Disable two-factor authentication (requires password + current TOTP code).
   * @param {string} password - User password
   * @param {string} otpCode - Current 6-digit code from authenticator app
   * @returns {Promise} Response message
   */
  disableTwoFactor: async (password, otpCode) => {
    const response = await api.post('/auth/disable-2fa', { password, otp_code: otpCode });
    return response.data;
  },

  /**
   * Verify 2FA code during login (step 2).
   * @param {string} temporaryToken - Temporary token from login response
   * @param {string} otpCode - 6-digit code from authenticator app
   * @returns {Promise} Response with token and user
   */
  verifyTwoFactor: async (temporaryToken, otpCode) => {
    const response = await api.post('/auth/verify-2fa', { temporary_token: temporaryToken, otp_code: otpCode });
    return response.data;
  },

  // ==================== Session Management ====================

  /**
   * Get all active sessions
   * @returns {Promise} Array of active sessions
   */
  getSessions: async () => {
    const response = await api.get('/auth/sessions');
    return response.data;
  },

  /**
   * Revoke a specific session
   * @param {string} sessionId - Session ID to revoke
   * @returns {Promise} Response message
   */
  revokeSession: async (sessionId) => {
    const response = await api.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Revoke all other sessions
   * @returns {Promise} Response message
   */
  revokeAllSessions: async () => {
    const response = await api.delete('/auth/sessions/all');
    return response.data;
  },

  // ==================== Local Storage Helpers ====================

  /**
   * Get current user from localStorage
   * @returns {Object|null} User object or null
   */
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  /**
   * Get user role
   * @returns {string|null} User role or null
   */
  getUserRole: () => {
    const user = authService.getCurrentUser();
    return user?.role || null;
  },

  /**
   * Get auth token
   * @returns {string|null} Auth token or null
   */
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @returns {boolean} True if user has role
   */
  hasRole: (role) => {
    const userRole = authService.getUserRole();
    return userRole === role;
  },

  /**
   * Check if user has any of the specified roles
   * @param {Array} roles - Array of roles to check
   * @returns {boolean} True if user has any of the roles
   */
  hasAnyRole: (roles) => {
    const userRole = authService.getUserRole();
    return roles.includes(userRole);
  },

  /**
   * Check if user has permission
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission: (permission) => {
    const user = authService.getCurrentUser();
    return user?.permissions?.includes(permission) || false;
  },

  /**
   * Clear all auth data from localStorage
   */
  clearAuthData: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
  }
};