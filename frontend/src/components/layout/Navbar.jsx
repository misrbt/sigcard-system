import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineX,
} from "react-icons/hi";
import logo from "../../assets/images/logos.png";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_LABELS } from "../../constants/roles";

const defaultNavLinks = [
  { to: "/user/dashboard",  label: "Home"              },
  { to: "/user/upload",     label: "Upload"            },
  { to: "/user/customers",  label: "Customer Profiles" },
];

const Navbar = ({ navLinks = defaultNavLinks }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user, getPrimaryRole, logout, loading } = useAuth();

  const roleLabel = ROLE_LABELS[getPrimaryRole()] ?? getPrimaryRole() ?? "User";

  const getInitials = () => {
    const first = user?.firstname?.[0] ?? "";
    const last  = user?.lastname?.[0]  ?? "";
    return (first + last).toUpperCase() || "?";
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 bg-gradient-to-br from-[#01060f] via-[#05173a] to-[#020a1d] text-white shadow-lg shadow-slate-900/30">
        <div className="w-full px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo Section */}
            <Link
              to="/user/dashboard"
              className="flex items-center gap-4 transition-transform hover:scale-105"
            >
              <img src={logo} alt="Sigcard Logo" className="w-auto h-10" />
              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-[0.45em] text-white/70">
                  Sigcard System
                </p>
                <p className="text-xl font-semibold tracking-wide">RBTBK</p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="items-center hidden gap-8 lg:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="relative text-xl font-medium text-white/80 transition-colors hover:text-white after:absolute after:bottom-[-4px] after:left-0 after:h-0.5 after:w-0 after:bg-white after:transition-all hover:after:w-full"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right Section - Notifications & Profile */}
            <div className="flex items-center gap-4">
              {/* Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 p-1 pr-4 transition-all rounded-full hover:bg-white/10"
                >
                  {/* Avatar */}
                  <div className="flex items-center justify-center w-10 h-10 font-semibold text-white rounded-full shadow-lg bg-gradient-to-br from-blue-500 to-purple-600">
                    {loading ? null : user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.full_name}
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      getInitials()
                    )}
                  </div>
                  {/* User Info - Hidden on small screens */}
                  <div className="hidden text-left lg:block">
                    {loading ? (
                      <div className="space-y-1.5">
                        <div className="h-3 w-24 rounded-full bg-white/20 animate-pulse" />
                        <div className="h-2.5 w-16 rounded-full bg-white/10 animate-pulse" />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-white">{user?.full_name}</p>
                        <p className="text-xs text-white/60">{roleLabel}</p>
                      </>
                    )}
                  </div>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 w-64 mt-3 bg-white border shadow-2xl rounded-2xl border-white/10"
                    >
                      {/* User Info in Dropdown */}
                      <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-12 h-12 font-semibold text-white rounded-full shadow-md bg-gradient-to-br from-blue-500 to-purple-600">
                            {user?.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.full_name}
                                className="object-cover w-full h-full rounded-full"
                              />
                            ) : (
                              getInitials()
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-semibold truncate text-slate-900">
                              {user?.full_name}
                            </p>
                            <p className="text-sm truncate text-slate-500">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Items */}
                      <div className="p-2">
                        <Link
                          to="/user/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 transition-colors rounded-xl text-slate-700 hover:bg-slate-50"
                        >
                          <HiOutlineUser className="w-5 h-5 text-slate-500" />
                          <span className="font-medium">My Profile</span>
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-slate-100">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full gap-3 px-4 py-3 text-red-600 transition-colors rounded-xl hover:bg-red-50"
                        >
                          <HiOutlineLogout className="w-5 h-5" />
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 transition-all rounded-lg text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
              >
                {isMobileMenuOpen ? (
                  <HiOutlineX className="w-6 h-6" />
                ) : (
                  <HiOutlineMenu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-white/10 lg:hidden"
              >
                <div className="py-4 space-y-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 text-base font-medium transition-colors rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
      <div className="h-16" />
    </>
  );
};

export default Navbar;
