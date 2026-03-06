import api from './api';

export const adminService = {
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard'),

  // Users
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  activateUser: (id) => api.post(`/admin/users/${id}/activate`),
  deactivateUser: (id) => api.post(`/admin/users/${id}/deactivate`),
  unlockUser: (id) => api.post(`/admin/users/${id}/unlock`),
  resetPassword: (id, data) => api.post(`/admin/users/${id}/reset-password`, data),

  // Roles
  getRoles: () => api.get('/admin/roles'),
  updateRole: (id, data) => api.put(`/admin/roles/${id}`, data),

  // Permissions
  getPermissions: () => api.get('/admin/permissions'),

  // Audit
  getAuditLogs: (params = {}) => api.get('/admin/audit-logs', { params }),
  getSubjectHistory: (subjectType, subjectId) => api.get(`/admin/audit-logs/history/${subjectType}/${subjectId}`),
  getLoginAttempts: (params = {}) => api.get('/admin/login-attempts', { params }),
  getSecurityEvents: (params = {}) => api.get('/admin/security-events', { params }),

  // Branches
  getBranches: () => api.get('/branches'),
  getBranchHierarchy: () => api.get('/admin/branch-hierarchy'),
  updateBranchParent: (branchId, parentId) => api.put(`/admin/branches/${branchId}/parent`, { parent_id: parentId }),

  // System Settings
  getSystemSettings: () => api.get('/admin/system-settings'),
  updateSystemSettings: (data) => api.put('/admin/system-settings', data),
};
