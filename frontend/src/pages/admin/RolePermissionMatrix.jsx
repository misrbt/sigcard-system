import { useState, useEffect } from 'react';
import { MdSave, MdRefresh } from 'react-icons/md';
import { adminService } from '../../services/adminService';
import Button from '../../components/ui/Button';

const PERMISSION_GROUPS = {
  'User Management': ['view-users', 'create-users', 'edit-users', 'delete-users', 'activate-users', 'deactivate-users', 'reset-user-passwords', 'unlock-user-accounts'],
  'Role Management': ['view-roles', 'create-roles', 'edit-roles', 'delete-roles', 'assign-roles', 'view-permissions', 'assign-permissions'],
  'Transactions': ['view-transactions', 'create-transactions', 'edit-transactions', 'approve-transactions', 'reject-transactions', 'cancel-transactions', 'view-transaction-history'],
  'Financial Operations': ['view-accounts', 'create-accounts', 'edit-accounts', 'close-accounts', 'transfer-funds', 'approve-transfers', 'view-balances', 'generate-statements'],
  'Compliance & Audit': ['view-audit-logs', 'export-audit-logs', 'view-compliance-reports', 'generate-compliance-reports', 'view-risk-assessments', 'create-risk-assessments', 'approve-risk-assessments'],
  'System Admin': ['view-system-settings', 'edit-system-settings', 'view-system-logs', 'backup-system', 'restore-system', 'manage-security-policies'],
  'Customer Management': ['view-customers', 'create-customers', 'edit-customers', 'verify-customers', 'suspend-customers', 'view-customer-documents', 'approve-customer-applications'],
  'Reporting': ['view-reports', 'generate-reports', 'export-reports', 'schedule-reports', 'view-financial-reports', 'view-regulatory-reports'],
  'Authentication': ['force-password-reset', 'unlock-accounts', 'view-login-attempts', 'manage-sessions', 'enable-disable-2fa'],
  'Branch Operations': ['view-branch-data', 'manage-branch-operations', 'view-branch-reports', 'approve-branch-transactions'],
};

const RolePermissionMatrix = () => {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchData = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const togglePermission = (roleId, permName) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.name === 'admin') return; // admin always has all

    setRolePermissions((prev) => {
      const perms = prev[roleId] || [];
      const updated = perms.includes(permName)
        ? perms.filter((p) => p !== permName)
        : [...perms, permName];
      return { ...prev, [roleId]: updated };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = roles
        .filter((r) => r.name !== 'admin')
        .map((role) =>
          adminService.updateRole(role.id, {
            name: role.name,
            permissions: rolePermissions[role.id] || [],
          })
        );
      await Promise.all(promises);
      setHasChanges(false);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
      </div>
    );
  }

  // Only show permissions that exist in our DB
  const existingPermNames = allPermissions.map((p) => p.name);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">Configure role permissions using the matrix below</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} leftIcon={<MdRefresh className="w-5 h-5" />}>
            Refresh
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!hasChanges} leftIcon={<MdSave className="w-5 h-5" />}>
            Save Changes
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
          You have unsaved changes. Click "Save Changes" to apply.
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 z-10 px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase bg-gray-50 min-w-[220px]">
                Permission
              </th>
              {roles.map((role) => (
                <th key={role.id} className="px-4 py-3 text-xs font-semibold tracking-wider text-center text-gray-600 uppercase min-w-[100px]">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
              const filteredPerms = perms.filter((p) => existingPermNames.includes(p));
              if (filteredPerms.length === 0) return null;

              return [
                <tr key={`group-${group}`} className="bg-gray-50/50">
                  <td colSpan={roles.length + 1} className="px-4 py-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                    {group}
                  </td>
                </tr>,
                ...filteredPerms.map((perm) => (
                  <tr key={perm} className="hover:bg-blue-50/30">
                    <td className="sticky left-0 z-10 px-4 py-2 text-sm text-gray-700 bg-white">
                      {perm}
                    </td>
                    {roles.map((role) => {
                      const isAdmin = role.name === 'admin';
                      const hasIt = isAdmin || (rolePermissions[role.id] || []).includes(perm);

                      return (
                        <td key={role.id} className="px-4 py-2 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hasIt}
                              disabled={isAdmin}
                              onChange={() => togglePermission(role.id, perm)}
                              className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
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
