import { Link, useLocation } from "react-router-dom";
import {
  MdDashboard,
  MdPeople,
  MdSettings,
  MdHistory,
  MdSecurity,
  MdPersonSearch,
  MdAccountTree,
  MdBusiness,
  MdUploadFile,
  MdBarChart,
  MdDescription,
} from "react-icons/md";
import logo from "../../assets/images/logos.png";
import { useAuth } from "../../hooks/useAuth";

const Sidebar = ({ isOpen, userRole, onToggle }) => {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const menuItems = {
    admin: [
      { path: "/admin/dashboard",       icon: MdDashboard,   label: "Dashboard",          permission: null },
      { path: "/admin/users",           icon: MdPeople,      label: "Users",              permission: "view-users" },
      { path: "/admin/roles",           icon: MdSecurity,    label: "Roles & Permissions", permission: "view-roles" },
      { path: "/admin/audit-logs",      icon: MdHistory,     label: "Audit Logs",         permission: "view-audit-logs" },
      { path: "/admin/customers",       icon: MdPersonSearch, label: "Customer Profiles", permission: "view-customers" },
      { path: "/admin/upload",           icon: MdUploadFile,   label: "Upload Documents",   permission: "create-customers" },
      { path: "/admin/documents",        icon: MdDescription,  label: "Documents",          permission: "view-customer-documents" },
      { path: "/admin/reports",          icon: MdBarChart,     label: "Reports",            permission: "view-compliance-reports" },
      { path: "/admin/branches",        icon: MdBusiness,    label: "Branches",           permission: "manage-branch-operations" },
      { path: "/admin/data-management", icon: MdAccountTree, label: "Data Management",    permission: "backup-system" },
      { path: "/admin/settings",        icon: MdSettings,    label: "Settings",           permission: "view-system-settings" },
    ],
  };

  const currentMenu = (menuItems[userRole] || []).filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-gradient-to-b from-[#01060f] via-[#05173a] to-[#020a1d] shadow-2xl transition-all duration-300 ease-in-out
        ${isOpen ? "w-80 sm:w-96 lg:w-80" : "w-20"}
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="relative border-b border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm" style={{ minHeight: '7rem' }}>
            <div className="relative flex items-center h-full px-4 py-3">
              {isOpen ? (
                <div className="flex items-center w-full gap-3 sm:gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="p-1 transform hover:scale-105 transition-transform duration-300">
                      <img src={logo} alt="DIGICUR Logo" className="object-contain w-14 h-14 sm:w-20 sm:h-20" />
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-2xl font-extrabold leading-none tracking-widest text-white sm:text-3xl drop-shadow-xl">
                      DIGICUR
                    </span>
                    <span className="text-[#1877F2] font-bold text-[10px] sm:text-xs tracking-[0.2em] leading-tight mt-1">
                      DIGITAL CUSTOMER RECORD
                    </span>
                    <div className="h-px bg-gradient-to-r from-[#1877F2]/70 via-white/20 to-transparent rounded-full mt-1.5"></div>
                  </div>
                </div>
              ) : (
                <div className="relative mx-auto group">
                  <div className="absolute inset-0 transition-all bg-[#1877F2]/20 rounded-xl blur-lg group-hover:blur-xl"></div>
                  <div className="relative p-2 transition-transform duration-300 transform border border-white/20 rounded-lg shadow-xl bg-white/10 group-hover:scale-110">
                    <img src={logo} alt="DIGICUR Logo" className="object-contain w-9 h-9 sm:h-11 sm:w-11" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto sm:py-5 sm:px-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            <ul className="space-y-1.5 sm:space-y-2">
              {currentMenu.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          onToggle();
                        }
                      }}
                      className={`flex items-center gap-3 sm:gap-3.5 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl transition-all duration-200 ${
                        active
                          ? "bg-white text-[#1877F2] shadow-xl font-semibold scale-105"
                          : "text-white/75 hover:bg-white/10 hover:text-white hover:shadow-lg"
                      } ${!isOpen && "justify-center"}`}
                      title={!isOpen ? item.label : ""}
                    >
                      <Icon
                        className={`flex-shrink-0 transition-all ${
                          active ? "w-6 h-6 sm:w-7 sm:h-7" : "w-5 h-5 sm:w-6 sm:h-6"
                        }`}
                      />
                      {isOpen && (
                        <span className="text-sm font-medium truncate sm:text-base">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
