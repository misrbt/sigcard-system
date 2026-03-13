import { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  MdAdd, MdEdit, MdLockOpen, MdRefresh, MdSearch,
  MdToggleOn, MdToggleOff, MdLockReset, MdDelete,
  MdArrowUpward, MdArrowDownward, MdUnfoldMore,
  MdFileDownload, MdPeople, MdCheckCircle, MdBlock, MdLock,
} from 'react-icons/md';
import { adminService } from '../../services/adminService';
import Modal from '../../components/common/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

// ── UserForm (unchanged) ──────────────────────────────────────────────────────
const UserForm = ({
  isEdit, formData, formErrors, handleFormChange,
  handleRoleChange, setFormData, branches, roles, submitting, onCancel, onSubmit,
}) => (
  <div className="space-y-5">
    {formErrors.general && (
      <div className="px-4 py-3 text-base text-red-700 bg-red-50 border border-red-200 rounded-lg">
        {formErrors.general}
      </div>
    )}
    <div className="grid grid-cols-2 gap-4">
      <Input label="First Name" name="firstname" value={formData.firstname} onChange={handleFormChange} error={formErrors.firstname?.[0]} required />
      <Input label="Last Name"  name="lastname"  value={formData.lastname}  onChange={handleFormChange} error={formErrors.lastname?.[0]}  required />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Input label="Username" name="username" value={formData.username} onChange={handleFormChange} error={formErrors.username?.[0]} required />
      <Input label="Email" type="email" name="email" value={formData.email} onChange={handleFormChange} error={formErrors.email?.[0]} required />
    </div>
    {isEdit && (
      <Input label="New Password (leave blank to keep current)" name="password" value={formData.password || ''} onChange={handleFormChange} error={formErrors.password?.[0]} showPasswordToggle />
    )}
    <div className="grid grid-cols-2 gap-4">
      <Select label="Branch" name="branch_id" value={formData.branch_id} onChange={handleFormChange} placeholder="Select branch" options={branches.map((b) => ({ value: b.id, label: b.branch_name }))} error={formErrors.branch_id?.[0]} required />
      <Select label="Status" name="status" value={formData.status} onChange={handleFormChange} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }]} />
    </div>
    <Input label="Account Expires At (optional)" type="date" name="account_expires_at" value={formData.account_expires_at || ''} onChange={handleFormChange} error={formErrors.account_expires_at?.[0]} />
    <div className="space-y-1">
      <label className="block text-base font-semibold text-gray-700">Role</label>
      {formErrors.roles && <p className="text-sm text-red-600">{formErrors.roles[0]}</p>}
      <select value={formData.roles?.[0] || ''} onChange={handleRoleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#1877F2] transition-colors">
        <option value="">Select a role</option>
        {roles.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
      </select>
    </div>
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div className={`relative w-10 h-6 rounded-full transition-colors ${formData.two_factor_enabled ? 'bg-[#1877F2]' : 'bg-gray-300'}`}
        onClick={() => setFormData((prev) => ({ ...prev, two_factor_enabled: !prev.two_factor_enabled }))}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${formData.two_factor_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
      <span className="text-base text-gray-700 font-medium">Enable Two-Factor Authentication</span>
    </label>
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" onClick={onSubmit} loading={submitting}>{isEdit ? 'Update User' : 'Create User'}</Button>
    </div>
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  firstname: '', lastname: '', username: '', email: '',
  branch_id: '', status: 'active', roles: [],
  two_factor_enabled: false, account_expires_at: '',
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

const STATUS_STYLE = {
  active:    'bg-emerald-100 text-emerald-700',
  inactive:  'bg-gray-100 text-gray-500',
  suspended: 'bg-red-100 text-red-600',
};

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const SortIcon = ({ col, sort }) => {
  if (sort.col !== col) return <MdUnfoldMore className="w-3.5 h-3.5 text-gray-300 ml-0.5" />;
  return sort.dir === 'asc'
    ? <MdArrowUpward   className="w-3.5 h-3.5 text-[#1877F2] ml-0.5" />
    : <MdArrowDownward className="w-3.5 h-3.5 text-[#1877F2] ml-0.5" />;
};

const SkeletonRows = ({ perPage }) => (
  <>
    {[...Array(Math.min(perPage, 8))].map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td className="px-4 py-3"><div className="h-3 w-6 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3">
          <div className="h-3.5 w-32 bg-gray-100 rounded mb-1.5" />
          <div className="h-2.5 w-20 bg-gray-100 rounded" />
        </td>
        <td className="px-4 py-3"><div className="h-3 w-36 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-100 rounded-full" /></td>
        <td className="px-4 py-3"><div className="h-3 w-24 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3"><div className="h-5 w-14 bg-gray-100 rounded-full" /></td>
        <td className="px-4 py-3"><div className="h-3 w-20 bg-gray-100 rounded" /></td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, j) => <div key={j} className="h-7 w-7 bg-gray-100 rounded-lg" />)}
          </div>
        </td>
      </tr>
    ))}
  </>
);

