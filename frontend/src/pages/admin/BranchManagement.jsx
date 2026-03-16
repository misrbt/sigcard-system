import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import {
  MdAdd, MdEdit, MdDelete, MdSearch, MdRefresh,
  MdBusiness, MdPeople, MdPersonSearch, MdAccountTree,
  MdExpandMore, MdExpandLess, MdArrowForward,
} from 'react-icons/md';
import { adminService } from '../../services/adminService';
import Modal from '../../components/common/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

// ── Branch Form ───────────────────────────────────────────────────────────────
const BranchForm = ({ isEdit, formData, formErrors, onChange, branches, submitting, onCancel, onSubmit }) => {
  const parentOptions = branches
    .filter((b) => b.id !== formData.id && !b.parent_id)
    .map((b) => ({ value: b.id, label: b.branch_name }));

  return (
    <div className="space-y-5">
      {formErrors.general && (
        <div className="px-4 py-3 text-base text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {formErrors.general}
        </div>
      )}
      <Input label="Branch Name" name="branch_name" value={formData.branch_name} onChange={onChange} error={formErrors.branch_name?.[0]} required />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Abbreviation (BRAK)" name="brak" value={formData.brak} onChange={onChange} error={formErrors.brak?.[0]} required />
        <Input label="Branch Code" name="brcode" value={formData.brcode} onChange={onChange} error={formErrors.brcode?.[0]} required />
      </div>
      {isEdit && (
        <Select
          label="Parent Branch (Mother Branch)"
          name="parent_id"
          value={formData.parent_id || ''}
          onChange={onChange}
          placeholder="None (Mother Branch)"
          options={parentOptions}
          error={formErrors.parent_id?.[0]}
        />
      )}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onSubmit} loading={submitting}>
          {isEdit ? 'Update Branch' : 'Create Branch'}
        </Button>
      </div>
    </div>
  );
};

