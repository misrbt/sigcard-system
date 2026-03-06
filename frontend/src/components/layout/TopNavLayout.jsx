import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdDescription,
  MdVerifiedUser,
  MdPeople,
  MdAssessment,
  MdTrendingUp,
  MdReceipt,
  MdAccountBalance,
  MdAccountCircle,
  MdLogout,
  MdMenu,
  MdClose,
  MdTimeline,
} from "react-icons/md";
import { ROLE_LABELS } from "../../constants/roles";
import { useAuth } from "../../hooks/useAuth";
import logo from "../../assets/images/logos.png";
import Footer from "./Footer";

const NAV_ITEMS = {
  user: [
    { path: "/user", icon: MdDashboard, label: "Dashboard" },
    { path: "/user/documents", icon: MdDescription, label: "Documents" },
    { path: "/user/signatures", icon: MdVerifiedUser, label: "Signatures" },
    { path: "/user/customers", icon: MdPeople, label: "Customers" },
  ],
  manager: [
    { path: "/manager/dashboard",  icon: MdDashboard,   label: "Dashboard"  },
    { path: "/manager/customers",  icon: MdPeople,      label: "Customers"  },
    { path: "/manager/documents",  icon: MdDescription, label: "Documents"  },
  ],
  cashier: [
    { path: "/cashier/dashboard",  icon: MdDashboard,   label: "Dashboard"  },
    { path: "/cashier/customers",  icon: MdPeople,      label: "Customers"  },
    { path: "/cashier/documents",  icon: MdDescription, label: "Documents"  },
  ],
  "compliance-audit": [
    { path: "/compliance/dashboard",  icon: MdDashboard, label: "Dashboard"         },
    { path: "/compliance/audit-logs", icon: MdTimeline,  label: "Audit Logs"        },
    { path: "/compliance/customers",  icon: MdPeople,    label: "Customer Profiles" },
  ],
};

const TopNavLayout = ({ children, userRole }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = NAV_ITEMS[userRole] || [];
  const displayName = user?.full_name || user?.firstname || "User";

  const PROFILE_PATHS = {
    manager:           "/manager/profile",
    cashier:           "/cashier/profile",
    "compliance-audit": "/compliance/profile",
  };
  const profilePath = PROFILE_PATHS[userRole] ?? "/profile";
  const displayRole = ROLE_LABELS[userRole] ?? (userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
    : "");

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    setShowProfileMenu(false);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
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
                src={logo}
                alt="SigCard Logo"
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
              />
              <div className="flex flex-col leading-none">
                <span className="text-white font-extrabold text-sm tracking-wide">
                  SIGCARD SYSTEM
                </span>
                <span className="text-blue-300 font-semibold text-[10px] tracking-widest">
                  RBTBK
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
                        onClick={() => setShowProfileMenu(false)}
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
                  onClick={() => setMobileMenuOpen(false)}
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
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-24">
        {children}
      </main>

      <Footer />
    </div>
  );
};

export default TopNavLayout;