// ── Main Component ────────────────────────────────────────────────────────────
const UserManagement = () => {
  const [users, setUsers]           = useState([]);
  const [meta, setMeta]             = useState({ total_active: 0, total_inactive: 0, total_suspended: 0, total_locked: 0 });
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ search: '', status: '', role: '', branch_id: '' });
  const [sort, setSort]             = useState({ col: 'created_at', dir: 'desc' });
  const [perPage, setPerPage]       = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  const [roles, setRoles]     = useState([]);
  const [branches, setBranches] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);
  const [showResetModal, setShowResetModal]   = useState(false);
  const [selectedUser, setSelectedUser]       = useState(null);
  const [formData, setFormData]               = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]           = useState({});
  const [submitting, setSubmitting]           = useState(false);

  // Debounce search
  const searchTimer = useRef(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: perPage,
        sort_by:  sort.col,
        sort_dir: sort.dir,
      };
      if (filters.search)    params.search    = filters.search;
      if (filters.status)    params.status    = filters.status;
      if (filters.role)      params.role      = filters.role;
      if (filters.branch_id) params.branch_id = filters.branch_id;

      const res = await adminService.getUsers(params);
      setUsers(res.data.data.data || []);
      setMeta(res.data.meta || { total_active: 0, total_inactive: 0, total_suspended: 0, total_locked: 0 });
      const pg = res.data.data;
      setPagination({ current_page: pg.current_page, last_page: pg.last_page, total: pg.total, from: pg.from ?? 0, to: pg.to ?? 0 });
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, [filters, sort, perPage]);

  useEffect(() => { fetchUsers(currentPage); }, [fetchUsers, currentPage]);

  // Reset to page 1 when filters/sort/perPage change
  useEffect(() => { setCurrentPage(1); }, [filters, sort, perPage]);

  useEffect(() => {
    Promise.all([adminService.getRoles(), adminService.getBranches()])
      .then(([rolesRes, branchesRes]) => {
        setRoles(rolesRes.data.data || []);
        setBranches(branchesRes.data.data || []);
      })
      .catch(console.error);
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'search') {
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        setFilters((prev) => ({ ...prev, search: value }));
      }, 350);
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSort = (col) => {
    setSort((prev) => prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }
    );
  };

  const resetFilters = () => {
    setFilters({ search: '', status: '', role: '', branch_id: '' });
    setSort({ col: 'created_at', dir: 'desc' });
    document.querySelector('input[name="search"]').value = '';
  };

  // ── Form helpers ────────────────────────────────────────────────────────────
  const resetForm    = () => { setFormData(EMPTY_FORM); setFormErrors({}); };
  const openCreate   = () => setShowCreateModal(true);
  const closeCreate  = () => { setShowCreateModal(false); resetForm(); };

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      firstname: user.firstname || '', lastname: user.lastname || '',
      username: user.username || '', email: user.email || '',
      branch_id: user.branch_id || '', status: user.status || 'active',
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
    setFormData((prev) => ({ ...prev, roles: e.target.value ? [e.target.value] : [] }));
  };

  // ── CRUD actions ────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.account_expires_at) delete payload.account_expires_at;
      await adminService.createUser(payload);
      closeCreate();
      fetchUsers(1);
      Swal.fire({ icon: 'success', title: 'User Created!', text: `${payload.firstname} ${payload.lastname} has been created.`, confirmButtonColor: '#1877F2', timer: 4000, timerProgressBar: true });
    } catch (err) {
      setFormErrors(err.response?.data?.errors || { general: err.response?.data?.message || 'Failed to create user.' });
    } finally { setSubmitting(false); }
  };

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password;
      if (!payload.account_expires_at) delete payload.account_expires_at;
      await adminService.updateUser(selectedUser.id, payload);
      setShowEditModal(false);
      fetchUsers(currentPage);
      Swal.fire({ icon: 'success', title: 'User Updated!', text: `${payload.firstname} ${payload.lastname} has been updated.`, confirmButtonColor: '#1877F2', timer: 4000, timerProgressBar: true });
    } catch (err) {
      setFormErrors(err.response?.data?.errors || { general: err.response?.data?.message || 'Failed to update user.' });
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete User?',
      html: `<p>This will permanently delete <strong>${user.firstname} ${user.lastname}</strong>.<br/>This action cannot be undone.</p>`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await adminService.deleteUser(user.id);
      fetchUsers(currentPage);
      Swal.fire({ icon: 'success', title: 'Deleted', text: `${user.firstname} ${user.lastname} has been removed.`, confirmButtonColor: '#1877F2', timer: 3000, timerProgressBar: true });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message || 'Delete failed.', confirmButtonColor: '#1877F2' });
    }
  };

  const handleToggleStatus = async (user) => {
    const isActive = user.status === 'active';
    const result = await Swal.fire({
      icon: 'warning',
      title: isActive ? 'Deactivate User?' : 'Activate User?',
      text: `${user.firstname} ${user.lastname}`,
      showCancelButton: true,
      confirmButtonColor: isActive ? '#ef4444' : '#1877F2',
      cancelButtonColor: '#6b7280',
      confirmButtonText: isActive ? 'Deactivate' : 'Activate',
    });
    if (!result.isConfirmed) return;
    try {
      isActive ? await adminService.deactivateUser(user.id) : await adminService.activateUser(user.id);
      fetchUsers(currentPage);
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message || 'Status change failed.', confirmButtonColor: '#1877F2' });
    }
  };

  const handleUnlock = async (user) => {
    try {
      await adminService.unlockUser(user.id);
      fetchUsers(currentPage);
      Swal.fire({ icon: 'success', title: 'Account Unlocked', text: `${user.firstname} ${user.lastname} can now log in.`, confirmButtonColor: '#1877F2', timer: 3000, timerProgressBar: true });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message || 'Unlock failed.', confirmButtonColor: '#1877F2' });
    }
  };

  const handleResetPassword = async () => {
    setSubmitting(true);
    try {
      await adminService.resetPassword(selectedUser.id, {});
      setShowResetModal(false);
      const name = `${selectedUser.firstname} ${selectedUser.lastname}`;
      setSelectedUser(null);
      Swal.fire({ icon: 'success', title: 'Password Reset!', text: `Password for ${name} has been reset.`, confirmButtonColor: '#1877F2', timer: 4000, timerProgressBar: true });
    } catch (err) {
      setFormErrors({ general: err.response?.data?.message || 'Failed to reset password.' });
    } finally { setSubmitting(false); }
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['#', 'First Name', 'Last Name', 'Username', 'Email', 'Role', 'Branch', 'Status', 'Joined'];
    const rows = users.map((u, i) => [
      (pagination.from || 0) + i,
      u.firstname, u.lastname, u.username, u.email,
      u.roles?.map((r) => r.name).join('; ') || '',
      u.branch?.branch_name || '',
      u.status,
      u.created_at ? new Date(u.created_at).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Pagination helpers ──────────────────────────────────────────────────────
  const goToPage = (page) => {
    if (page < 1 || page > pagination.last_page) return;
    setCurrentPage(page);
  };

  const buildPages = () => {
    const total = pagination.last_page;
    const cur   = pagination.current_page;
    const max   = 7;
    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, cur]);
    for (let d = 1; d <= 2; d++) { if (cur - d > 0) pages.add(cur - d); if (cur + d <= total) pages.add(cur + d); }
    return [...pages].sort((a, b) => a - b);
  };

  const sharedFormProps = { formData, formErrors, handleFormChange, handleRoleChange, setFormData, branches, roles, submitting };

  const SORT_COL = { name: 'firstname', email: 'email', status: 'status', joined: 'created_at' };

  const thClass = (col) =>
    `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider select-none ${col ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''} ${sort.col === SORT_COL[col] ? 'text-[#1877F2] bg-blue-50/60' : 'text-gray-500'}`;

  return (
    <div className="space-y-5">

      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #1877F2 0%, transparent 60%)' }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">User Management</h1>
            <p className="mt-1 text-sm text-blue-200">Manage user accounts, roles, and permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-colors">
              <MdFileDownload className="w-5 h-5" />
              Export CSV
            </button>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#0f4fc5] text-white text-sm font-semibold shadow-lg transition-colors">
              <MdAdd className="w-5 h-5" />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: MdPeople,       label: 'Total Users',    value: pagination.total,        color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { icon: MdCheckCircle,  label: 'Active',         value: meta.total_active,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: MdBlock,        label: 'Inactive / Susp',value: (meta.total_inactive ?? 0) + (meta.total_suspended ?? 0), color: 'text-gray-500', bg: 'bg-gray-50' },
          { icon: MdLock,         label: 'Locked',         value: meta.total_locked,        color: 'text-yellow-600',  bg: 'bg-yellow-50'  },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white shadow-sm`}>
            <div className={`p-2 rounded-xl ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-extrabold text-gray-800 leading-tight">{value ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-end gap-3 px-4 py-3.5 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="search"
              defaultValue={filters.search}
              onChange={handleFilterChange}
              placeholder="Search name, email, username…"
              className="w-full pl-10 pr-4 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1877F2] transition-colors"
            />
          </div>
        </div>
        <Select name="status" value={filters.status} onChange={handleFilterChange} placeholder="All Status"
          options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }]} />
        <Select name="role" value={filters.role} onChange={handleFilterChange} placeholder="All Roles"
          options={roles.map((r) => ({ value: r.name, label: r.name }))} />
        <Select name="branch_id" value={filters.branch_id} onChange={handleFilterChange} placeholder="All Branches"
          options={branches.map((b) => ({ value: b.id, label: b.branch_name }))} />
        <button onClick={resetFilters} className="p-2.5 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" title="Reset filters">
          <MdRefresh className="w-5 h-5" />
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
          <p className="text-xs text-gray-500">
            {loading ? 'Loading…' : `Showing ${pagination.from ?? 0}–${pagination.to ?? 0} of ${pagination.total} users`}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
            >
              {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-10">#</th>
                <th className={thClass('name')} onClick={() => handleSort(SORT_COL.name)}>
                  <span className="flex items-center">Name <SortIcon col={SORT_COL.name} sort={sort} /></span>
                </th>
                <th className={thClass('email')} onClick={() => handleSort(SORT_COL.email)}>
                  <span className="flex items-center">Email <SortIcon col={SORT_COL.email} sort={sort} /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                <th className={thClass('status')} onClick={() => handleSort(SORT_COL.status)}>
                  <span className="flex items-center">Status <SortIcon col={SORT_COL.status} sort={sort} /></span>
                </th>
                <th className={thClass('joined')} onClick={() => handleSort(SORT_COL.joined)}>
                  <span className="flex items-center">Joined <SortIcon col={SORT_COL.joined} sort={sort} /></span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <SkeletonRows perPage={perPage} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <MdPeople className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-400">No users found</p>
                    <p className="text-xs text-gray-300 mt-0.5">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                users.map((user, idx) => {
                  const isLocked = !!user.account_locked_at;
                  return (
                    <tr key={user.id} className={`transition-colors hover:bg-blue-50/30 ${isLocked ? 'bg-yellow-50/30' : ''}`}>
                      {/* # */}
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {(pagination.from ?? 0) + idx}
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1877F2] to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(user.firstname?.[0] ?? '').toUpperCase()}{(user.lastname?.[0] ?? '').toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#05173a] leading-tight">{user.firstname} {user.lastname}</p>
                            <p className="text-xs text-gray-400">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      {/* Role */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles?.length
                            ? user.roles.map((r) => (
                                <span key={r.name} className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-[#1877F2] font-medium border border-blue-100">{r.name}</span>
                              ))
                            : <span className="text-xs text-gray-400">—</span>}
                        </div>
                      </td>
                      {/* Branch */}
                      <td className="px-4 py-3 text-sm text-gray-600">{user.branch?.branch_name || '—'}</td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        {isLocked
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Locked</span>
                          : <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[user.status] ?? STATUS_STYLE.inactive}`}>{user.status}</span>
                        }
                      </td>
                      {/* Joined */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-600">{fmt(user.created_at)}</p>
                        {user.last_login_at && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Last: {fmt(user.last_login_at)}</p>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => openEdit(user)} className="p-1.5 rounded-lg text-[#1877F2] hover:bg-blue-50 transition-colors" title="Edit">
                            <MdEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedUser(user); setFormData({ new_password: '' }); setFormErrors({}); setShowResetModal(true); }}
                            className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 transition-colors" title="Reset Password"
                          >
                            <MdLockReset className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleStatus(user)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors" title={user.status === 'active' ? 'Deactivate' : 'Activate'}>
                            {user.status === 'active'
                              ? <MdToggleOn  className="w-5 h-5 text-emerald-500" />
                              : <MdToggleOff className="w-5 h-5" />}
                          </button>
                          {isLocked && (
                            <button onClick={() => handleUnlock(user)} className="p-1.5 rounded-lg text-yellow-600 hover:bg-yellow-50 transition-colors" title="Unlock">
                              <MdLockOpen className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => handleDelete(user)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors" title="Delete">
                            <MdDelete className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && pagination.last_page > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-xs text-gray-500">
              Page <span className="font-semibold">{pagination.current_page}</span> of <span className="font-semibold">{pagination.last_page}</span>
              {' '}· {pagination.total} total user{pagination.total !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              {/* First */}
              <button onClick={() => goToPage(1)} disabled={pagination.current_page === 1}
                className="px-2.5 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
                «
              </button>
              {/* Prev */}
              <button onClick={() => goToPage(pagination.current_page - 1)} disabled={pagination.current_page === 1}
                className="px-2.5 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
                ‹
              </button>

              {buildPages().reduce((acc, page, idx, arr) => {
                if (idx > 0 && page - arr[idx - 1] > 1) {
                  acc.push(<span key={`ellipsis-${page}`} className="px-1.5 text-gray-400 text-xs">…</span>);
                }
                acc.push(
                  <button key={page} onClick={() => goToPage(page)}
                    className={`min-w-[30px] px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      page === pagination.current_page
                        ? 'bg-[#1877F2] text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}>
                    {page}
                  </button>
                );
                return acc;
              }, [])}

              {/* Next */}
              <button onClick={() => goToPage(pagination.current_page + 1)} disabled={pagination.current_page === pagination.last_page}
                className="px-2.5 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
                ›
              </button>
              {/* Last */}
              <button onClick={() => goToPage(pagination.last_page)} disabled={pagination.current_page === pagination.last_page}
                className="px-2.5 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
                »
              </button>

              {/* Jump to page */}
              <span className="text-xs text-gray-400 ml-2">Go to:</span>
              <input
                type="number" min={1} max={pagination.last_page}
                defaultValue={pagination.current_page}
                key={pagination.current_page}
                onKeyDown={(e) => { if (e.key === 'Enter') goToPage(Number(e.target.value)); }}
                onBlur={(e) => goToPage(Number(e.target.value))}
                className="w-12 text-xs text-center border border-gray-200 rounded-lg py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <Modal isOpen={showCreateModal} onClose={closeCreate} onBackdropClose={() => setShowCreateModal(false)} title="Create New User" size="lg">
        <UserForm {...sharedFormProps} isEdit={false} onCancel={closeCreate} onSubmit={handleCreate} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" size="lg">
        <UserForm {...sharedFormProps} isEdit={true} onCancel={() => setShowEditModal(false)} onSubmit={handleUpdate} />
      </Modal>

      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Reset Password" size="sm">
        <div className="space-y-4">
          {formErrors.general && (
            <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{formErrors.general}</div>
          )}
          <p className="text-base text-gray-600">
            Reset password for <span className="font-semibold text-[#05173a]">{selectedUser?.firstname} {selectedUser?.lastname}</span>?
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowResetModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleResetPassword} loading={submitting}>Confirm Reset</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
