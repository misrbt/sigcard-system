import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineShieldCheck,
  HiOutlineIdentification,
  HiOutlineOfficeBuilding,
  HiOutlineLocationMarker,
  HiOutlineBriefcase,
  HiOutlinePhone,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDesktopComputer,
} from "react-icons/hi";
import { useAuth } from "../../hooks/useAuth";

const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  "compliance-audit": "Compliance Audit",
  user: "User",
  cashier: "Cashier",
};

const statusStyles = {
  active:   "bg-emerald-50 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  suspended:"bg-red-50 text-red-600",
};

const Profile = () => {
  const { user, getPrimaryRole } = useAuth();
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
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <HiOutlineCheckCircle className="h-[18px] w-[18px] text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Two-Factor Auth</p>
              <p className={`mt-0.5 text-sm font-semibold ${user?.two_factor_enabled ? "text-emerald-600" : "text-slate-400"}`}>
                {user?.two_factor_enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Profile;
