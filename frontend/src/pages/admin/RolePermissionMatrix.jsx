import { useState, useEffect, useRef, useMemo } from 'react';
import { MdSave, MdRefresh, MdAdd, MdDelete, MdClose, MdSearch } from 'react-icons/md';
import { FaShieldAlt, FaCheckSquare, FaRegSquare, FaUsers } from 'react-icons/fa';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';

// Canonical grouping for known permissions. Used to categorize whatever the backend API returns.
// Any backend permission NOT listed here automatically appears under "Other".
const STATIC_PERMISSION_GROUPS = {
  'User Management':     ['view-users', 'create-users', 'edit-users', 'delete-users', 'activate-users', 'deactivate-users', 'reset-user-passwords', 'unlock-user-accounts'],
  'Role Management':     ['view-roles', 'create-roles', 'edit-roles', 'delete-roles', 'assign-roles', 'view-permissions', 'assign-permissions'],
  'Customer Management': ['view-customers', 'create-customers', 'edit-customers', 'view-customer-documents'],
  'Audit':               ['view-audit-logs', 'export-audit-logs'],
  'Compliance':          ['view-compliance-reports', 'generate-compliance-reports', 'view-risk-assessments', 'create-risk-assessments', 'approve-risk-assessments'],
  'Reporting':           ['export-reports', 'view-regulatory-reports'],
  'System Admin':        ['view-system-settings', 'edit-system-settings', 'view-system-logs', 'backup-system', 'restore-system'],
  'Authentication':      ['force-password-reset', 'unlock-accounts', 'view-login-attempts', 'manage-sessions', 'enable-disable-2fa'],
  'Branch Operations':   ['view-branch-data', 'manage-branch-operations', 'view-branch-reports'],
};

// Build permission groups dynamically from backend API permissions.
// Returns only groups that have at least one permission in the backend.
// Any backend permission not in STATIC_PERMISSION_GROUPS goes into "Other".
const buildPermissionGroups = (backendPermissions) => {
  const backendNames = new Set(backendPermissions.map((p) => p.name));
  const groups = {};
  const assigned = new Set();

  Object.entries(STATIC_PERMISSION_GROUPS).forEach(([group, perms]) => {
    const inBackend = perms.filter((p) => backendNames.has(p));
    if (inBackend.length > 0) {
      groups[group] = inBackend;
      inBackend.forEach((p) => assigned.add(p));
    }
  });

  const unassigned = [...backendNames].filter((p) => !assigned.has(p));
  if (unassigned.length > 0) {
    groups['Other'] = unassigned;
  }

  return groups;
};

const PERMISSION_LABELS = {
  // User Management
  'view-users':                  'View Users',
  'create-users':                'Create Users',
  'edit-users':                  'Edit Users',
  'delete-users':                'Delete Users',
  'activate-users':              'Activate Users',
  'deactivate-users':            'Deactivate Users',
  'reset-user-passwords':        'Reset User Passwords',
  'unlock-user-accounts':        'Unlock User Accounts',
  // Role Management
  'view-roles':                  'View Roles',
  'create-roles':                'Create Roles',
  'edit-roles':                  'Edit Roles',
  'delete-roles':                'Delete Roles',
  'assign-roles':                'Assign Roles',
  'view-permissions':            'View Permissions',
  'assign-permissions':          'Assign Permissions',
  // Customer Management
  'view-customers':              'View Customer Profiles',
  'create-customers':            'Upload Signature Cards / Add Account',
  'edit-customers':              'Edit Customer Info / Edit Documents',
  'view-customer-documents':     'View Customer Documents',
  // Audit
  'view-audit-logs':             'View Audit Logs',
  'export-audit-logs':           'Export Audit Logs',
  // Compliance
  'view-compliance-reports':     'View Compliance Reports',
  'generate-compliance-reports': 'Generate Compliance Reports',
  'view-risk-assessments':       'View Risk Assessments',
  'create-risk-assessments':     'Create Risk Assessments',
  'approve-risk-assessments':    'Approve Risk Assessments',
  // Reporting
  'export-reports':              'Export Reports',
  'view-regulatory-reports':     'View Regulatory Reports (BSP)',
  // System Admin
  'view-system-settings':        'View System Settings',
  'edit-system-settings':        'Edit System Settings',
  'view-system-logs':            'View System Logs',
  'backup-system':               'Backup System',
  'restore-system':              'Restore System',
  // Authentication
  'force-password-reset':        'Force Password Reset',
  'unlock-accounts':             'Unlock Accounts',
  'view-login-attempts':         'View Login Attempts',
  'manage-sessions':             'Manage Sessions',
  'enable-disable-2fa':          'Enable / Disable 2FA',
  // Branch Operations
  'view-branch-data':            'View Branch Data',
  'manage-branch-operations':    'Manage Branch Operations',
  'view-branch-reports':         'View Branch Reports',
};

