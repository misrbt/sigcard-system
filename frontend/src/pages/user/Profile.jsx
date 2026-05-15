import { useState } from "react";
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineShieldCheck,
  HiOutlineIdentification,
  HiOutlineOfficeBuilding,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDesktopComputer,
  HiOutlineLockClosed,
  HiOutlineQrcode,
  HiOutlineKey,
} from "react-icons/hi";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";

const ROLE_LABELS = {
  admin:              "Admin",
  manager:            "Manager",
  compliance: "Compliance Officer",
  audit:      "Auditor",
  user:               "User",
  cashier:            "Cashier",
};

const statusStyles = {
  active:   "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  suspended:"bg-red-50 text-red-600",
};

// ── 2FA management sub-component ────────────────────────────────────────────
const TwoFASection = ({ user, fetchUser }) => {
  const [mode, setMode] = useState(null); // null | 'setup' | 'disable'
  const [setupData, setSetupData] = useState(null); // { secret, qr_code_url }
  const [confirmCode, setConfirmCode] = useState('');
  const [disableForm, setDisableForm] = useState({ password: '', otp_code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reset = () => {
    setMode(null);
    setSetupData(null);
    setConfirmCode('');
    setDisableForm({ password: '', otp_code: '' });
    setError('');
    setSuccess('');
  };

  const handleBeginSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/enable-2fa');
      setSetupData(res.data.data);
      setMode('setup');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start 2FA setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    if (confirmCode.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/confirm-2fa', { otp_code: confirmCode });
      setSuccess('Two-factor authentication enabled successfully.');
      await fetchUser();
      reset();
    } catch (err) {
      const msg = err.response?.data?.errors?.otp_code?.[0] || err.response?.data?.message || 'Invalid code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/disable-2fa', disableForm);
      setSuccess('Two-factor authentication has been disabled.');
      await fetchUser();
      reset();
    } catch (err) {
      const errs = err.response?.data?.errors || {};
      const msg = errs.password?.[0] || errs.otp_code?.[0] || err.response?.data?.message || 'Failed to disable 2FA.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const enabled = user?.two_factor_enabled;

  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Two-Factor Authentication</p>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Status row */}
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-emerald-50' : 'bg-slate-100'}`}>
              <HiOutlineLockClosed className={`h-[18px] w-[18px] ${enabled ? 'text-emerald-600' : 'text-slate-500'}`} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
              <p className={`mt-0.5 text-sm font-semibold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                {enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          {mode === null && (
            <button
              onClick={enabled ? () => setMode('disable') : handleBeginSetup}
              disabled={loading}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                enabled
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              {loading ? '...' : enabled ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>

        {/* Feedback messages */}
        {success && (
          <div className="mx-6 mb-4 px-4 py-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
            {success}
          </div>
        )}
        {error && mode === null && (
          <div className="mx-6 mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Setup flow */}
        {mode === 'setup' && setupData && (
          <div className="border-t border-slate-100 px-6 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <HiOutlineQrcode className="h-[18px] w-[18px] text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Scan with your authenticator app</p>
                <p className="text-xs text-slate-500 mt-0.5">Google Authenticator, Authy, or any TOTP-compatible app</p>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src={setupData.qr_code_url}
                alt="2FA QR Code"
                className="rounded-xl border border-slate-200 shadow-sm"
                width={180}
                height={180}
              />
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Manual entry key</p>
              <p className="text-sm font-mono font-semibold text-slate-800 break-all tracking-widest">{setupData.secret}</p>
            </div>
            <form onSubmit={handleConfirmSetup} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Enter 6-digit code to confirm</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 text-center text-xl font-bold tracking-[0.5em] border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                  autoFocus
                />
                {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmCode.length !== 6 || loading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {loading ? 'Verifying...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Disable flow */}
        {mode === 'disable' && (
          <div className="border-t border-slate-100 px-6 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-50">
                <HiOutlineKey className="h-[18px] w-[18px] text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Confirm identity to disable 2FA</p>
                <p className="text-xs text-slate-500 mt-0.5">Enter your password and current authenticator code</p>
              </div>
            </div>
            <form onSubmit={handleDisable} className="space-y-3">
              {error && <p className="text-xs text-red-600 px-1">{error}</p>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  value={disableForm.password}
                  onChange={(e) => setDisableForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your account password"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Authenticator Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableForm.otp_code}
                  onChange={(e) => setDisableForm(p => ({ ...p, otp_code: e.target.value.replace(/\D/g, '') }))}
                  className="w-full px-4 py-2.5 text-center text-xl font-bold tracking-[0.5em] border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="000000"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!disableForm.password || disableForm.otp_code.length !== 6 || loading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};

const Profile = () => {
  const { user, getPrimaryRole, fetchUser } = useAuth();
  const roleLabel = ROLE_LABELS[getPrimaryRole()] ?? getPrimaryRole() ?? "User";

  const getInitials = (user) => {
    const first = user?.firstname?.[0] ?? "";
    const last  = user?.lastname?.[0]  ?? "";
    return (first + last).toUpperCase() || "?";
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const accountFields = [
    { icon: HiOutlineUser,           label: "First Name",    value: user?.firstname },
    { icon: HiOutlineUser,           label: "Last Name",     value: user?.lastname },
    { icon: HiOutlineIdentification, label: "Username",      value: user?.username },
    { icon: HiOutlineMail,           label: "Email Address", value: user?.email },
    { icon: HiOutlineShieldCheck,    label: "Role",          value: roleLabel },
    { icon: HiOutlineOfficeBuilding, label: "Branch",        value: user?.branch?.branch_name },
  ];

  const sessionFields = [
    { icon: HiOutlineClock,          label: "Last Login",         value: formatDate(user?.last_login_at) },
    { icon: HiOutlineDesktopComputer,label: "Last Login IP",      value: user?.last_login_ip },
    { icon: HiOutlineClock,          label: "Password Expires",   value: formatDate(user?.password_expires_at) },
  ];

  return (
    <div className="flex flex-1 flex-col w-full max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8 gap-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.45em] text-blue-500 font-medium">Account</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your personal account information.</p>
      </div>

      {/* Avatar card */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white shadow-lg">
          {getInitials(user)}
        </div>
        <p className="text-2xl font-semibold text-slate-900">{user?.full_name ?? "—"}</p>
        <div className="flex flex-wrap justify-center items-center gap-2">
          <span className="rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-600">
            {roleLabel}
          </span>
          {user?.status && (
            <span className={`rounded-full px-4 py-1 text-xs font-semibold capitalize ${statusStyles[user.status] ?? "bg-slate-100 text-slate-500"}`}>
              {user.status}
            </span>
          )}
        </div>
      </div>

      {/* Account info */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Account Information</p>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {accountFields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Icon className="h-[18px] w-[18px] text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800 truncate">{value ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Session info */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Session & Security</p>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
          {sessionFields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Icon className="h-[18px] w-[18px] text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2FA management */}
      <TwoFASection user={user} fetchUser={fetchUser} />
    </div>
  );
};

export default Profile;