// ── Data Access Scope Badge ──────────────────────────────────────────────────
const ScopeBadge = ({ role }) => {
  const scopes = {
    admin: { label: 'All Branches', color: 'bg-purple-100 text-purple-700' },
    'compliance-audit': { label: 'All Branches', color: 'bg-purple-100 text-purple-700' },
    manager: { label: 'Branch + BLU Children', color: 'bg-blue-100 text-blue-700' },
    cashier: { label: 'Branch + BLU Children', color: 'bg-blue-100 text-blue-700' },
    user: { label: 'Own Branch Only', color: 'bg-gray-100 text-gray-600' },
  };
  const scope = scopes[role] || { label: role, color: 'bg-gray-100 text-gray-600' };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${scope.color}`}>{scope.label}</span>;
};

// ── Role Badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const colors = {
    admin: 'bg-red-100 text-red-700',
    manager: 'bg-amber-100 text-amber-700',
    'compliance-audit': 'bg-indigo-100 text-indigo-700',
    cashier: 'bg-emerald-100 text-emerald-700',
    user: 'bg-sky-100 text-sky-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  );
};

// ── Status dot ───────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const c = status === 'active' ? 'bg-emerald-500' : status === 'suspended' ? 'bg-red-500' : 'bg-gray-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} title={status} />;
};

const EMPTY_FORM = { branch_name: '', brak: '', brcode: '', parent_id: '' };

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' | 'list'

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getBranchHierarchy();
      setBranches(data.data || []);
    } catch {
      Swal.fire('Error', 'Failed to load branches.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setFormErrors((p) => ({ ...p, [name]: undefined }));
  };

  const openCreate = () => {
    setIsEdit(false);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (branch) => {
    setIsEdit(true);
    setFormData({
      id: branch.id,
      branch_name: branch.branch_name,
      brak: branch.brak,
      brcode: branch.brcode,
      parent_id: branch.parent_id || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormErrors({});
    try {
      const payload = {
        branch_name: formData.branch_name,
        brak: formData.brak,
        brcode: formData.brcode,
        parent_id: formData.parent_id || null,
      };

      if (isEdit) {
        await adminService.updateBranch(formData.id, payload);
        Swal.fire('Success', 'Branch updated successfully.', 'success');
      } else {
        await adminService.createBranch(payload);
        Swal.fire('Success', 'Branch created successfully.', 'success');
      }
      setShowModal(false);
      fetchBranches();
    } catch (err) {
      if (err.response?.status === 422) {
        const errs = err.response.data.errors || {};
        if (err.response.data.message && !Object.keys(errs).length) {
          setFormErrors({ general: err.response.data.message });
        } else {
          setFormErrors(errs);
        }
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Operation failed.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (branch) => {
    const result = await Swal.fire({
      title: 'Delete Branch?',
      html: `Are you sure you want to delete <strong>${branch.branch_name}</strong>?<br/>This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await adminService.deleteBranch(branch.id);
      Swal.fire('Deleted', `Branch "${branch.branch_name}" has been deleted.`, 'success');
      fetchBranches();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to delete branch.', 'error');
    }
  };

  // ── Derived data ──
  const motherBranches = branches.filter((b) => !b.parent_id);
  const allBranchesList = branches;

  const filtered = allBranchesList.filter((b) => {
    const q = search.toLowerCase();
    return !q ||
      b.branch_name.toLowerCase().includes(q) ||
      b.brak.toLowerCase().includes(q) ||
      b.brcode.toString().includes(q);
  });

  const filteredMothers = motherBranches.filter((b) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const matchesSelf = b.branch_name.toLowerCase().includes(q) || b.brak.toLowerCase().includes(q) || b.brcode.toString().includes(q);
    const matchesChild = b.children?.some((c) =>
      c.branch_name.toLowerCase().includes(q) || c.brak.toLowerCase().includes(q) || c.brcode.toString().includes(q)
    );
    return matchesSelf || matchesChild;
  });

  const totalUsers = branches.reduce((sum, b) => sum + (b.users_count || 0), 0);
  const totalCustomers = branches.reduce((sum, b) => sum + (b.customers_count || 0), 0);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Branch Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage branches, hierarchy, and employee assignments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBranches} disabled={loading}>
            <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="primary" onClick={openCreate}>
            <MdAdd className="w-4 h-4" /> Add Branch
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
        {[
          { label: 'Total Branches', value: branches.length, icon: MdBusiness, color: 'from-blue-500 to-blue-600' },
          { label: 'Mother Branches', value: motherBranches.length, icon: MdAccountTree, color: 'from-indigo-500 to-indigo-600' },
          { label: 'Total Employees', value: totalUsers, icon: MdPeople, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Total Customers', value: totalCustomers, icon: MdPersonSearch, color: 'from-amber-500 to-amber-600' },
        ].map((card) => (
          <div key={card.label} className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${card.color} opacity-10`} />
            <card.icon className={`w-6 h-6 mb-2 bg-gradient-to-br ${card.color} bg-clip-text`} style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', background: `linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to))` }} />
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <MdSearch className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            placeholder="Search branches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-[#1877F2]"
          />
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setViewMode('hierarchy')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'hierarchy' ? 'bg-white shadow text-[#1877F2] font-medium' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <MdAccountTree className="inline w-4 h-4 mr-1 -mt-0.5" /> Hierarchy
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-[#1877F2] font-medium' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <MdBusiness className="inline w-4 h-4 mr-1 -mt-0.5" /> List
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'hierarchy' ? (
        /* ── Hierarchy View ── */
        <div className="space-y-4">
          {filteredMothers.length === 0 && (
            <div className="py-12 text-center text-gray-400">No branches found.</div>
          )}
          {filteredMothers.map((mother) => (
            <div key={mother.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Mother branch header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedBranch(expandedBranch === mother.id ? null : mother.id)}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#1877F2] to-blue-600 text-white font-bold text-sm">
                  {mother.brak?.slice(0, 2) || 'BR'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{mother.branch_name}</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-full">Mother Branch</span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>Code: <strong>{mother.brcode}</strong></span>
                    <span>BRAK: <strong>{mother.brak}</strong></span>
                    <span><MdPeople className="inline w-3.5 h-3.5 -mt-0.5" /> {mother.users_count} employees</span>
                    <span><MdPersonSearch className="inline w-3.5 h-3.5 -mt-0.5" /> {mother.customers_count} customers</span>
                    {mother.children?.length > 0 && (
                      <span><MdAccountTree className="inline w-3.5 h-3.5 -mt-0.5" /> {mother.children.length} BLU(s)</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openEdit(mother); }} className="p-2 text-gray-400 hover:text-[#1877F2] hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                    <MdEdit className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(mother); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                    <MdDelete className="w-4 h-4" />
                  </button>
                  {expandedBranch === mother.id ? <MdExpandLess className="w-5 h-5 text-gray-400" /> : <MdExpandMore className="w-5 h-5 text-gray-400" />}
                </div>
              </div>

              {/* Expanded details */}
              {expandedBranch === mother.id && (
                <div className="border-t border-gray-100">
                  {/* Employees table */}
                  {mother.users?.length > 0 && (
                    <div className="px-5 py-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        <MdPeople className="inline w-4 h-4 mr-1 -mt-0.5 text-[#1877F2]" />
                        Employees ({mother.users.length})
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                              <th className="pb-2 pr-4">Name</th>
                              <th className="pb-2 pr-4">Username</th>
                              <th className="pb-2 pr-4">Email</th>
                              <th className="pb-2 pr-4">Role</th>
                              <th className="pb-2 pr-4">Data Access</th>
                              <th className="pb-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {mother.users.map((user) => (
                              <tr key={user.id} className="hover:bg-gray-50/50">
                                <td className="py-2.5 pr-4 font-medium text-gray-900">{user.full_name}</td>
                                <td className="py-2.5 pr-4 text-gray-600">{user.username}</td>
                                <td className="py-2.5 pr-4 text-gray-600">{user.email}</td>
                                <td className="py-2.5 pr-4">
                                  {user.roles?.map((r) => <RoleBadge key={r} role={r} />)}
                                </td>
                                <td className="py-2.5 pr-4">
                                  {user.roles?.map((r) => <ScopeBadge key={r} role={r} />)}
                                </td>
                                <td className="py-2.5">
                                  <StatusDot status={user.status} /> <span className="ml-1 capitalize text-gray-600">{user.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Child branches */}
                  {mother.children?.length > 0 && (
                    <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        <MdAccountTree className="inline w-4 h-4 mr-1 -mt-0.5 text-indigo-500" />
                        Branch Lite Units ({mother.children.length})
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {mother.children.map((child) => {
                          const childFull = allBranchesList.find((b) => b.id === child.id);
                          return (
                            <div key={child.id} className="bg-white rounded-lg border border-gray-200 p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <MdArrowForward className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="font-medium text-gray-900 text-sm">{child.branch_name}</span>
                                  </div>
                                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                    <span>Code: {child.brcode}</span>
                                    <span>BRAK: {child.brak}</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => openEdit(childFull || child)} className="p-1.5 text-gray-400 hover:text-[#1877F2] hover:bg-blue-50 rounded transition-colors" title="Edit">
                                    <MdEdit className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(child)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                                    <MdDelete className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-3 text-xs text-gray-500">
                                <span><MdPeople className="inline w-3 h-3 -mt-0.5" /> {child.users_count} employees</span>
                                <span><MdPersonSearch className="inline w-3 h-3 -mt-0.5" /> {child.customers_count} customers</span>
                              </div>
                              {/* Child branch employees */}
                              {childFull?.users?.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <div className="text-xs text-gray-500 font-medium mb-1">Employees:</div>
                                  <div className="space-y-1">
                                    {childFull.users.map((u) => (
                                      <div key={u.id} className="flex items-center gap-2 text-xs">
                                        <StatusDot status={u.status} />
                                        <span className="text-gray-700">{u.full_name}</span>
                                        {u.roles?.map((r) => <RoleBadge key={r} role={r} />)}
                                        {u.roles?.map((r) => <ScopeBadge key={r} role={r} />)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(!mother.users?.length && !mother.children?.length) && (
                    <div className="px-5 py-6 text-center text-sm text-gray-400">
                      No employees or child branches assigned yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ── List View ── */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b border-gray-100">
                  <th className="px-5 py-3">Branch Name</th>
                  <th className="px-5 py-3">BRAK</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Parent</th>
                  <th className="px-5 py-3">Employees</th>
                  <th className="px-5 py-3">Customers</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No branches found.</td></tr>
                )}
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{b.branch_name}</td>
                    <td className="px-5 py-3 text-gray-600">{b.brak}</td>
                    <td className="px-5 py-3 text-gray-600">{b.brcode}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${!b.parent_id ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {!b.parent_id ? 'Mother Branch' : 'BLU'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{b.parent_name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{b.users_count}</td>
                    <td className="px-5 py-3 text-gray-600">{b.customers_count}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(b)} className="p-2 text-gray-400 hover:text-[#1877F2] hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                          <MdEdit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(b)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                          <MdDelete className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isEdit ? 'Edit Branch' : 'Create New Branch'} size="md">
        <BranchForm
          isEdit={isEdit}
          formData={formData}
          formErrors={formErrors}
          onChange={handleFormChange}
          branches={allBranchesList}
          submitting={submitting}
          onCancel={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  );
};

export default BranchManagement;