const PROTECTED_ROLES = ['admin', 'manager', 'user', 'cashier', 'compliance', 'audit'];

// ── ConfirmModal ──────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, onConfirm, onCancel, loading, confirmLabel = 'Confirm', danger = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
          {danger
            ? <MdDelete className="text-xl text-red-600" />
            : <FaShieldAlt className="text-blue-600" />}
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </div>
);

// ── CreateRoleModal ───────────────────────────────────────────────────────────
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MdAdd className="text-blue-600 text-xl" />
            <h2 className="text-base font-bold text-gray-900">Create New Role</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <MdClose className="text-xl" />
          </button>
        </div>
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
            <Button variant="primary" type="submit" loading={loading} leftIcon={<MdAdd />}>Create Role</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── UserPermissionsTab ────────────────────────────────────────────────────────
const UserPermissionsTab = ({ allPermissions, permissionGroups }) => {
  const { user: currentAuthUser, fetchUser } = useAuth();

  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState([]);
  const [searching, setSearching]       = useState(false);
  const [showDrop, setShowDrop]         = useState(false);
  const dropRef                         = useRef(null);

  const [user, setUser]                 = useState(null);
  const [rolePerms, setRolePerms]       = useState([]);
  const [pendingPerms, setPendingPerms] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [hasChanges, setHasChanges]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const existingPermNames = allPermissions.map((p) => p.name);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDrop(false); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await adminService.getUsers({ search: query.trim(), per_page: 10 });
        const list = res.data?.data?.data || [];
        setResults(list);
        setShowDrop(list.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]); // only query — not user

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    // typing a new search clears the current selection
    if (user) {
      setUser(null);
      setRolePerms([]);
      setPendingPerms([]);
      setHasChanges(false);
      setError('');
      setSuccess('');
    }
  };

  const loadUser = async (u) => {
    setShowDrop(false);
    setResults([]);
    setQuery(`${u.firstname} ${u.lastname}`);
    setLoadingPerms(true);
    setError('');
    setSuccess('');
    try {
      const res       = await adminService.getUserPermissions(u.id);
      const d         = res.data.data;
      setUser(u);
      setRolePerms(d.role_permissions || []);
      // pendingPerms = the full effective set the user currently has
      setPendingPerms([...(d.effective_permissions || [])]);
      setHasChanges(false);
    } catch {
      setError('Failed to load user permissions.');
    } finally {
      setLoadingPerms(false);
    }
  };

  const clearUser = () => {
    setUser(null);
    setQuery('');
    setRolePerms([]);
    setPendingPerms([]);
    setHasChanges(false);
    setError('');
    setSuccess('');
    setResults([]);
    setShowDrop(false);
  };

  const togglePerm = (perm) => {
    setPendingPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
    setHasChanges(true);
  };

  const toggleGroup = (groupPerms) => {
    const allChecked = groupPerms.every((p) => pendingPerms.includes(p));
    setPendingPerms((prev) =>
      allChecked
        ? prev.filter((p) => !groupPerms.includes(p))
        : [...new Set([...prev, ...groupPerms])]
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await adminService.syncUserPermissions(user.id, pendingPerms);
      setHasChanges(false);
      // If saving the currently logged-in user's permissions, refresh AuthContext
      // so sidebar, routes, and nav reflect the change immediately.
      if (currentAuthUser?.id === user.id) {
        await fetchUser();
      }
      setSuccess('User permissions saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const roleLabel   = user?.roles?.[0]?.name ?? '—';
  const branchLabel = user?.branch?.branch_name ?? '—';

  return (
    <div className="space-y-5">

      {/* User search */}
      <div className="relative max-w-lg" ref={dropRef}>
        <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => results.length > 0 && setShowDrop(true)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {(query || user) && (
            <button
              onClick={clearUser}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <MdClose className="text-lg" />
            </button>
          )}
        </div>
        {searching && <p className="mt-1 text-xs text-gray-400">Searching…</p>}
        {showDrop && results.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.map((u) => (
              <button
                key={u.id}
                onMouseDown={() => loadUser(u)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
              >
                <p className="text-sm font-medium text-gray-800">{u.firstname} {u.lastname}</p>
                <p className="text-xs text-gray-500">{u.email} · <span className="capitalize">{u.roles?.[0]?.name ?? '—'}</span></p>
              </button>
            ))}
          </div>
        )}
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

      {/* Empty state */}
      {!user && !loadingPerms && (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-200 rounded-xl bg-gray-50">
          <FaUsers className="text-5xl text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Search for a user to manage their permissions</p>
          <p className="text-xs text-gray-400 mt-1">Check or uncheck permissions to grant or restrict access for this user. Role permissions can be blocked individually.</p>
        </div>
      )}

      {/* Loading */}
      {loadingPerms && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
        </div>
      )}

      {/* User card + permission matrix */}
      {user && !loadingPerms && (
        <>
          {/* User info card */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-blue-700 uppercase">
                {user.firstname?.[0]}{user.lastname?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{user.firstname} {user.lastname}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full capitalize">{roleLabel}</span>
              <span className="px-2 py-0.5 text-xs text-gray-500 bg-gray-100 rounded-full">{branchLabel}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>{user.status}</span>
            </div>
          </div>

          {/* Legend + action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-5 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-blue-500 inline-flex items-center justify-center flex-shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                From role
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-green-100 border border-green-400 inline-block flex-shrink-0" />
                Direct grant
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-red-100 border border-red-400 inline-block flex-shrink-0" />
                Blocked (role permission denied)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const fromRole = pendingPerms.filter(p => rolePerms.includes(p)).length;
                const direct   = pendingPerms.filter(p => !rolePerms.includes(p)).length;
                const blocked  = rolePerms.filter(p => !pendingPerms.includes(p)).length;
                return (
                  <p className="text-xs text-gray-500 mr-1">
                    {fromRole} from role · {direct} direct · {blocked} blocked
                  </p>
                );
              })()}
              <button
                onClick={() => { setPendingPerms([...existingPermNames]); setHasChanges(true); }}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
              >
                Grant All
              </button>
              <button
                onClick={() => { setPendingPerms([]); setHasChanges(true); }}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
              >
                Revoke All
              </button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                disabled={!hasChanges}
                leftIcon={<MdSave className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </div>

          {/* Permission matrix */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d]">
                  <th className="sticky left-0 z-10 px-4 py-3 text-xs font-semibold tracking-wider text-left text-white/60 uppercase bg-[#01060f] min-w-[240px]">
                    Permission
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-white/60 uppercase tracking-wider min-w-[120px]">
                    Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider min-w-[160px]">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {Object.entries(permissionGroups).map(([group, perms]) => {
                  const allChecked  = perms.every((p) => pendingPerms.includes(p));
                  const someChecked = perms.some((p) => pendingPerms.includes(p)) && !allChecked;

                  return [
                    <tr key={`g-${group}`} className="bg-gray-50">
                      <td className="sticky left-0 z-10 px-4 py-2 text-xs font-bold tracking-wider text-gray-500 uppercase bg-gray-50">
                        {group}
                        <span className="ml-2 font-normal text-gray-400 normal-case">({perms.length})</span>
                      </td>
                      <td className="px-6 py-2 text-center bg-gray-50">
                        <button
                          onClick={() => toggleGroup(perms)}
                          title={allChecked ? 'Remove all in group' : 'Grant all in group'}
                          className="transition-colors hover:text-blue-600"
                        >
                          {allChecked
                            ? <FaCheckSquare className="text-blue-500 text-base mx-auto" />
                            : someChecked
                            ? <FaCheckSquare className="text-blue-300 text-base mx-auto" />
                            : <FaRegSquare className="text-gray-300 text-base mx-auto" />}
                        </button>
                      </td>
                      <td className="px-6 py-2 bg-gray-50" />
                    </tr>,

                    ...perms.map((perm) => {
                      const fromRole   = rolePerms.includes(perm);
                      const isEffective = pendingPerms.includes(perm);

                      let sourceBadge = null;
                      if (isEffective && fromRole) {
                        sourceBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-blue-100 text-blue-700 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                            via role
                          </span>
                        );
                      } else if (isEffective && !fromRole) {
                        sourceBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-green-100 text-green-700 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            direct
                          </span>
                        );
                      } else if (!isEffective && fromRole) {
                        sourceBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-red-100 text-red-700 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            blocked
                          </span>
                        );
                      }

                      return (
                        <tr key={perm} className="hover:bg-blue-50/30 transition-colors">
                          <td className="sticky left-0 z-10 px-4 py-2.5 bg-white border-r border-gray-100 pl-6">
                            <p className="text-sm font-medium text-gray-800">{PERMISSION_LABELS[perm] ?? perm}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{perm}</p>
                          </td>
                          <td className="px-6 py-2 text-center">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isEffective}
                                onChange={() => togglePerm(perm)}
                                className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                              />
                            </label>
                          </td>
                          <td className="px-6 py-2">
                            {sourceBadge}
                          </td>
                        </tr>
                      );
                    }),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const RolePermissionMatrix = () => {
  const { fetchUser } = useAuth();

  const [activeTab, setActiveTab]             = useState('roles');
  const [roles, setRoles]                     = useState([]);
  const [allPermissions, setAllPermissions]   = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [hasChanges, setHasChanges]           = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState('');

  const [showCreateRole, setShowCreateRole]     = useState(false);
  const [roleToDelete, setRoleToDelete]         = useState(null);
  const [deletingRole, setDeletingRole]         = useState(false);
  const [showSaveConfirm, setShowSaveConfirm]   = useState(false);

  const existingPermNames = allPermissions.map((p) => p.name);

  // Built dynamically from the backend API response — always in sync with what the server has.
  const permissionGroups = useMemo(() => buildPermissionGroups(allPermissions), [allPermissions]);

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

  const toggleAllForRole = (roleId) => {
    const current    = rolePermissions[roleId] || [];
    const allChecked = existingPermNames.every((p) => current.includes(p));
    setRolePermissions((prev) => ({ ...prev, [roleId]: allChecked ? [] : [...existingPermNames] }));
    setHasChanges(true);
  };

  const togglePermission = (roleId, permName) => {
    setRolePermissions((prev) => {
      const perms   = prev[roleId] || [];
      const updated = perms.includes(permName)
        ? perms.filter((p) => p !== permName)
        : [...perms, permName];
      return { ...prev, [roleId]: updated };
    });
    setHasChanges(true);
  };

  const toggleGroupForRole = (roleId, groupPerms) => {
    const available  = groupPerms.filter((p) => existingPermNames.includes(p));
    const current    = rolePermissions[roleId] || [];
    const allChecked = available.every((p) => current.includes(p));
    setRolePermissions((prev) => {
      const perms   = prev[roleId] || [];
      const updated = allChecked
        ? perms.filter((p) => !available.includes(p))
        : [...new Set([...perms, ...available])];
      return { ...prev, [roleId]: updated };
    });
    setHasChanges(true);
  };

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
      // Refresh the current user's permissions in AuthContext so the sidebar
      // and ProtectedRoute immediately reflect the updated role permissions.
      await fetchUser();
      setSuccess('Permissions saved successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save permissions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleCreated = async (roleName) => {
    setShowCreateRole(false);
    await fetchData();
    setSuccess(`Role "${roleName}" created successfully.`);
    setTimeout(() => setSuccess(''), 3000);
  };

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
      setError(err?.response?.data?.message || 'Failed to delete role.');
      setRoleToDelete(null);
    } finally {
      setDeletingRole(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Modals */}
      {showCreateRole && (
        <CreateRoleModal onClose={() => setShowCreateRole(false)} onCreated={handleRoleCreated} />
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
            {roles.length} roles · {allPermissions.length} permissions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchData} leftIcon={<MdRefresh className="w-4 h-4" />}>
            Refresh
          </Button>
          {activeTab === 'roles' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'roles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaShieldAlt className="text-xs" />
          Role Matrix
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FaUsers className="text-xs" />
          User Permissions
        </button>
      </div>

      {/* ── Role Matrix Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <>
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

          <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
            <table className="min-w-full">
              <thead>
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
                {Object.entries(permissionGroups).map(([group, perms]) => (
                  [
                    <tr key={`group-${group}`} className="bg-gray-50">
                      <td className="sticky left-0 z-10 px-4 py-2 text-xs font-bold tracking-wider text-gray-500 uppercase bg-gray-50">
                        {group}
                        <span className="ml-2 font-normal text-gray-400 normal-case">({perms.length})</span>
                      </td>
                      {roles.map((role) => {
                        const current     = rolePermissions[role.id] || [];
                        const allChecked  = perms.every((p) => current.includes(p));
                        const someChecked = perms.some((p) => current.includes(p)) && !allChecked;
                        return (
                          <td key={role.id} className="px-4 py-2 text-center bg-gray-50">
                            <button
                              onClick={() => toggleGroupForRole(role.id, perms)}
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
                    ...perms.map((perm) => (
                      <tr key={perm} className="hover:bg-blue-50/30 transition-colors">
                        <td className="sticky left-0 z-10 px-4 py-2.5 bg-white border-r border-gray-100 pl-6">
                          <p className="text-sm font-medium text-gray-800">{PERMISSION_LABELS[perm] ?? perm}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{perm}</p>
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
                  ]
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── User Permissions Tab ────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <UserPermissionsTab allPermissions={allPermissions} permissionGroups={permissionGroups} />
      )}
    </div>
  );
};

export default RolePermissionMatrix;
