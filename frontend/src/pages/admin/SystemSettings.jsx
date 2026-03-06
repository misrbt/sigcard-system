import { useState, useEffect } from "react";
import {
  MdSettings,
  MdSecurity,
  MdTimer,
  MdLock,
  MdSave,
  MdRefresh,
} from "react-icons/md";
import { adminService } from "../../services/adminService";

const SECTION_ICON_MAP = {
  session: MdTimer,
  authentication: MdLock,
  system: MdSettings,
};

const SystemSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminService.getSystemSettings();
      setSettings(res.data.data);
    } catch (err) {
      setError("Failed to load system settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await adminService.updateSystemSettings(settings);
      setSuccess("Settings updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
          <p className="text-sm text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  const sections = [
    {
      id: "session",
      title: "Session & Token Management",
      description:
        "Configure session timeouts, token expiration, and inactivity auto-logout. Controls how long users stay logged in.",
      fields: [
        {
          key: "session_timeout",
          label: "Inactivity Timeout (minutes)",
          type: "number",
          help: "Users are logged out after this many minutes of inactivity (no mouse, keyboard, or touch).",
        },
        {
          key: "token_expiration",
          label: "Token Expiration (minutes)",
          type: "number",
          help: "API tokens expire after this duration. Tokens auto-refresh while the user is active. Default: 30 minutes.",
        },
        {
          key: "account_lockout_duration",
          label: "Account Lockout Duration (minutes)",
          type: "number",
          help: "How long an account stays locked after exceeding max login attempts.",
        },
      ],
    },
    {
      id: "authentication",
      title: "Password & Authentication",
      description:
        "Password expiration policies, login attempt limits, and two-factor authentication enforcement.",
      fields: [
        {
          key: "password_expiry_enabled",
          label: "Enable Password Expiration",
          type: "toggle",
          help: "When disabled, passwords never expire. Enable to require periodic password changes.",
        },
        {
          key: "password_expiry_days",
          label: "Password Expiry Period (days)",
          type: "number",
          help: "Users must change their password after this many days. Common: 90 days (3 months), 180 days (6 months). Only applies when expiration is enabled.",
          disabledWhen: "password_expiry_enabled",
        },
        {
          key: "max_login_attempts",
          label: "Max Login Attempts",
          type: "number",
          help: "Number of failed login attempts before the account is locked.",
        },
        {
          key: "require_two_factor",
          label: "Require Two-Factor Authentication",
          type: "toggle",
          help: "When enabled, all users must set up 2FA before accessing the system.",
        },
      ],
    },
    {
      id: "system",
      title: "System Configuration",
      description:
        "General system settings including timezone, audit retention, and notifications.",
      fields: [
        {
          key: "audit_log_retention_days",
          label: "Audit Log Retention (days)",
          type: "number",
          help: "How long audit logs are kept. BSP requires a minimum of 365 days.",
        },
        {
          key: "system_timezone",
          label: "Timezone",
          type: "text",
          help: "System timezone for all timestamps and logs.",
        },
        {
          key: "currency_code",
          label: "Currency Code",
          type: "text",
          help: "Default currency for the system.",
        },
        {
          key: "notification_email",
          label: "Notification Email",
          type: "email",
          help: "Email address for system notifications and alerts.",
        },
        {
          key: "maintenance_mode",
          label: "Maintenance Mode",
          type: "toggle",
          help: "When enabled, only admins can access the system.",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MdSecurity className="text-blue-600" />
            System Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure session security, authentication policies, and system
            parameters. Changes are logged for BSP audit compliance.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSettings}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <MdRefresh className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <MdSave className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
          {success}
        </div>
      )}

      {/* Active Policies Banner */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <MdTimer className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Auto-Logout</p>
            <p className="mt-1 text-xs text-blue-700">
              Users are logged out after{" "}
              <strong>
                {settings?.session_timeout || 10} min
              </strong>{" "}
              of inactivity.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 border border-indigo-200 rounded-lg bg-indigo-50">
          <MdSecurity className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-900">
              Token Expiration
            </p>
            <p className="mt-1 text-xs text-indigo-700">
              API tokens expire after{" "}
              <strong>{settings?.token_expiration || 30} min</strong>.
              Auto-refreshed while active.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 border border-amber-200 rounded-lg bg-amber-50">
          <MdLock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Password Expiry
            </p>
            <p className="mt-1 text-xs text-amber-700">
              {settings?.password_expiry_enabled ? (
                <>
                  Passwords expire every{" "}
                  <strong>{settings?.password_expiry_days || 90} days</strong>.
                </>
              ) : (
                <strong>Disabled</strong>
              )}{" "}
              — toggle in Authentication section.
            </p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      {sections.map((section) => {
        const SectionIcon = SECTION_ICON_MAP[section.id] || MdSettings;
        return (
          <div
            key={section.id}
            className="overflow-hidden bg-white border border-gray-200 rounded-xl"
          >
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <SectionIcon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {section.title}
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {section.description}
              </p>
            </div>
            <div className="p-6 space-y-5">
              {section.fields.map((field) => {
                const isDisabled =
                  field.disabledWhen && !settings?.[field.disabledWhen];
                return (
                  <div
                    key={field.key}
                    className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                      isDisabled ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {field.help}
                      </p>
                    </div>
                    <div className="sm:w-48">
                      {field.type === "toggle" ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateSetting(field.key, !settings?.[field.key])
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings?.[field.key]
                              ? "bg-blue-600"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings?.[field.key]
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      ) : (
                        <input
                          type={field.type}
                          value={settings?.[field.key] ?? ""}
                          disabled={isDisabled}
                          onChange={(e) =>
                            updateSetting(
                              field.key,
                              field.type === "number"
                                ? parseInt(e.target.value, 10) || 0
                                : e.target.value
                            )
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* BSP Compliance Footer */}
      <div className="p-4 text-xs text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
        <p className="font-medium text-gray-700">BSP Compliance Notes</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>Session timeout must not exceed 30 minutes (BSP Circular 951)</li>
          <li>Password expiry should not exceed 90 days</li>
          <li>Minimum 5 failed login attempts before lockout</li>
          <li>Audit logs must be retained for at least 365 days</li>
          <li>All settings changes are recorded in the audit log</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemSettings;
