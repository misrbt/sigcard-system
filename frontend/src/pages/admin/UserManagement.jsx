import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdEdit, MdLockOpen, MdRefresh, MdSearch,
  MdToggleOn, MdToggleOff, MdLockReset,
} from 'react-icons/md';
import { adminService } from '../../services/adminService';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Modal from '../../components/common/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

// ── Extracted outside parent to prevent remount on every keystroke ────────────
const UserForm = ({
  isEdit,
  formData,
  formErrors,
  handleFormChange,
  handleRoleChange,
  setFormData,
  branches,
  roles,
  submitting,
  onCancel,
  onSubmit,
}) => (
  <div className="space-y-5">
    {formErrors.general && (
      <div className="px-4 py-3 text-base text-red-700 bg-red-50 border border-red-200 rounded-lg">
        {formErrors.general}
      </div>
    )}

    {/* Name row */}
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="First Name"
        name="firstname"
        value={formData.firstname}
        onChange={handleFormChange}
        error={formErrors.firstname?.[0]}
        required
      />
      <Input
        label="Last Name"
        name="lastname"
        value={formData.lastname}
        onChange={handleFormChange}
        error={formErrors.lastname?.[0]}
        required
      />
    </div>

    {/* Username / Email */}
    <div className="grid grid-cols-2 gap-4">
      <Input
        label="Username"
        name="username"
        value={formData.username}
        onChange={handleFormChange}
        error={formErrors.username?.[0]}
        required
      />
      <Input
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={handleFormChange}
        error={formErrors.email?.[0]}
        required
      />
    </div>

    {/* Password change (edit only) */}
    {!isEdit ? null : (
      <Input
        label="New Password (leave blank to keep current)"
        name="password"
        value={formData.password || ''}
        onChange={handleFormChange}
        error={formErrors.password?.[0]}
        showPasswordToggle
      />
    )}

    {/* Branch / Status */}
    <div className="grid grid-cols-2 gap-4">
      <Select
        label="Branch"
        name="branch_id"
        value={formData.branch_id}
        onChange={handleFormChange}
        placeholder="Select branch"
        options={branches.map((b) => ({ value: b.id, label: b.branch_name }))}
        error={formErrors.branch_id?.[0]}
        required
      />
      <Select
        label="Status"
        name="status"
        value={formData.status}
        onChange={handleFormChange}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'suspended', label: 'Suspended' },
        ]}
      />
    </div>

    {/* Account Expires */}
    <Input
      label="Account Expires At (optional)"
      type="date"
      name="account_expires_at"
      value={formData.account_expires_at || ''}
      onChange={handleFormChange}
      error={formErrors.account_expires_at?.[0]}
    />

    {/* Role */}
    <div className="space-y-1">
      <label className="block text-base font-semibold text-gray-700">Role</label>
      {formErrors.roles && (
        <p className="text-sm text-red-600">{formErrors.roles[0]}</p>
      )}
      <select
        value={formData.roles?.[0] || ''}
        onChange={handleRoleChange}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#1877F2] transition-colors"
      >
        <option value="">Select a role</option>
        {roles.map((role) => (
          <option key={role.id} value={role.name}>{role.name}</option>
        ))}
      </select>
    </div>

    {/* 2FA toggle */}
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        className={`relative w-10 h-6 rounded-full transition-colors ${
          formData.two_factor_enabled ? 'bg-[#1877F2]' : 'bg-gray-300'
        }`}
        onClick={() =>
          setFormData((prev) => ({ ...prev, two_factor_enabled: !prev.two_factor_enabled }))
        }
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            formData.two_factor_enabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </div>
      <span className="text-base text-gray-700 font-medium">Enable Two-Factor Authentication</span>
    </label>

    {/* Actions */}
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onSubmit} loading={submitting}>
        {isEdit ? 'Update User' : 'Create User'}
      </Button>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', role: '', branch_id: '' });
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: 15 };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.role) params.role = filters.role;
      if (filters.branch_id) params.branch_id = filters.branch_id;

      const res = await adminService.getUsers(params);
      setUsers(res.data.data.data || []);
      const pg = res.data.data;
      setPagination({ current_page: pg.current_page, last_page: pg.last_page, total: pg.total, from: pg.from, to: pg.to });
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesRes, branchesRes] = await Promise.all([
          adminService.getRoles(),
          adminService.getBranches(),
        ]);
        setRoles(rolesRes.data.data || []);
        setBranches(branchesRes.data.data || []);
      } catch (err) {
        console.error('Failed to load roles/branches', err);
      }
    };
    loadData();
  }, []);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const emptyForm = {
    firstname: '',
    lastname: '',
    username: '',
    email: '',
    branch_id: '',
    status: 'active',
    roles: [],
    two_factor_enabled: false,
    account_expires_at: '',
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setFormErrors({});
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      username: user.username || '',
      email: user.email || '',
      branch_id: user.branch_id || '',
      status: user.status || 'active',
      roles: user.roles?.map((r) => r.name) || [],
      two_factor_enabled: user.two_factor_enabled || false,
      account_expires_at: user.account_expires_at ? user.account_expires_at.substring(0, 10) : '',
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleRoleChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, roles: value ? [value] : [] }));
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.account_expires_at) delete payload.account_expires_at;
      await adminService.createUser(payload);
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      setFormErrors(err.response?.data?.errors || { general: err.response?.data?.message || 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      if (!payload.account_expires_at) delete payload.account_expires_at;
      await adminService.updateUser(selectedUser.id, payload);
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      setFormErrors(err.response?.data?.errors || { general: err.response?.data?.message || 'Failed to update user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      if (user.status === 'active') {
        await adminService.deactivateUser(user.id);
      } else {
        await adminService.activateUser(user.id);
      }
      fetchUsers();
    } catch (err) {
      console.error('Status toggle failed', err);
    }
  };

  const handleUnlock = async (user) => {
    try {
      await adminService.unlockUser(user.id);
      fetchUsers();
    } catch (err) {
      console.error('Unlock failed', err);
    }
  };

  const handleResetPassword = async () => {
    setSubmitting(true);
    try {
      await adminService.resetPassword(selectedUser.id, {});
      setShowResetModal(false);
      setSelectedUser(null);
    } catch (err) {
      setFormErrors({ general: err.response?.data?.message || 'Failed to reset password' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status, lockedAt) => {
    if (lockedAt) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Locked</span>;
    }
    const map = {
      active:    'bg-emerald-100 text-emerald-700',
      inactive:  'bg-gray-100 text-gray-500',
      suspended: 'bg-red-100 text-red-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.inactive}`}>
        {status}
      </span>
    );
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-[#05173a] text-base">{row.firstname} {row.lastname}</p>
          <p className="text-sm text-gray-400">@{row.username}</p>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (_, row) => <span className="text-sm text-gray-600">{row.email}</span> },
    {
      key: 'role',
      label: 'Role',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.length
            ? row.roles.map((r) => (
                <span key={r.name} className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-[#1877F2] font-medium border border-blue-100">
                  {r.name}
                </span>
              ))
            : <span className="text-xs text-gray-400">—</span>}
        </div>
      ),
    },
    { key: 'branch', label: 'Branch', render: (_, row) => <span className="text-sm text-gray-600">{row.branch?.branch_name || '—'}</span> },
    { key: 'status', label: 'Status', render: (_, row) => statusBadge(row.status, row.account_locked_at) },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg text-[#1877F2] hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <MdEdit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(row);
              setFormData({ new_password: '' });
              setFormErrors({});
              setShowResetModal(true);
            }}
            className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
            title="Reset Password"
          >
            <MdLockReset className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleStatus(row); }}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
            title={row.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {row.status === 'active'
              ? <MdToggleOn className="w-5 h-5 text-emerald-500" />
              : <MdToggleOff className="w-5 h-5" />}
          </button>
          {row.account_locked_at && (
            <button
              onClick={(e) => { e.stopPropagation(); handleUnlock(row); }}
              className="p-1.5 rounded-lg text-yellow-600 hover:bg-yellow-50 transition-colors"
              title="Unlock Account"
            >
              <MdLockOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const sharedFormProps = {
    formData,
    formErrors,
    handleFormChange,
    handleRoleChange,
    setFormData,
    branches,
    roles,
    submitting,
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-6 shadow-xl">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #1877F2 0%, transparent 60%)' }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">User Management</h1>
            <p className="mt-1.5 text-base text-blue-200">Manage user accounts, roles, and permissions</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1877F2] hover:bg-[#0f4fc5] text-white text-base font-semibold shadow-lg transition-colors"
          >
            <MdAdd className="w-6 h-6" />
            Create User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name, email, username..."
              className="w-full pl-10 pr-4 py-3 text-base text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#1877F2] transition-colors"
            />
          </div>
        </div>
        <Select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          placeholder="All Status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
        <Select
          name="role"
          value={filters.role}
          onChange={handleFilterChange}
          placeholder="All Roles"
          options={roles.map((r) => ({ value: r.name, label: r.name }))}
        />
        <Select
          name="branch_id"
          value={filters.branch_id}
          onChange={handleFilterChange}
          placeholder="All Branches"
          options={branches.map((b) => ({ value: b.id, label: b.branch_name }))}
        />
        <button
          onClick={() => setFilters({ search: '', status: '', role: '', branch_id: '' })}
          className="p-2.5 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          title="Reset filters"
        >
          <MdRefresh className="w-5 h-5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#1877F2] rounded-full animate-spin border-t-transparent" />
          </div>
        ) : (
          <>
            <Table columns={columns} data={users} emptyMessage="No users found" />
            <div className="px-4 py-3 border-t border-gray-100">
              <Pagination
                currentPage={pagination.current_page}
                lastPage={pagination.last_page}
                total={pagination.total}
                from={pagination.from}
                to={pagination.to}
                onPageChange={(page) => fetchUsers(page)}
              />
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New User" size="lg">
        <UserForm
          {...sharedFormProps}
          isEdit={false}
          onCancel={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" size="lg">
        <UserForm
          {...sharedFormProps}
          isEdit={true}
          onCancel={() => setShowEditModal(false)}
          onSubmit={handleUpdate}
        />
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Reset Password" size="sm">
        <div className="space-y-4">
          {formErrors.general && (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {formErrors.general}
            </div>
          )}
          <p className="text-base text-gray-600">
            Reset password for{' '}
            <span className="font-semibold text-[#05173a]">
              {selectedUser?.firstname} {selectedUser?.lastname}
            </span>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowResetModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleResetPassword} loading={submitting}>
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
