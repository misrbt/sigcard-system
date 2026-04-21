import { useState, useEffect } from 'react';
import { MdSave, MdRefresh, MdAdd, MdDelete, MdClose } from 'react-icons/md';
import { FaShieldAlt, FaCheckSquare, FaRegSquare } from 'react-icons/fa';
import { adminService } from '../../services/adminService';
import Button from '../../components/ui/Button';

const PERMISSION_GROUPS = {
  'User Management':     ['view-users', 'create-users', 'edit-users', 'delete-users', 'activate-users', 'deactivate-users', 'reset-user-passwords', 'unlock-user-accounts'],
  'Role Management':     ['view-roles', 'create-roles', 'edit-roles', 'delete-roles', 'assign-roles', 'view-permissions', 'assign-permissions'],
  'Transactions':        ['view-transactions', 'create-transactions', 'edit-transactions', 'approve-transactions', 'reject-transactions', 'cancel-transactions', 'view-transaction-history'],
  'Financial Operations':['view-accounts', 'create-accounts', 'edit-accounts', 'close-accounts', 'transfer-funds', 'approve-transfers', 'view-balances', 'generate-statements'],
  'Compliance & Audit':  ['view-audit-logs', 'export-audit-logs', 'view-compliance-reports', 'generate-compliance-reports', 'view-risk-assessments', 'create-risk-assessments', 'approve-risk-assessments'],
  'System Admin':        ['view-system-settings', 'edit-system-settings', 'view-system-logs', 'backup-system', 'restore-system', 'manage-security-policies'],
  'Customer Management': ['view-customers', 'create-customers', 'edit-customers', 'verify-customers', 'suspend-customers', 'view-customer-documents', 'approve-customer-applications'],
  'Reporting':           ['view-reports', 'generate-reports', 'export-reports', 'schedule-reports', 'view-financial-reports', 'view-regulatory-reports'],
  'Authentication':      ['force-password-reset', 'unlock-accounts', 'view-login-attempts', 'manage-sessions', 'enable-disable-2fa'],
  'Branch Operations':   ['view-branch-data', 'manage-branch-operations', 'view-branch-reports', 'approve-branch-transactions'],
};

// Roles seeded by the system — cannot be deleted
const PROTECTED_ROLES = ['admin', 'manager', 'user', 'cashier', 'compliance-audit'];

// ── Confirm Modal ─────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, onConfirm, onCancel, loading, confirmLabel = 'Confirm', danger = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
          {danger
            ? <MdDelete className={`text-xl ${danger ? 'text-red-600' : 'text-blue-600'}`} />
            : <FaShieldAlt className="text-blue-600" />}
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  </div>
);

