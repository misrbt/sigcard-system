import { useState, useEffect } from "react";
import {
  MdSecurity, MdTimer, MdLock, MdSave, MdRefresh,
  MdSettings, MdShield, MdWarning, MdCheckCircle,
  MdVpnKey, MdClose,
} from "react-icons/md";
import { adminService } from "../../services/adminService";

// ── Number Stepper ──────────────────────────────────────────────────────────

const NumberStepper = ({ value = 0, min = 0, max = 9999, unit, onChange, disabled = false }) => {
  const clamp = (v) => Math.min(max, Math.max(min, Math.floor(v)));
  return (
    <div className={`flex items-center gap-1.5 ${disabled ? "pointer-events-none" : ""}`}>
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xl leading-none select-none"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(clamp(v));
        }}
        className="w-[4.5rem] text-center text-sm font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xl leading-none select-none"
      >
        +
      </button>
      {unit && <span className="text-sm text-gray-500 ml-1 whitespace-nowrap">{unit}</span>}
    </div>
  );
};

// ── Toggle Switch ───────────────────────────────────────────────────────────

const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked ? "bg-blue-600" : "bg-gray-200"
    } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

// ── BSP Badge ───────────────────────────────────────────────────────────────

const BSPBadge = () => (
  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 tracking-wide whitespace-nowrap">
    <MdShield className="w-2.5 h-2.5" />
    BSP
  </span>
);

const CriticalBadge = () => (
  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 tracking-wide whitespace-nowrap">
    <MdWarning className="w-2.5 h-2.5" />
    CRITICAL
  </span>
);

// ── Field Row ───────────────────────────────────────────────────────────────

const FieldRow = ({ label, description, hint, bsp = false, critical = false, bspWarn = null, disabled = false, children }) => (
  <div className={`flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-xl border transition-all duration-150 ${
    disabled
      ? "bg-gray-50/60 border-gray-100 opacity-50"
      : critical
        ? "bg-red-50/60 border-red-200 hover:border-red-300"
        : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"
  }`}>
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-sm font-semibold ${critical ? "text-red-800" : "text-gray-800"}`}>
          {label}
        </span>
        {bsp && <BSPBadge />}
        {critical && <CriticalBadge />}
      </div>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
      {hint && (
        <p className="text-[11px] text-blue-500 font-medium mt-1">{hint}</p>
      )}
      {bspWarn && (
        <div className="flex items-start gap-1.5 mt-2">
          <MdWarning className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-px" />
          <span className="text-xs text-amber-600 leading-snug">{bspWarn}</span>
        </div>
      )}
    </div>
    <div className="shrink-0 flex items-center sm:pt-0.5">{children}</div>
  </div>
);

// ── Section Header ──────────────────────────────────────────────────────────

const SectionHeader = ({ title, description }) => (
  <div className="pb-4 mb-1 border-b border-gray-100">
    <h2 className="text-base font-bold text-gray-900">{title}</h2>
    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
  </div>
);

// ── Status Card ─────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  blue:    { wrap: "bg-blue-50 border-blue-200",       icon: "bg-blue-100 text-blue-600",     title: "text-blue-600",   val: "text-blue-900",   note: "text-blue-600"   },
  indigo:  { wrap: "bg-indigo-50 border-indigo-200",   icon: "bg-indigo-100 text-indigo-600", title: "text-indigo-600", val: "text-indigo-900", note: "text-indigo-600" },
  emerald: { wrap: "bg-emerald-50 border-emerald-200", icon: "bg-emerald-100 text-emerald-600", title: "text-emerald-600", val: "text-emerald-900", note: "text-emerald-600" },
  amber:   { wrap: "bg-amber-50 border-amber-200",     icon: "bg-amber-100 text-amber-600",   title: "text-amber-700",  val: "text-amber-900",  note: "text-amber-600"  },
  gray:    { wrap: "bg-gray-50 border-gray-200",       icon: "bg-gray-100 text-gray-500",     title: "text-gray-500",   val: "text-gray-700",   note: "text-gray-500"   },
};

const StatusCard = ({ Icon, color, title, value, note, warn = false }) => {
  const c = STATUS_COLORS[warn ? "amber" : color] || STATUS_COLORS.blue;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${c.wrap}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${c.title}`}>{title}</p>
        <p className={`text-xl font-black leading-tight mt-0.5 ${c.val}`}>{value}</p>
        <p className={`text-[11px] mt-0.5 ${c.note}`}>{note}</p>
      </div>
    </div>
  );
};

