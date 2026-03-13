import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MdEmail, MdLock, MdUploadFile, MdVerified } from "react-icons/md";
import { HiShieldCheck } from "react-icons/hi";
import Input from "./components/ui/Input";
import Button from "./components/ui/Button";
import Footer from "./components/Footer";
import { useAuth } from "./hooks/useAuth";
import api from "./services/api";
import logo from "./assets/images/logos.png";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, isAuthenticated, getPrimaryRole, fetchUser } = useAuth();
  const fromSessionExpired = location.state?.sessionExpired;
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Force password change state
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [forcePwdForm, setForcePwdForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [forcePwdErrors, setForcePwdErrors] = useState({});
  const [forcePwdLoading, setForcePwdLoading] = useState(false);

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirect if already authenticated — skip if force password change is pending
  useEffect(() => {
    if (isAuthenticated && localStorage.getItem("authToken")) {
      if (user?.force_password_change) {
        setForcePasswordChange(true);
      } else {
        redirectByRole(getPrimaryRole());
      }
    }
  }, [isAuthenticated, user]);

  const redirectByRole = (role) => {
    const routes = {
      admin: "/admin",
      manager: "/manager/dashboard",
      "compliance-audit": "/compliance",
      user: "/user",
      cashier: "/cashier",
    };
    navigate(routes[role] || "/user", { replace: true });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (apiError) setApiError("");
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setApiError("");

    try {
      const deviceId =
        localStorage.getItem("device_id") ||
        crypto.randomUUID?.() ||
        Math.random().toString(36).slice(2);
      localStorage.setItem("device_id", deviceId);

      await login({
        email: formData.email,
        password: formData.password,
        device_id: deviceId,
        remember_me: rememberMe,
      });
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.errors?.email?.[0] ||
        "Login failed. Please check your credentials.";
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForcePwdChange = async (e) => {
    e.preventDefault();
    setForcePwdErrors({});

    if (forcePwdForm.new_password !== forcePwdForm.new_password_confirmation) {
      setForcePwdErrors({ new_password_confirmation: 'Passwords do not match' });
      return;
    }

    setForcePwdLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: forcePwdForm.current_password,
        new_password: forcePwdForm.new_password,
        new_password_confirmation: forcePwdForm.new_password_confirmation,
      });
      await fetchUser();
      redirectByRole(getPrimaryRole());
    } catch (err) {
      const errs = err.response?.data?.errors || {};
      const general = err.response?.data?.message;
      setForcePwdErrors(Object.keys(errs).length ? errs : { general });
    } finally {
      setForcePwdLoading(false);
    }
  };

  if (forcePasswordChange) {
    return (
      <div className="flex flex-col w-full min-h-screen bg-gradient-to-br from-[#010713] via-[#053161] to-[#18a6ff]">
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="rounded-2xl bg-white shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] px-6 py-5 flex items-center gap-3">
                <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
                <div>
                  <p className="text-white font-bold text-base tracking-widest">SIGCARD SYSTEM</p>
                  <p className="text-blue-300 text-xs tracking-widest">RBT Bank Inc.</p>
                </div>
              </div>

              <div className="px-6 py-6 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Password Change Required</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Your password has been reset by an administrator. Please enter the temporary password and choose a new one to continue.
                  </p>
                </div>

                {/* Temp password hint */}
                <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-600 font-medium">Your temporary password is:</p>
                  <p className="text-lg font-bold text-[#1877F2] tracking-widest mt-0.5">abc_123</p>
                </div>

                <form onSubmit={handleForcePwdChange} className="space-y-4">
                  {forcePwdErrors.general && (
                    <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
                      {forcePwdErrors.general}
                    </div>
                  )}

                  <Input
                    label="Temporary Password"
                    name="current_password"
                    showPasswordToggle
                    value={forcePwdForm.current_password}
                    onChange={(e) => setForcePwdForm((p) => ({ ...p, current_password: e.target.value }))}
                    error={forcePwdErrors.current_password?.[0] || forcePwdErrors.current_password}
                    required
                  />
                  <Input
                    label="New Password"
                    name="new_password"
                    showPasswordToggle
                    value={forcePwdForm.new_password}
                    onChange={(e) => setForcePwdForm((p) => ({ ...p, new_password: e.target.value }))}
                    error={forcePwdErrors.new_password?.[0] || forcePwdErrors.new_password}
                    required
                  />
                  <Input
                    label="Confirm New Password"
                    name="new_password_confirmation"
                    showPasswordToggle
                    value={forcePwdForm.new_password_confirmation}
                    onChange={(e) => setForcePwdForm((p) => ({ ...p, new_password_confirmation: e.target.value }))}
                    error={forcePwdErrors.new_password_confirmation}
                    required
                  />

                  <p className="text-xs text-gray-400">
                    Password must be at least 6 characters with uppercase, lowercase, number, and special character.
                  </p>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={forcePwdLoading}
                    className="!bg-[#1877F2] hover:!bg-[#0f4fc5]"
                  >
                    {forcePwdLoading ? 'Saving...' : 'Set New Password'}
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-white">
      {/* SVG clip-path — quadratic bezier, stays within element bounds */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <clipPath id="leftPanelClip" clipPathUnits="objectBoundingBox">
            <path d="M 0,0 L 0.86,0 Q 1,0.5 0.86,1 L 0,1 Z" />
          </clipPath>
        </defs>
      </svg>

      {/* Top header bar */}
      <div className="hidden md:flex gap-3 px-6 py-3 md:flex-col lg:flex-row lg:items-center lg:justify-between bg-[#051637]">
        <div>
          <p className="text-[clamp(1.2rem,3vw,2.2rem)] font-semibold tracking-[0.35em] text-white">
            RBT BANK INC. <span className="text-[clamp(0.55rem,1.2vw,0.75rem)] tracking-[0.25em] text-white/70">(A Rural Bank of Talisayan, Misamis Oriental)</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 text-right sm:flex-row sm:items-center sm:gap-4">
          <div className="flex flex-col">
            <p className="text-2xl font-semibold text-white">{formattedTime}</p>
            <p className="text-sm text-white/70">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider uppercase border rounded-full border-white/25 bg-white/5">
            <span className="text-white/80">EN / PH</span>
          </div>
        </div>
      </div>

      {/* Body — flush full-width flex row, no outer padding */}
      <div className="flex flex-1">

        {/* ── Left panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative hidden md:flex w-[52%] flex-shrink-0 flex-col justify-center bg-gradient-to-br from-[#010713] via-[#053161] to-[#18a6ff] px-10 py-10 pr-20 text-white lg:px-14 lg:pr-28"
          style={{ clipPath: "url(#leftPanelClip)" }}
        >
          {/* Background layers */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 opacity-30 bg-[conic-gradient(from_140deg_at_15%_15%,rgba(255,255,255,0.4),transparent_50%)]" />
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 40px)",
              }}
            />
            <div className="absolute -top-16 -left-8 h-52 w-52 rounded-full bg-sky-400/15 blur-[70px]" />
            <div className="absolute -bottom-20 left-10 h-60 w-60 rounded-full bg-blue-600/20 blur-[90px]" />
            <motion.div
              animate={{ opacity: [0.18, 0.32, 0.18] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute right-0 top-1/2 h-48 w-32 -translate-y-1/2 bg-sky-300/20 blur-[60px]"
            />
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.12, 0.22, 0.12] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute left-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-white/10 blur-[80px]"
            />
          </div>

          {/* Content card */}
          <div className="relative z-10 flex flex-col gap-6 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(3,8,20,0.5)] backdrop-blur-md lg:p-8">
            {/* Section label */}
            <div className="flex items-center gap-2">
              <span className="inline-flex h-1.5 w-6 rounded-full bg-sky-400/80" />
              <p className="text-[10px] font-medium uppercase tracking-[0.65em] text-white/60">
                Client Signature Oversight
              </p>
            </div>

            {/* Logo + brand */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.14, 1], opacity: [0.15, 0.05, 0.15] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute h-72 w-72 rounded-full border border-sky-300/25 bg-sky-400/5"
                />
                <motion.div
                  animate={{ scale: [1, 1.08, 1], opacity: [0.22, 0.08, 0.22] }}
                  transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute h-56 w-56 rounded-full border border-white/20 bg-white/5"
                />
                <img
                  src={logo}
                  alt="RBT Bank SigCard Logo"
                  className="relative z-10 h-32 w-auto object-contain"
                />
              </div>

              <div className="flex flex-col items-center gap-2">
                <h2 className="text-2xl font-bold uppercase tracking-widest text-white drop-shadow-md">
                  SigCard System
                </h2>
                <p className="text-[10px] font-medium tracking-[0.4em] text-white/50">
                  RBT BANK INC. (A Rural Bank of Talisayan, Misamis Oriental)
                </p>
                <div className="flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1">
                  <HiShieldCheck className="h-3 w-3 text-sky-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-sky-200">
                    DIGICUR
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Description */}
            <p className="px-1 text-center text-xs leading-relaxed text-white/70">
              Manage every customer signature card from upload to approval.
              Every action is logged for Bangko Sentral ng Pilipinas standards.
            </p>

            {/* Feature pills */}
            <div className="flex flex-col gap-2">
              {[
                { icon: MdUploadFile, label: "Upload & Capture Sigcards" },
                { icon: MdVerified, label: "Verify Client Information" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/15">
                    <Icon className="h-3.5 w-3.5 text-sky-300" />
                  </span>
                  <span className="text-xs font-medium text-white/80">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Right panel ── */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-10"
        >
          <div className="w-full max-w-md space-y-4">
            {/* Logo + brand — mobile only */}
            <div className="flex flex-col items-center gap-2 md:hidden">
              <img src={logo} alt="Sigcard Logo" className="h-20 w-auto object-contain" />
              <div className="text-center">
                <p className="text-lg font-semibold tracking-[0.25em] text-slate-900">RBT BANK INC.</p>
                <p className="text-[10px] tracking-[0.4em] text-slate-500">(A Rural Bank of Talisayan, Misamis Oriental)</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(15,23,42,0.08)]">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                    Access credentials
                  </p>
                  <h3 className="text-2xl font-semibold text-slate-900">Sign in</h3>
                </div>

                {fromSessionExpired && !apiError && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    Your session has expired due to inactivity. Please sign in again.
                  </div>
                )}

                {apiError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {apiError}
                  </div>
                )}

                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  placeholder="name@bank.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  required
                  icon={<MdEmail />}
                />

                <Input
                  label="Password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  required
                  showPasswordToggle
                  icon={<MdLock />}
                />


                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  className="mt-2 !bg-slate-900 !text-white shadow-md shadow-slate-200 hover:!bg-slate-800 focus:!ring-slate-900"
                >
                  {loading ? "Verifying..." : "Sign in"}
                </Button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