// ── Create Role Modal ──────────────────────────────────────────────────────────
const CreateRoleModal = ({ onClose, onCreated }) => {
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed) { setError('Role name is required.'); return; }

    setLoading(true);
    setError('');
    try {
      await adminService.createRole({ name: trimmed, guard_name: 'web' });
      onCreated(trimmed);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create role. Name may already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MdAdd className="text-blue-600 text-xl" />
            <h2 className="text-base font-bold text-gray-900">Create New Role</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. branch-supervisor"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-400">Spaces will be replaced with hyphens. Lowercase only.</p>
          </div>

          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="primary" type="submit" loading={loading} leftIcon={<MdAdd />}>
              Create Role
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const RolePermissionMatrix = () => {
  const [roles, setRoles]                   = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [hasChanges, setHasChanges]         = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');

  // Create role modal
  const [showCreateRole, setShowCreateRole] = useState(false);

  // Delete role confirmation
  const [roleToDelete, setRoleToDelete]     = useState(null);
  const [deletingRole, setDeletingRole]     = useState(false);

  // Save confirmation
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const existingPermNames = allPermissions.map((p) => p.name);

  // ── Data fetching ────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const [rolesRes, permsRes] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermissions(),
      ]);

      const rolesData = rolesRes.data.data || [];
      const permsData = permsRes.data.data || [];

      setRoles(rolesData);
      setAllPermissions(permsData);

      const mapping = {};
      rolesData.forEach((role) => {
        mapping[role.id] = role.permissions?.map((p) => p.name) || [];
      });
      setRolePermissions(mapping);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to load data', err);
      setError('Failed to load roles and permissions. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Grant / revoke all permissions for a role ────────────────────────────────
  const toggleAllForRole = (roleId) => {
    const current  = rolePermissions[roleId] || [];
    const allPerms = existingPermNames;
    const allChecked = allPerms.every((p) => current.includes(p));
    setRolePermissions((prev) => ({
      ...prev,
      [roleId]: allChecked ? [] : [...allPerms],
    }));
    setHasChanges(true);
  };

  // ── Permission toggle (single) ───────────────────────────────────────────────
  const togglePermission = (roleId, permName) => {
    setRolePermissions((prev) => {
      const perms = prev[roleId] || [];
      const updated = perms.includes(permName)
        ? perms.filter((p) => p !== permName)
        : [...perms, permName];
      return { ...prev, [roleId]: updated };
    });
    setHasChanges(true);
  };

  // ── Select-all toggle per group per role ─────────────────────────────────────
  const toggleGroupForRole = (roleId, groupPerms) => {
    const available = groupPerms.filter((p) => existingPermNames.includes(p));
    const current   = rolePermissions[roleId] || [];
    const allChecked = available.every((p) => current.includes(p));

    setRolePermissions((prev) => {
      const perms = prev[roleId] || [];
      const updated = allChecked
        ? perms.filter((p) => !available.includes(p))
        : [...new Set([...perms, ...available])];
      return { ...prev, [roleId]: updated };
    });
    setHasChanges(true);
  };

  // ── Save permissions ─────────────────────────────────────────────────────────
  const doSave = async () => {
    setShowSaveConfirm(false);
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await Promise.all(
        roles.map((role) =>
          adminService.updateRole(role.id, {
            name: role.name,
            permissions: rolePermissions[role.id] || [],
          })
        )
      );
      setHasChanges(false);
      setSuccess('Permissions saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Save failed', err);
      setError(err?.response?.data?.message || 'Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Create role callback ─────────────────────────────────────────────────────
  const handleRoleCreated = async (roleName) => {
    setShowCreateRole(false);
    await fetchData();
    setSuccess(`Role "${roleName}" created successfully.`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Delete role ──────────────────────────────────────────────────────────────
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    try {
      await adminService.deleteRole(roleToDelete.id);
      const name = roleToDelete.name;
      setRoleToDelete(null);
      await fetchData();
      setSuccess(`Role "${name}" deleted successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to delete role.';
      setError(msg);
      setRoleToDelete(null);
    } finally {
      setDeletingRole(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Modals */}
      {showCreateRole && (
        <CreateRoleModal
          onClose={() => setShowCreateRole(false)}
          onCreated={handleRoleCreated}
        />
      )}

      {roleToDelete && (
        <ConfirmModal
          title="Delete Role"
          message={`Are you sure you want to delete the "${roleToDelete.name}" role? This cannot be undone. The role must have no users assigned.`}
          confirmLabel="Delete Role"
          danger
          loading={deletingRole}
          onConfirm={handleDeleteRole}
          onCancel={() => setRoleToDelete(null)}
        />
      )}

      {showSaveConfirm && (
        <ConfirmModal
          title="Save Permission Changes"
          message="This will update the permissions for all roles including admin. Are you sure you want to proceed?"
          confirmLabel="Save Changes"
          loading={saving}
          onConfirm={doSave}
          onCancel={() => setShowSaveConfirm(false)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure role permissions — {roles.length} roles, {allPermissions.length} permissions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchData} leftIcon={<MdRefresh className="w-4 h-4" />}>
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setShowCreateRole(true)} leftIcon={<MdAdd className="w-4 h-4" />}>
            New Role
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowSaveConfirm(true)}
            loading={saving}
            disabled={!hasChanges}
            leftIcon={<MdSave className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-center justify-between px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600"><MdClose /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between px-4 py-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-2 text-green-400 hover:text-green-600"><MdClose /></button>
        </div>
      )}
      {hasChanges && !error && (
        <div className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
          You have unsaved changes. Click "Save Changes" to apply.
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
        <table className="min-w-full">
          <thead>
            {/* Role name row */}
            <tr className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d]">
              <th className="sticky left-0 z-10 px-4 py-4 text-xs font-semibold tracking-wider text-left text-white/60 uppercase bg-[#01060f] min-w-[220px]">
                Permission
              </th>
              {roles.map((role) => {
                const isAdmin     = role.name === 'admin';
                const isProtected = PROTECTED_ROLES.includes(role.name);
                const current     = rolePermissions[role.id] || [];
                const allGranted  = existingPermNames.length > 0 && existingPermNames.every((p) => current.includes(p));
                return (
                  <th key={role.id} className="px-4 py-4 text-center min-w-[110px]">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        {isAdmin && <FaShieldAlt className="text-yellow-400 text-xs" />}
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{role.name}</span>
                      </div>
                      <button
                        onClick={() => toggleAllForRole(role.id)}
                        title={allGranted ? 'Revoke all permissions' : 'Grant all permissions'}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
                          allGranted
                            ? 'bg-green-500/20 text-green-300 hover:bg-red-500/20 hover:text-red-300'
                            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                        }`}
                      >
                        {allGranted ? 'All Granted' : 'Grant All'}
                      </button>
                      {!isProtected && (
                        <button
                          onClick={() => setRoleToDelete(role)}
                          title={`Delete ${role.name} role`}
                          className="text-red-400/60 hover:text-red-400 transition-colors"
                        >
                          <MdDelete className="text-sm" />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
              const filteredPerms = perms.filter((p) => existingPermNames.includes(p));
              if (filteredPerms.length === 0) return null;

              return [
                // Group header row
                <tr key={`group-${group}`} className="bg-gray-50">
                  <td className="sticky left-0 z-10 px-4 py-2 text-xs font-bold tracking-wider text-gray-500 uppercase bg-gray-50">
                    {group}
                    <span className="ml-2 font-normal text-gray-400 normal-case">({filteredPerms.length})</span>
                  </td>
                  {roles.map((role) => {
                    const current     = rolePermissions[role.id] || [];
                    const allChecked  = filteredPerms.every((p) => current.includes(p));
                    const someChecked = filteredPerms.some((p) => current.includes(p)) && !allChecked;

                    return (
                      <td key={role.id} className="px-4 py-2 text-center bg-gray-50">
                        <button
                          onClick={() => toggleGroupForRole(role.id, filteredPerms)}
                          title={allChecked ? 'Deselect all in group' : 'Select all in group'}
                          className="transition-colors hover:text-blue-600"
                        >
                          {allChecked
                            ? <FaCheckSquare className="text-blue-600 text-base mx-auto" />
                            : someChecked
                            ? <FaCheckSquare className="text-blue-300 text-base mx-auto" />
                            : <FaRegSquare className="text-gray-300 text-base mx-auto" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>,

                // Individual permission rows
                ...filteredPerms.map((perm) => (
                  <tr key={perm} className="hover:bg-blue-50/30 transition-colors">
                    <td className="sticky left-0 z-10 px-4 py-2.5 text-sm text-gray-700 bg-white border-r border-gray-100 pl-6">
                      {perm}
                    </td>
                    {roles.map((role) => {
                      const hasIt = (rolePermissions[role.id] || []).includes(perm);

                      return (
                        <td key={role.id} className="px-4 py-2 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasIt}
                              onChange={() => togglePermission(role.id, perm)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RolePermissionMatrix;