// ── Confirm Modal ───────────────────────────────────────────────────────────

const ConfirmModal = ({ title, message, confirmLabel, danger = false, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className={`px-6 pt-6 pb-4 ${danger ? "bg-red-50" : "bg-amber-50"}`}>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${danger ? "bg-red-100" : "bg-amber-100"}`}>
          <MdWarning className={`w-6 h-6 ${danger ? "text-red-600" : "text-amber-600"}`} />
        </div>
        <h3 className={`text-center text-base font-bold mt-3 ${danger ? "text-red-900" : "text-amber-900"}`}>{title}</h3>
      </div>
      <div className="px-6 py-5">
        <p className="text-center text-sm text-gray-500 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── Tabs Config ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "session",        label: "Session & Token",  short: "Session", Icon: MdTimer    },
  { id: "authentication", label: "Authentication",   short: "Auth",    Icon: MdLock     },
  { id: "system",         label: "System Config",    short: "System",  Icon: MdSettings },
];

// ── Main Component ──────────────────────────────────────────────────────────

const SystemSettings = () => {
  const [settings, setSettings]       = useState(null);
  const [original, setOriginal]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [activeTab, setActiveTab]     = useState("session");
  const [confirmMaint, setConfirmMaint] = useState(false);

  const isDirty = original && JSON.stringify(settings) !== JSON.stringify(original);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminService.getSystemSettings();
      const data = res.data.data;
      setSettings(data);
      setOriginal(data);
    } catch {
      setError("Failed to load system settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const set = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      // Strip the display-only unit field; convert lockout duration to seconds before saving.
      const { account_lockout_duration_unit, ...rest } = settings;
      const payload = {
        ...rest,
        account_lockout_duration:
          account_lockout_duration_unit === "minutes"
            ? settings.account_lockout_duration * 60
            : settings.account_lockout_duration,
      };
      await adminService.updateSystemSettings(payload);
      setOriginal({ ...settings });
      setSuccess("Settings saved successfully. Changes have been audit-logged.");
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      const errData = err?.response?.data;
      const msg = errData?.errors
        ? Object.values(errData.errors).flat().join(" ")
        : errData?.message || "Failed to save settings.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <MdWarning className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">Could not load system settings.</p>
          <button
            onClick={fetchSettings}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Maintenance Mode Confirmation */}
      {confirmMaint && (
        <ConfirmModal
          title="Enable Maintenance Mode?"
          message="This will immediately prevent all non-administrator users from accessing the system. Only proceed if this is a planned maintenance window."
          confirmLabel="Enable Maintenance"
          danger
          onConfirm={() => { set("maintenance_mode", true); setConfirmMaint(false); }}
          onCancel={() => setConfirmMaint(false)}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-600/30 flex-shrink-0">
              <MdSecurity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">System Settings</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                BSP-compliant configuration — all changes are audit-logged.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setSettings({ ...original }); setError(""); setSuccess(""); }}
              disabled={!isDirty}
              title="Discard unsaved changes"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
            >
              <MdClose className="w-4 h-4" />
              Discard
            </button>
            <button
              onClick={fetchSettings}
              title="Reload from server"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
            >
              <MdRefresh className="w-4 h-4" />
              Reload
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition shadow-sm ${
                isDirty && !saving
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {isDirty && !saving && (
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse flex-shrink-0" />
              )}
              <MdSave className="w-4 h-4" />
              {saving ? "Saving…" : isDirty ? "Save Changes" : "Saved"}
            </button>
          </div>
        </div>

        {/* ── Maintenance Mode Active Banner ───────────────────────────────── */}
        {settings.maintenance_mode && (
          <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-300 rounded-xl">
            <MdWarning className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800">Maintenance Mode is Active</p>
              <p className="text-xs text-amber-700 mt-0.5">
                All non-administrator users are currently seeing the maintenance page. Disable maintenance mode below and save to restore access.
              </p>
            </div>
          </div>
        )}

        {/* ── Alert Banners ─────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3.5 bg-red-50 border border-red-200 rounded-xl">
            <MdWarning className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-700 leading-relaxed">{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0">
              <MdClose className="w-4 h-4" />
            </button>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 px-4 py-3.5 bg-green-50 border border-green-200 rounded-xl">
            <MdCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700">{success}</span>
            <button onClick={() => setSuccess("")} className="ml-auto text-green-400 hover:text-green-600 flex-shrink-0">
              <MdClose className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Live Policy Summary ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatusCard
            Icon={MdTimer}
            color="blue"
            title="Auto-Logout"
            value={`${settings.session_timeout} min`}
            note="inactivity timeout"
            warn={settings.session_timeout > 30}
          />
          <StatusCard
            Icon={MdLock}
            color="indigo"
            title="Login Security"
            value={settings.max_login_attempts === 0 ? "Unlimited" : `${settings.max_login_attempts} attempts`}
            note={
              settings.max_login_attempts === 0
                ? "rate limiting disabled"
                : `then ${settings.account_lockout_duration} ${settings.account_lockout_duration_unit === "seconds" ? "sec" : "min"} lockout`
            }
          />
          <StatusCard
            Icon={MdVpnKey}
            color={settings.password_expiry_enabled ? "emerald" : "gray"}
            title="Password Expiry"
            value={settings.password_expiry_enabled ? `${settings.password_expiry_days} days` : "Disabled"}
            note={settings.password_expiry_enabled ? "rotation period" : "passwords never expire"}
            warn={settings.password_expiry_enabled && settings.password_expiry_days > 90}
          />
        </div>

        {/* ── Tabs + Settings Panel ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-gray-50/80">
            {TABS.map(({ id, label, short, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all flex-1 sm:flex-none justify-center sm:justify-start ${
                    active
                      ? "border-blue-600 text-blue-600 bg-white"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/70"
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-blue-600" : "text-gray-400"}`} />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden text-xs">{short}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-5 sm:p-6 space-y-3">

            {/* ── Session & Token Tab ──────────────────────────────────────── */}
            {activeTab === "session" && (
              <>
                <SectionHeader
                  title="Session & Token Management"
                  description="Control authentication session lifetimes, concurrent access limits, and account lockout behavior."
                />
                <FieldRow
                  label="Inactivity Timeout"
                  description="Users are automatically signed out after this many minutes with no activity (no mouse, keyboard, or screen touch)."
                  hint="Allowed: 5 – 480 minutes"
                  bsp
                  bspWarn={
                    settings.session_timeout > 30
                      ? "BSP Circular 951 recommends sessions ≤ 30 minutes for internet banking."
                      : null
                  }
                >
                  <NumberStepper
                    value={settings.session_timeout}
                    min={5}
                    max={480}
                    unit="min"
                    onChange={(v) => set("session_timeout", v)}
                  />
                </FieldRow>

                <FieldRow
                  label="Token Expiration"
                  description="API authentication tokens expire after this duration. Active users have their tokens silently refreshed in the background."
                  hint="Allowed: 5 – 1440 minutes"
                >
                  <NumberStepper
                    value={settings.token_expiration}
                    min={5}
                    max={1440}
                    unit="min"
                    onChange={(v) => set("token_expiration", v)}
                  />
                </FieldRow>

                <FieldRow
                  label="Account Lockout Duration"
                  description="After too many failed logins, the account is locked for this duration before it automatically unlocks. Choose seconds for short test windows or minutes for production."
                  hint={
                    settings.account_lockout_duration_unit === "seconds"
                      ? "Allowed: 30 – 3600 seconds"
                      : "Allowed: 1 – 1440 minutes"
                  }
                  bsp
                >
                  <div className="flex items-center gap-2">
                    <NumberStepper
                      value={settings.account_lockout_duration}
                      min={settings.account_lockout_duration_unit === "seconds" ? 30 : 1}
                      max={settings.account_lockout_duration_unit === "seconds" ? 3600 : 1440}
                      onChange={(v) => set("account_lockout_duration", v)}
                    />
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                      {["seconds", "minutes"].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => {
                            set("account_lockout_duration_unit", u);
                            if (u === "seconds") {
                              set("account_lockout_duration", Math.max(30, Math.min(3600, settings.account_lockout_duration)));
                            } else {
                              set("account_lockout_duration", Math.max(1, Math.min(1440, settings.account_lockout_duration)));
                            }
                          }}
                          className={`px-2.5 py-1.5 transition-colors ${
                            settings.account_lockout_duration_unit === u
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {u === "seconds" ? "sec" : "min"}
                        </button>
                      ))}
                    </div>
                  </div>
                </FieldRow>

                <FieldRow
                  label="Concurrent Session Limit"
                  description="Maximum number of simultaneous active sessions allowed per user across different devices and browsers. Set to 0 for unlimited."
                  hint="Allowed: 0 – 20 sessions"
                  bsp
                >
                  <NumberStepper
                    value={settings.concurrent_sessions_limit}
                    min={0}
                    max={20}
                    unit="sessions"
                    onChange={(v) => set("concurrent_sessions_limit", v)}
                  />
                </FieldRow>
              </>
            )}

            {/* ── Authentication Tab ───────────────────────────────────────── */}
            {activeTab === "authentication" && (
              <>
                <SectionHeader
                  title="Password & Authentication Policy"
                  description="Configure password lifecycle rules, login attempt limits, and multi-factor authentication enforcement."
                />

                <FieldRow
                  label="Password Expiration"
                  description="Require users to change their password after a set number of days. When disabled, passwords remain valid indefinitely."
                  bsp
                >
                  <div className="flex items-center gap-3">
                    <ToggleSwitch
                      checked={settings.password_expiry_enabled}
                      onChange={(v) => set("password_expiry_enabled", v)}
                    />
                    <span className={`text-sm font-semibold min-w-[4rem] ${
                      settings.password_expiry_enabled ? "text-green-600" : "text-gray-400"
                    }`}>
                      {settings.password_expiry_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </FieldRow>

                <FieldRow
                  label="Password Expiry Period"
                  description="Users must change their password after this many days. Only applies when password expiration is enabled above."
                  hint="Allowed: 30 – 365 days"
                  bsp
                  bspWarn={
                    settings.password_expiry_enabled && settings.password_expiry_days > 90
                      ? "BSP recommends password rotation every 90 days or less for privileged accounts."
                      : null
                  }
                  disabled={!settings.password_expiry_enabled}
                >
                  <NumberStepper
                    value={settings.password_expiry_days}
                    min={30}
                    max={365}
                    unit="days"
                    onChange={(v) => set("password_expiry_days", v)}
                    disabled={!settings.password_expiry_enabled}
                  />
                </FieldRow>

                <FieldRow
                  label="Max Login Attempts"
                  description="Consecutive failed login attempts before the account is locked. Set to 0 to disable lockout entirely (not recommended)."
                  hint="Allowed: 0 – 10 attempts"
                  bsp
                  bspWarn={
                    settings.max_login_attempts > 5
                      ? "BSP recommends locking accounts after no more than 5 failed attempts."
                      : settings.max_login_attempts === 0
                        ? "Warning: setting to 0 disables account lockout, creating brute-force risk."
                        : null
                  }
                >
                  <NumberStepper
                    value={settings.max_login_attempts}
                    min={0}
                    max={10}
                    unit="attempts"
                    onChange={(v) => set("max_login_attempts", v)}
                  />
                </FieldRow>

                <FieldRow
                  label="Require Two-Factor Authentication"
                  description="Force all users to set up and verify via 2FA before they can access any part of the system."
                  bsp
                >
                  <div className="flex items-center gap-3">
                    <ToggleSwitch
                      checked={settings.require_two_factor}
                      onChange={(v) => set("require_two_factor", v)}
                    />
                    <span className={`text-sm font-semibold min-w-[5rem] ${
                      settings.require_two_factor ? "text-green-600" : "text-gray-400"
                    }`}>
                      {settings.require_two_factor ? "Required" : "Optional"}
                    </span>
                  </div>
                </FieldRow>
              </>
            )}

            {/* ── System Config Tab ────────────────────────────────────────── */}
            {activeTab === "system" && (
              <>
                <SectionHeader
                  title="System Configuration"
                  description="General operational settings: audit log retention, timezone, currency, notifications, and maintenance controls."
                />

                <FieldRow
                  label="Audit Log Retention"
                  description="How long audit trail records are stored. BSP compliance requires a minimum of 365 days. Logs older than this period may be purged."
                  hint="Allowed: 90 – 2555 days (7 years)"
                  bsp
                  bspWarn={
                    settings.audit_log_retention_days < 365
                      ? "BSP regulations require audit logs to be retained for at least 365 days (1 year)."
                      : null
                  }
                >
                  <NumberStepper
                    value={settings.audit_log_retention_days}
                    min={90}
                    max={2555}
                    unit="days"
                    onChange={(v) => set("audit_log_retention_days", v)}
                  />
                </FieldRow>

                <FieldRow
                  label="System Timezone"
                  description="Timezone for all system timestamps, scheduled tasks, and log entries. Use IANA format (e.g. Asia/Manila, UTC)."
                >
                  <input
                    type="text"
                    value={settings.system_timezone ?? ""}
                    onChange={(e) => set("system_timezone", e.target.value)}
                    placeholder="Asia/Manila"
                    className="w-52 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  />
                </FieldRow>

                <FieldRow
                  label="Currency Code"
                  description="ISO 4217 three-character currency code displayed across the system (e.g. PHP, USD, EUR)."
                >
                  <input
                    type="text"
                    value={settings.currency_code ?? ""}
                    onChange={(e) => set("currency_code", e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))}
                    placeholder="PHP"
                    maxLength={3}
                    className="w-24 px-3 py-2 text-sm text-center border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono tracking-[0.35em] uppercase text-gray-800"
                  />
                </FieldRow>

                <FieldRow
                  label="Notification Email"
                  description="Address where system alerts, security event notifications, and admin-level messages are delivered."
                >
                  <input
                    type="email"
                    value={settings.notification_email ?? ""}
                    onChange={(e) => set("notification_email", e.target.value)}
                    placeholder="admin@rbtbank.com"
                    className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  />
                </FieldRow>

                <FieldRow
                  label="Maintenance Mode"
                  description="When active, only system administrators can log in. All other users see a maintenance page. Use during planned downtime only."
                  critical
                >
                  <div className="flex items-center gap-3">
                    <ToggleSwitch
                      checked={settings.maintenance_mode}
                      onChange={(v) => v ? setConfirmMaint(true) : set("maintenance_mode", false)}
                    />
                    <span className={`text-sm font-bold min-w-[4rem] ${
                      settings.maintenance_mode ? "text-red-600" : "text-gray-400"
                    }`}>
                      {settings.maintenance_mode ? "Active" : "Off"}
                    </span>
                  </div>
                </FieldRow>
              </>
            )}
          </div>
        </div>

        {/* ── BSP Compliance Footer ─────────────────────────────────────────── */}
        <div className="flex items-start gap-3.5 p-4 rounded-xl border border-amber-200 bg-amber-50/70">
          <MdShield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1.5">BSP Compliance Requirements</p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              {[
                "Session timeout must not exceed 30 minutes (BSP Circular 951)",
                "Password validity should not exceed 90 days for privileged accounts",
                "Account lockout must trigger within 3–5 consecutive failed logins",
                "Audit logs must be retained for a minimum of 365 days",
                "Two-factor authentication is strongly recommended for all users",
                "All configuration changes are recorded in the audit trail",
              ].map((note) => (
                <li key={note} className="flex items-start gap-1.5 text-xs text-amber-700">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default SystemSettings;
