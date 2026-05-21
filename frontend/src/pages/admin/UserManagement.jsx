import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
import {
  MdAdd, MdEdit, MdLockOpen, MdRefresh, MdSearch,
  MdToggleOn, MdToggleOff, MdLockReset, MdDelete,
  MdArrowUpward, MdArrowDownward, MdUnfoldMore,
  MdFileDownload, MdPeople, MdCheckCircle, MdBlock, MdLock,
  MdBuild, MdDevices, MdLogout, MdWarning, MdInfo,
  MdAccessTime, MdComputer, MdVpnKey, MdKey, MdShield,
  MdWifi, MdCircle,
} from 'react-icons/md';
import { FaUserShield } from 'react-icons/fa';
import { adminService } from '../../services/adminService';
import { useAppConfig } from '../../context/AppConfigContext';
import Modal from '../../components/common/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

// ── UserForm (unchanged) ──────────────────────────────────────────────────────
const UserForm = ({
  isEdit, formData, formErrors, handleFormChange,
  handleRoleChange, setFormData, branches, roles, userStatuses, submitting, onCancel, onSubmit,
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
    <div className="grid grid-cols-2 gap-4">
      <Select label="Branch" name="branch_id" value={formData.branch_id} onChange={handleFormChange} placeholder="Select branch" options={branches.map((b) => ({ value: b.id, label: b.branch_name }))} error={formErrors.branch_id?.[0]} required />
      <Select label="Status" name="status" value={formData.status} onChange={handleFormChange} options={(userStatuses ?? []).map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
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

// ── Login Troubleshooter Modal ────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const parseUA = (ua) => {
  if (!ua) return { browser: 'Unknown', os: 'Unknown' };
  let browser = 'Unknown', os = 'Unknown';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  return { browser, os };
};

const StatusChip = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
    ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
    {label}
  </span>
);

const Section = ({ title, icon: Icon, iconColor = 'text-[#053161]', children }) => (
  <div className="rounded-xl border border-gray-200 overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</span>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const ActionBtn = ({ onClick, loading, disabled, color = 'blue', icon: Icon, children }) => {
  const colors = {
    blue:   'bg-[#053161] hover:bg-[#0d4a8a] text-white',
    amber:  'bg-amber-500 hover:bg-amber-600 text-white',
    red:    'bg-red-500 hover:bg-red-600 text-white',
    green:  'bg-emerald-500 hover:bg-emerald-600 text-white',
    ghost:  'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {loading
        ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        : Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
};

const LoginTroubleshooterModal = ({ user, onClose, onRefreshList }) => {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState({}); // per-action loading keys

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUserLoginStatus(user.id);
      setStatus(res.data.data);
    } catch {
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not load login status.', confirmButtonColor: '#053161' });
    } finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const act = async (key, fn, successMsg) => {
    setBusy((p) => ({ ...p, [key]: true }));
    try {
      await fn();
      Swal.fire({ icon: 'success', title: 'Done', text: successMsg, confirmButtonColor: '#053161', timer: 3000, timerProgressBar: true });
      await load();
      onRefreshList();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message || 'Action failed.', confirmButtonColor: '#053161' });
    } finally { setBusy((p) => ({ ...p, [key]: false })); }
  };

  const handleUnlock          = () => act('unlock',       () => adminService.unlockUser(user.id),               'Login attempts cleared. Account is now unlocked.');
  const handleRevokeAll       = () => act('revokeAll',    () => adminService.revokeAllSessions(user.id),           'All sessions revoked. The user must sign in again.');
  const handleRevokeToken     = (id) => act(`tok_${id}`, () => adminService.revokeToken(user.id, id),             'Session revoked successfully.');
  const handleClearFPC        = () => act('fpc',          () => adminService.clearForcePasswordChange(user.id),   'Password change requirement removed.');
  const handleRestoreAccess   = () => act('restore',      () => adminService.restoreLoginAccess(user.id),         'Login access restored. The user can now sign in fresh.');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/75">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-5 flex-shrink-0">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #1877F2 0%, transparent 60%)' }} />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10">
                <FaUserShield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Login Troubleshooter</h2>
                <p className="text-sm text-blue-200 mt-0.5">{user.firstname} {user.lastname} — {user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} disabled={loading} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50" title="Refresh">
                <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-[#053161]/20 border-t-[#053161] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading login status…</p>
            </div>
          ) : !status ? null : (
            <>
              {/* ── Quick-glance banner ── */}
              {(status.is_locked || status.is_password_expired || status.is_account_expired || status.force_password_change || status.account_status !== 'active') && (
                <div className="flex flex-wrap gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <MdWarning className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-700 flex-1">
                    Possible reasons this user cannot sign in:
                  </p>
                  <div className="w-full flex flex-wrap gap-2 pl-6">
                    {status.is_locked           && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Account is locked</span>}
                    {status.is_password_expired && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Password expired</span>}
                    {status.is_account_expired  && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Account expired</span>}
                    {status.force_password_change && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Forced to change password</span>}
                    {status.account_status !== 'active' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Account is {status.account_status}</span>}
                  </div>
                </div>
              )}

              {/* ── Quick Fix Banner ── */}
              <div className="flex items-center justify-between gap-4 p-4 bg-[#05173a] rounded-xl border border-[#0d4a8a]">
                <div>
                  <p className="text-sm font-bold text-white">Restore Full Login Access</p>
                  <p className="text-xs text-blue-300 mt-0.5">
                    Unlocks the account, clears all failed login attempts, and signs out all active sessions in one step.
                    After this the user can log in fresh from any device.
                  </p>
                </div>
                <button
                  onClick={handleRestoreAccess}
                  disabled={!!busy.restore}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#053161] text-sm font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow"
                >
                  {busy.restore
                    ? <span className="w-4 h-4 border-2 border-[#053161]/30 border-t-[#053161] rounded-full animate-spin" />
                    : <MdVpnKey className="w-4 h-4" />}
                  Restore Login Access
                </button>
              </div>

              {/* ── Section 1: Login Attempts & Lockout ── */}
              <Section title="Login Attempts & Account Lock" icon={MdLock} iconColor="text-amber-600">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Failed Login Attempts:</span>
                        <span className={`text-sm font-bold ${status.failed_attempts > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
                          {status.failed_attempts} out of {status.max_attempts}
                        </span>
                        {status.failed_attempts > 0 && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: status.max_attempts }).map((_, i) => (
                              <div key={i} className={`w-3 h-3 rounded-full border ${i < status.failed_attempts ? 'bg-amber-400 border-amber-500' : 'bg-gray-100 border-gray-300'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Account Lock Status:</span>
                        <StatusChip ok={!status.is_locked} label={status.is_locked ? `Locked — unlocks in ${status.minutes_remaining} min` : 'Not Locked'} />
                      </div>
                    </div>
                    {(status.is_locked || status.failed_attempts > 0) && (
                      <ActionBtn onClick={handleUnlock} loading={!!busy.unlock} color="amber" icon={MdLockOpen}>
                        {status.is_locked ? 'Unlock & Clear Attempts' : 'Clear Failed Attempts'}
                      </ActionBtn>
                    )}
                  </div>
                  {status.failed_attempts === 0 && !status.is_locked && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                      <MdCheckCircle className="w-3.5 h-3.5" /> No login attempt issues found.
                    </p>
                  )}
                </div>
              </Section>

              {/* ── Section 2: Active Sessions ── */}
              <Section title="Active Sessions" icon={MdDevices} iconColor="text-blue-600">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Sessions open right now:</span>
                      <span className="font-bold text-gray-800">{status.active_sessions_count}</span>
                      {status.session_limit > 0 && (
                        <span className="text-gray-400">of {status.session_limit} allowed</span>
                      )}
                      {status.session_limit > 0 && status.active_sessions_count >= status.session_limit && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Limit Reached</span>
                      )}
                    </div>
                    {status.active_sessions_count > 0 && (
                      <ActionBtn onClick={handleRevokeAll} loading={!!busy.revokeAll} color="red" icon={MdLogout}>
                        Sign Out All Sessions
                      </ActionBtn>
                    )}
                  </div>

                  {status.sessions.length === 0 ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <MdInfo className="w-3.5 h-3.5" /> No active sessions.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Device / Browser</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Last Active</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {status.sessions.map((s) => {
                            const { browser, os } = parseUA(s.user_agent);
                            return (
                              <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <MdComputer className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-gray-700 font-medium">{browser}</span>
                                    <span className="text-gray-400">/ {os}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 font-mono text-gray-600">{s.ip || '—'}</td>
                                <td className="px-3 py-2 text-gray-500">{fmtDate(s.last_activity || s.created_at)}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {s.expires_at ? fmtDate(s.expires_at) : <span className="text-gray-300">—</span>}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <ActionBtn onClick={() => handleRevokeToken(s.id)} loading={!!busy[`tok_${s.id}`]} color="ghost" icon={MdLogout}>
                                    Sign Out
                                  </ActionBtn>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400">
                    Signing out all sessions forces the user to log in again on every device.
                    Use this if they are stuck due to reaching the session limit.
                  </p>
                </div>
              </Section>

              {/* ── Section 3: Security Flags ── */}
              <Section title="Security Flags & Restrictions" icon={MdShield} iconColor="text-purple-600">
                <div className="space-y-2.5">

                  {/* Force password change */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Must Change Password on Next Login</p>
                      <p className="text-xs text-gray-400">When this is ON, the user is forced to set a new password before they can use the system.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusChip ok={!status.force_password_change} label={status.force_password_change ? 'Required' : 'Not Required'} />
                      {status.force_password_change && (
                        <ActionBtn onClick={handleClearFPC} loading={!!busy.fpc} color="green" icon={MdKey}>
                          Remove Requirement
                        </ActionBtn>
                      )}
                    </div>
                  </div>

                  {/* Password expiry */}
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Password Expiry</p>
                      <p className="text-xs text-gray-400">If expired, the user must reset their password before logging in.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {status.password_expires_at
                        ? <StatusChip ok={!status.is_password_expired} label={status.is_password_expired ? `Expired ${fmtDate(status.password_expires_at)}` : `Expires ${fmtDate(status.password_expires_at)}`} />
                        : <span className="text-xs text-gray-400">No expiry set</span>}
                    </div>
                  </div>

                  {/* Account expiry */}
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Account Expiry Date</p>
                      <p className="text-xs text-gray-400">If expired, the user cannot log in at all until the date is extended.</p>
                    </div>
                    <div className="flex-shrink-0">
                      {status.account_expires_at
                        ? <StatusChip ok={!status.is_account_expired} label={status.is_account_expired ? `Expired ${fmtDate(status.account_expires_at)}` : `Expires ${fmtDate(status.account_expires_at)}`} />
                        : <span className="text-xs text-gray-400">Never expires</span>}
                    </div>
                  </div>

                  {/* Account status */}
                  <div className="h-px bg-gray-100" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Account Status</p>
                      <p className="text-xs text-gray-400">Account must be Active to allow login.</p>
                    </div>
                    <StatusChip ok={status.account_status === 'active'} label={status.account_status} />
                  </div>

                </div>
              </Section>

              {/* ── Section 4: Last Login Info ── */}
              <Section title="Last Successful Login" icon={MdAccessTime} iconColor="text-gray-400">
                {status.last_login_at ? (
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { label: 'Date & Time', value: fmtDate(status.last_login_at) },
                      { label: 'IP Address', value: status.last_login_ip || '—', mono: true },
                      { label: 'Browser / Device', value: (() => { const { browser, os } = parseUA(status.last_login_user_agent); return `${browser} on ${os}`; })() },
                    ].map(({ label, value, mono }) => (
                      <div key={label}>
                        <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</dt>
                        <dd className={`text-sm text-gray-700 mt-0.5 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-xs text-gray-400">This user has never signed in.</p>
                )}
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const appConfig = useAppConfig();
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

  const [activeTab, setActiveTab]       = useState('users');
  const [onlineUsers, setOnlineUsers]   = useState([]);
  const [onlineLoading, setOnlineLoading] = useState(true);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await adminService.getOnlineUsers();
      setOnlineUsers(res.data.data || []);
    } catch {
      // silently ignore — not critical
    } finally {
      setOnlineLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 30_000);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers]);

  const roleColor = useMemo(() => ({
    admin:             'bg-purple-100 text-purple-700',
    manager:           'bg-blue-100 text-blue-700',
    user:              'bg-emerald-100 text-emerald-700',
    cashier:           'bg-amber-100 text-amber-700',
    compliance:        'bg-orange-100 text-orange-700',
    audit:             'bg-rose-100 text-rose-700',
  }), []);

  const [showCreateModal, setShowCreateModal]         = useState(false);
  const [showEditModal, setShowEditModal]             = useState(false);
  const [showResetModal, setShowResetModal]           = useState(false);
  const [showTroubleshooter, setShowTroubleshooter]   = useState(false);
  const [selectedUser, setSelectedUser]               = useState(null);
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

  const sharedFormProps = { formData, formErrors, handleFormChange, handleRoleChange, setFormData, branches, roles, userStatuses: appConfig.user_statuses, submitting };

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
          { icon: MdPeople,       label: 'Total Users',    value: pagination.total,        color: 'text-blue-600',    bg: 'bg-blue-50',    onClick: null },
          { icon: MdCheckCircle,  label: 'Active',         value: meta.total_active,        color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: null },
          { icon: MdBlock,        label: 'Inactive / Susp',value: (meta.total_inactive ?? 0) + (meta.total_suspended ?? 0), color: 'text-gray-500', bg: 'bg-gray-50', onClick: null },
          { icon: MdLock,         label: 'Locked',         value: meta.total_locked,        color: 'text-yellow-600',  bg: 'bg-yellow-50',  onClick: () => setFilters((p) => ({ ...p, status: filters.status === 'locked' ? '' : 'locked' })) },
        ].map(({ icon: Icon, label, value, color, bg, onClick }) => (
          <div
            key={label}
            onClick={onClick ?? undefined}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-white shadow-sm transition-colors ${
              onClick
                ? 'cursor-pointer hover:border-yellow-300 hover:bg-yellow-50/40 border-gray-100'
                : 'border-gray-100'
            } ${label === 'Locked' && filters.status === 'locked' ? 'border-yellow-400 bg-yellow-50/60 ring-1 ring-yellow-300' : ''}`}
          >
            <div className={`p-2 rounded-xl ${bg}`}><Icon className={`w-5 h-5 ${color}`} /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-extrabold text-gray-800 leading-tight">{value ?? 0}</p>
              {label === 'Locked' && (value ?? 0) > 0 && (
                <p className="text-[9px] text-yellow-600 font-semibold mt-0.5">Click to filter</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-[#1877F2] text-[#1877F2]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MdPeople className="w-4 h-4" />
            All Users
          </button>
          <button
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'online'
                ? 'border-[#1877F2] text-[#1877F2]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Online Now
            {onlineUsers.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold leading-none">
                {onlineUsers.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Online Now Tab ── */}
        {activeTab === 'online' && (
          <div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/60 border-b border-gray-100">
              <p className="text-xs text-gray-500">Staff members with an active session right now</p>
              <button
                onClick={fetchOnlineUsers}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <MdRefresh className="w-4 h-4" />
              </button>
            </div>

            {onlineLoading ? (
              <div className="flex items-center gap-2 px-4 py-5 text-sm text-gray-400">
                <span className="w-4 h-4 border-2 border-gray-200 border-t-emerald-400 rounded-full animate-spin" />
                Checking who is online…
              </div>
            ) : onlineUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <MdWifi className="w-8 h-8 text-gray-200" />
                <p className="text-sm font-medium">No staff members are currently active</p>
                <p className="text-xs text-gray-300">Refreshes every 30 seconds</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {onlineUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1877F2] to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                          {u.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.branch_name}</p>
                      </div>
                      <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${roleColor[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                      {u.last_login_ip && (
                        <span className="hidden md:block text-xs text-gray-400 font-mono flex-shrink-0">
                          {u.last_login_ip}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="px-4 py-2 text-[10px] text-gray-300 border-t border-gray-50">
                  Refreshes every 30 seconds · Based on active session tokens
                </p>
              </>
            )}
          </div>
        )}

      </div>{/* end tabs card */}

      {/* ── All Users Tab ── */}
      {activeTab === 'users' && <>

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
          options={[
            ...appConfig.user_statuses.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
            { value: 'locked', label: '🔒 Locked' },
          ]} />
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
              className="text-xs text-gray-800 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
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
                        {isLocked ? (
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 w-fit">Locked</span>
                            <button
                              onClick={() => handleUnlock(user)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors w-fit shadow-sm"
                            >
                              <MdLockOpen className="w-3 h-3" />
                              Unlock Now
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[user.status] ?? STATUS_STYLE.inactive}`}>{user.status}</span>
                        )}
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
                          <button
                            onClick={() => { setSelectedUser(user); setShowTroubleshooter(true); }}
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors" title="Troubleshoot Login"
                          >
                            <MdBuild className="w-4 h-4" />
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
      </>}{/* end All Users tab */}

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

      {/* ── Login Troubleshooter ── */}
      {showTroubleshooter && selectedUser && (
        <LoginTroubleshooterModal
          user={selectedUser}
          onClose={() => { setShowTroubleshooter(false); setSelectedUser(null); }}
          onRefreshList={() => fetchUsers(currentPage)}
        />
      )}
    </div>
  );
};

export default UserManagement;
