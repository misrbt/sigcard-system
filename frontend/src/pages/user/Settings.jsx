import { useState } from "react";
import { HiOutlineBell, HiOutlineLockClosed, HiOutlineColorSwatch, HiOutlineGlobe } from "react-icons/hi";

const toggle = (checked, onChange) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked ? "bg-blue-600" : "bg-slate-200"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

const Settings = () => {
  const [notifs, setNotifs] = useState({ email: true, browser: false, updates: true });
  const [security, setSecurity] = useState({ twoFactor: false, sessionAlert: true });

  const notifItems = [
    { key: "email",   label: "Email notifications",   desc: "Receive updates via email" },
    { key: "browser", label: "Browser notifications", desc: "Push alerts in the browser" },
    { key: "updates", label: "System updates",        desc: "Be notified of new features" },
  ];

  const securityItems = [
    { key: "twoFactor",    label: "Two-factor authentication", desc: "Add an extra layer of security" },
    { key: "sessionAlert", label: "Session alerts",            desc: "Notify on new sign-ins" },
  ];

  return (
    <div className="flex flex-1 flex-col w-full max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8 gap-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.45em] text-blue-500 font-medium">Configuration</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your preferences and account security.</p>
      </div>

      {/* Notifications */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <HiOutlineBell className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <p className="text-xs text-slate-500">Choose how you want to be notified</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {notifItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              {toggle(notifs[key], (val) => setNotifs((p) => ({ ...p, [key]: val })))}
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <HiOutlineLockClosed className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Security</p>
            <p className="text-xs text-slate-500">Protect your account</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {securityItems.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              {toggle(security[key], (val) => setSecurity((p) => ({ ...p, [key]: val })))}
            </div>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
            <HiOutlineGlobe className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Language & Region</p>
            <p className="text-xs text-slate-500">Display preferences</p>
          </div>
        </div>
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Language</label>
          <select className="w-full max-w-xs rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10">
            <option value="en">English (EN)</option>
            <option value="fil">Filipino (FIL)</option>
          </select>
        </div>
      </section>
    </div>
  );
};

export default Settings;
