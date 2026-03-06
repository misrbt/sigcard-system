import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MdMenu, MdAccountCircle, MdSettings, MdLogout } from 'react-icons/md';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants/roles';
import logo from '../../assets/images/logos.png';

const Header = ({ onSidebarToggle, isSidebarOpen, userRole }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.full_name || user?.firstname || userRole || 'User';
  const displayRole = ROLE_LABELS[userRole] ?? (userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : '');

  const handleLogout = async () => {
    setShowProfileMenu(false);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="bg-gradient-to-r from-[#01060f] via-[#05173a] to-[#020a1d] shadow-lg border-b border-white/10 sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2.5 sm:py-3.5">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={onSidebarToggle}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <MdMenu className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 lg:hidden min-w-0">
            <img src={logo} alt="Sigcard Logo" className="h-9 w-9 sm:h-11 sm:w-11 object-contain flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-white font-extrabold text-base sm:text-lg leading-tight tracking-widest truncate">SIGCARD</span>
              <span className="text-[#1877F2] font-bold text-xs sm:text-sm leading-tight tracking-widest truncate">SYSTEM</span>
            </div>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-xl xl:text-2xl font-bold text-white truncate tracking-wide">
              {userRole === 'admin' ? 'Admin Panel' : `${displayRole} Dashboard`}
            </h1>
          </div>
        </div>

        <div className="flex items-center flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 hover:bg-white/10 rounded-xl transition-colors"
              aria-label="Profile menu"
            >
              <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm flex-shrink-0">
                {(user?.firstname?.[0] ?? '') + (user?.lastname?.[0] ?? '') || <MdAccountCircle className="w-full h-full" />}
              </div>
              <span className="hidden md:block text-sm sm:text-base font-semibold text-white truncate max-w-[160px]">
                {displayName}
              </span>
            </button>

            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-20">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-br from-slate-50 to-white rounded-t-2xl">
                    <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{user?.email || `${displayRole} Account`}</p>
                  </div>
                  <Link
                    to="/admin/profile"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-gray-700 transition-colors"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <MdAccountCircle className="w-5 h-5 text-[#1877F2] flex-shrink-0" />
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                  <hr className="my-1 border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 w-full transition-colors rounded-b-2xl"
                  >
                    <MdLogout className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
