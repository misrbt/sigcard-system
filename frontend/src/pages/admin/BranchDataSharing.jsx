import { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { MdAdd, MdEdit, MdDelete, MdShare, MdArrowForward } from 'react-icons/md';
import { adminService } from '../../services/adminService';
import Modal from '../../components/common/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

const EMPTY_FORM = {
  id: null,
  source_branch_id: '',
  target_branch_id: '',
  date_from: '',
  date_to: '',
  include_documents: true,
  is_active: true,
  notes: '',
};

const formatDate = (value) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

const describeWindow = (share) => {
  const from = formatDate(share.date_from);
  const to = formatDate(share.date_to);
  if (from && to) return `Opened ${from} – ${to}`;
  if (from) return `Opened ${from} onward`;
  if (to) return `Opened up to ${to}`;
  return 'All dates';
};

const ShareForm = ({ formData, formErrors, branches, submitting, onChange, onCancel, onSubmit }) => {
  const branchOptions = branches.map((b) => ({ value: b.id, label: b.branch_name }));

  return (
    <div className="space-y-5">
      {formErrors.general && (
        <div className="px-4 py-3 text-base text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {formErrors.general}
        </div>
      )}
      <Select
        label="Share customers of this branch"
        name="source_branch_id"
        value={formData.source_branch_id}
        onChange={onChange}
        placeholder="Select branch"
        options={branchOptions}
        error={formErrors.source_branch_id?.[0]}
      />
      <Select
        label="With users of this branch"
        name="target_branch_id"
        value={formData.target_branch_id}
        onChange={onChange}
        placeholder="Select branch"
        options={branchOptions}
        error={formErrors.target_branch_id?.[0]}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Date opened from" type="date" name="date_from" value={formData.date_from} onChange={onChange} error={formErrors.date_from?.[0]} />
        <Input label="Date opened until" type="date" name="date_to" value={formData.date_to} onChange={onChange} error={formErrors.date_to?.[0]} />
      </div>
      <p className="-mt-3 text-xs text-gray-500">
        Only customers whose date opened is inside these dates are shared. Leave a date empty for no limit.
        Customers uploaded later are shared automatically while their date opened is inside the dates.
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="include_documents" checked={formData.include_documents} onChange={onChange} />
        Also share the uploaded signature images and documents
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="is_active" checked={formData.is_active} onChange={onChange} />
        Sharing is turned on
      </label>
      <Input label="Note (optional)" name="notes" value={formData.notes} onChange={onChange} error={formErrors.notes?.[0]} />
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onSubmit} loading={submitting}>Save</Button>
      </div>
    </div>
  );
};

const BranchDataSharing = ({ branches }) => {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchShares = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.getBranchShares();
      setShares(data.data || []);
    } catch {
      Swal.fire('Error', 'Failed to load data sharing rules.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchShares(); }, [fetchShares]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
    setFormErrors((p) => ({ ...p, [name]: undefined }));
  };

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (share) => {
    setFormData({
      id: share.id,
      source_branch_id: share.source_branch_id,
      target_branch_id: share.target_branch_id,
      date_from: share.date_from || '',
      date_to: share.date_to || '',
      include_documents: share.include_documents,
      is_active: share.is_active,
      notes: share.notes || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormErrors({});
    const payload = {
      source_branch_id: formData.source_branch_id,
      target_branch_id: formData.target_branch_id,
      date_from: formData.date_from || null,
      date_to: formData.date_to || null,
      include_documents: formData.include_documents,
      is_active: formData.is_active,
      notes: formData.notes || null,
    };
    try {
      if (formData.id) {
        await adminService.updateBranchShare(formData.id, payload);
      } else {
        await adminService.createBranchShare(payload);
      }
      setShowModal(false);
      Swal.fire('Saved', 'Data sharing rule saved.', 'success');
      fetchShares();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || { general: err.response.data.message });
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Failed to save the rule.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (share) => {
    try {
      await adminService.updateBranchShare(share.id, {
        source_branch_id: share.source_branch_id,
        target_branch_id: share.target_branch_id,
        date_from: share.date_from,
        date_to: share.date_to,
        include_documents: share.include_documents,
        is_active: !share.is_active,
        notes: share.notes,
      });
      fetchShares();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to update the rule.', 'error');
    }
  };

  const handleDelete = async (share) => {
    const result = await Swal.fire({
      title: 'Delete this rule?',
      html: `<strong>${share.source_branch_name}</strong> customers will no longer be visible to <strong>${share.target_branch_name}</strong> users.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Delete',
    });
    if (!result.isConfirmed) return;
    try {
      await adminService.deleteBranchShare(share.id);
      fetchShares();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to delete the rule.', 'error');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex flex-col gap-3 px-5 py-4 border-b border-gray-100 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            <MdShare className="inline w-5 h-5 mr-1 -mt-0.5 text-[#1877F2]" />
            Data Sharing Between Branches
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Choose which branch&apos;s customers (with their uploaded images) other branch users can see, and for which date opened.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <MdAdd className="w-4 h-4" /> Add Sharing Rule
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b border-gray-100">
                <th className="px-5 py-3">Shared From → To</th>
                <th className="px-5 py-3">Date Opened</th>
                <th className="px-5 py-3">Images</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shares.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">No sharing rules yet.</td></tr>
              )}
              {shares.map((share) => (
                <tr key={share.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {share.source_branch_name}
                    <MdArrowForward className="inline w-4 h-4 mx-2 -mt-0.5 text-gray-400" />
                    {share.target_branch_name}
                    {share.notes && <div className="text-xs font-normal text-gray-500">{share.notes}</div>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{describeWindow(share)}</td>
                  <td className="px-5 py-3 text-gray-600">{share.include_documents ? 'Included' : 'Not included'}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggle(share)}
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${share.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
                      title="Click to turn on or off"
                    >
                      {share.is_active ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(share)} className="p-2 text-gray-400 hover:text-[#1877F2] hover:bg-blue-50 rounded-lg" title="Edit">
                        <MdEdit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(share)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                        <MdDelete className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={formData.id ? 'Edit Sharing Rule' : 'Add Sharing Rule'} size="md">
        <ShareForm
          formData={formData}
          formErrors={formErrors}
          branches={branches}
          submitting={submitting}
          onChange={handleChange}
          onCancel={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  );
};

export default BranchDataSharing;
