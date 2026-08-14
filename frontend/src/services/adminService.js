import api from './api';

export const adminService = {
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard'),

  // Users
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getOnlineUsers: () => api.get('/admin/users/online'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  activateUser: (id) => api.post(`/admin/users/${id}/activate`),
  deactivateUser: (id) => api.post(`/admin/users/${id}/deactivate`),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock`),
  resetPassword: (id, data) => api.post(`/admin/users/${id}/reset-password`, data),
  getUserLoginStatus: (id) => api.get(`/admin/users/${id}/login-status`),
  revokeAllSessions: (id) => api.post(`/admin/users/${id}/revoke-all-sessions`),
  revokeToken: (userId, tokenId) => api.delete(`/admin/users/${userId}/tokens/${tokenId}`),
  clearForcePasswordChange: (id) => api.post(`/admin/users/${id}/clear-force-password-change`),
  restoreLoginAccess: (id) => api.post(`/admin/users/${id}/restore-login-access`),
  resetUser2FA: (id) => api.post(`/admin/users/${id}/reset-2fa`),
  requireTwoFactor: (id) => api.post(`/admin/users/${id}/require-2fa`),
  disableTwoFactorRequirement: (id) => api.post(`/admin/users/${id}/require-2fa/disable`),

  // Roles
  getRoles: () => api.get('/admin/roles'),
  createRole: (data) => api.post('/admin/roles', data),
  updateRole: (id, data) => api.put(`/admin/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/admin/roles/${id}`),

  // Permissions
  getPermissions: () => api.get('/admin/permissions'),
  createPermission: (data) => api.post('/admin/permissions', data),
  getUserPermissions: (userId) => api.get(`/admin/users/${userId}/permissions`),
  syncUserPermissions: (userId, permissions) => api.put(`/admin/users/${userId}/permissions`, { permissions }),

  // Audit
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),
  getSubjectHistory: (subjectType, subjectId) => api.get(`/admin/audit-logs/history/${subjectType}/${subjectId}`),
  getLoginAttempts: (params = {}) => api.get('/admin/login-attempts', { params }),
  getSecurityEvents: (params = {}) => api.get('/admin/security-events', { params }),

  // Branches
  getBranches: () => api.get('/branches'),
  getBranchHierarchy: () => api.get('/admin/branch-hierarchy'),
  createBranch: (data) => api.post('/admin/branches', data),
  updateBranch: (id, data) => api.put(`/admin/branches/${id}`, data),
  deleteBranch: (id) => api.delete(`/admin/branches/${id}`),
  updateBranchParent: (branchId, parentId) => api.put(`/admin/branches/${branchId}/parent`, { parent_id: parentId }),

  // System Settings
  getSystemSettings: () => api.get('/admin/system-settings'),
  updateSystemSettings: (data) => api.put('/admin/system-settings', data),
  uploadAppLogo: (file) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/admin/system-settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
