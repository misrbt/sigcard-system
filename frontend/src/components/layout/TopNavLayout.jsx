import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdDescription,
  MdPeople,
  MdAccountCircle,
  MdLogout,
  MdMenu,
  MdClose,
  MdTimeline,
  MdBarChart,
  MdUploadFile,
} from "react-icons/md";
import { ROLE_LABELS } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import { useAppConfig } from "../../context/AppConfigContext";
import logo from "../../assets/images/logos.png";
import Footer from "./Footer";
import { confirmNavigation } from "../../utils/navigationGuard";

const NAV_ITEMS = {
  manager: [
    { path: "/manager/dashboard", icon: MdDashboard,   label: "Dashboard", permission: null },
    { path: "/manager/customers", icon: MdPeople,      label: "Customers", permission: "view-customers" },
    { path: "/manager/upload",    icon: MdUploadFile,  label: "Upload",    permission: "create-customers" },
    { path: "/manager/documents", icon: MdDescription, label: "Documents", permission: "view-customer-documents" },
  ],
  cashier: [
    { path: "/cashier/dashboard", icon: MdDashboard,   label: "Dashboard", permission: null },
    { path: "/cashier/customers", icon: MdPeople,      label: "Customers", permission: "view-customers" },
    { path: "/cashier/documents", icon: MdDescription, label: "Documents", permission: "view-customer-documents" },
  ],
  compliance: [
    { path: "/compliance/dashboard",  icon: MdDashboard,   label: "Dashboard",         permission: null },
    { path: "/compliance/audit-logs", icon: MdTimeline,    label: "Audit Logs",        permission: "view-audit-logs" },
    { path: "/compliance/reports",    icon: MdBarChart,    label: "Reports",           permission: "view-compliance-reports" },
    { path: "/compliance/customers",  icon: MdPeople,      label: "Customer Profiles", permission: "view-customers" },
    { path: "/compliance/documents",  icon: MdDescription, label: "Documents",         permission: "view-customer-documents" },
  ],
  audit: [
    { path: "/compliance/dashboard",  icon: MdDashboard,   label: "Dashboard",         permission: null },
    { path: "/compliance/audit-logs", icon: MdTimeline,    label: "Audit Logs",        permission: "view-audit-logs" },
    { path: "/compliance/reports",    icon: MdBarChart,    label: "Reports",           permission: "view-compliance-reports" },
    { path: "/compliance/customers",  icon: MdPeople,      label: "Customer Profiles", permission: "view-customers" },
    { path: "/compliance/documents",  icon: MdDescription, label: "Documents",         permission: "view-customer-documents" },
  ],
};

const TopNavLayout = ({ children, userRole }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const { app_abbreviation, app_name, app_logo_url } = useAppConfig();
  const logoSrc = app_logo_url || logo;
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = (NAV_ITEMS[userRole] || []).filter(
    (item) => !item.permission || hasPermission(item.permission)
  );
  const displayName = user?.full_name || user?.firstname || "User";

  const PROFILE_PATHS = {
    manager:    "/manager/profile",
    cashier:    "/cashier/profile",
    compliance: "/compliance/profile",
    audit:      "/compliance/profile",
  };
  const profilePath = PROFILE_PATHS[userRole] ?? "/profile";
  const displayRole = ROLE_LABELS[userRole] ?? (userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
    : "");

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    if (!(await confirmNavigation())) return;
    setShowProfileMenu(false);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  // Confirms with any registered page guard (e.g. an unfinished status-change upload)
  // before following a nav link, instead of silently discarding unsaved work.
  const guardedNavigate = async (e, path, afterConfirm) => {
    e.preventDefault();
    if (!(await confirmNavigation())) return;
    afterConfirm?.();
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-gradient-to-r from-[#010713] via-[#053161] to-[#051637] sticky top-0 z-30 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <img
                src={logoSrc}
                alt={`${app_abbreviation} Logo`}
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
              />
              <div className="flex flex-col leading-none">
                <span className="text-white font-extrabold text-sm tracking-wide">
                  {app_abbreviation}
                </span>
                <span className="text-blue-300 font-semibold text-[10px] tracking-widest">
                  {app_name}
                </span>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={(e) => guardedNavigate(e, item.path)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-[#1877F2] text-white shadow-sm"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Profile + Mobile toggle */}
            <div className="flex items-center gap-2">
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <MdAccountCircle className="w-8 h-8 text-blue-300" />
                  <div className="hidden sm:flex flex-col items-start leading-none">
                    <span className="text-sm font-semibold text-white truncate max-w-[140px]">
                      {displayName}
                    </span>
                    <span className="text-xs text-blue-300">{displayRole}</span>
                  </div>
                </button>

                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {user?.email}
                        </p>
                      </div>
                      <Link
                        to={profilePath}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-gray-700 transition-colors"
                        onClick={(e) => guardedNavigate(e, profilePath, () => setShowProfileMenu(false))}
                      >
                        <MdAccountCircle className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">Profile</span>
                      </Link>
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 w-full transition-colors"
                      >
                        <MdLogout className="w-4 h-4" />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {mobileMenuOpen ? (
                  <MdClose className="w-5 h-5 text-white" />
                ) : (
                  <MdMenu className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#051637] px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => guardedNavigate(e, item.path, () => setMobileMenuOpen(false))}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#1877F2] text-white"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default TopNavLayout;
