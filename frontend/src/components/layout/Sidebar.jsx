import { Link, useLocation } from "react-router-dom";
import {
  MdDashboard, MdPeople, MdSettings, MdHistory, MdSecurity,
  MdPersonSearch, MdAccountTree, MdBusiness, MdUploadFile,
  MdBarChart, MdDescription, MdChevronLeft, MdChevronRight, MdClose,
} from "react-icons/md";
import logo from "../../assets/images/logos.png";
import { useAuth } from "../../hooks/useAuth";

// ── Navigation groups ─────────────────────────────────────────────────────────
const NAV_GROUPS = {
  admin: [
    {
      label: "Overview",
      items: [
        { path: "/admin/dashboard", icon: MdDashboard, label: "Dashboard", permission: null },
      ],
    },
    {
      label: "Customers",
      items: [
        { path: "/admin/customers", icon: MdPersonSearch, label: "Customer Profiles",  permission: "view-customers" },
        { path: "/admin/upload",    icon: MdUploadFile,   label: "Upload Documents",   permission: "create-customers" },
        { path: "/admin/documents", icon: MdDescription,  label: "Documents",          permission: "view-customer-documents" },
      ],
    },
    {
      label: "Administration",
      items: [
        { path: "/admin/users",      icon: MdPeople,   label: "Users",               permission: "view-users" },
        { path: "/admin/roles",      icon: MdSecurity, label: "Roles & Permissions", permission: "view-roles" },
        { path: "/admin/audit-logs", icon: MdHistory,  label: "Audit Logs",          permission: "view-audit-logs" },
        { path: "/admin/reports",    icon: MdBarChart, label: "Reports",             permission: "view-compliance-reports" },
      ],
    },
    {
      label: "System",
      items: [
        { path: "/admin/branches",        icon: MdBusiness,    label: "Branches",        permission: "manage-branch-operations" },
        { path: "/admin/data-management", icon: MdAccountTree, label: "Data Management", permission: "backup-system" },
        { path: "/admin/settings",        icon: MdSettings,    label: "Settings",        permission: "view-system-settings" },
      ],
    },
  ],
};

// ── Tooltip wrapper (shown only when sidebar is icon-only) ────────────────────
const NavTooltip = ({ label, children }) => (
  <div className="relative group/tip flex">
    {children}
    <div
      className="
        pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[999]
        bg-[#0d1b3e] border border-white/20 text-white text-xs font-medium
        px-3 py-1.5 rounded-lg whitespace-nowrap shadow-2xl
        opacity-0 group-hover/tip:opacity-100 scale-95 group-hover/tip:scale-100
        transition-all duration-150
      "
    >
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-[#0d1b3e]" />
    </div>
  </div>
);

// ── Single nav item ───────────────────────────────────────────────────────────
const NavItem = ({ item, isActive, isCollapsed, onNavClick }) => {
  const Icon = item.icon;
  const active = isActive(item.path);

  const linkEl = (
    <Link
      to={item.path}
      onClick={onNavClick}
      title=""
      className={`
        relative flex items-center gap-3 rounded-xl
        transition-all duration-200 select-none
        ${isCollapsed
          ? 'w-11 h-11 justify-center mx-auto'
          : 'px-3 py-2.5 mx-2'
        }
        ${active
          ? isCollapsed
            ? 'bg-[#1877F2] text-white shadow-lg shadow-[#1877F2]/30'
            : 'bg-white text-[#1877F2] shadow-md shadow-black/20 font-semibold'
          : 'text-white/60 hover:bg-white/[0.07] hover:text-white'
        }
      `}
    >
      {/* Active pill indicator (expanded mode) */}
      {active && !isCollapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[22px] bg-[#1877F2] rounded-full -ml-2" />
      )}
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      {!isCollapsed && (
        <span className="text-sm font-medium leading-none truncate">{item.label}</span>
      )}
    </Link>
  );

  if (isCollapsed) {
    return <NavTooltip label={item.label}>{linkEl}</NavTooltip>;
  }
  return linkEl;
};

// ── Main Sidebar ──────────────────────────────────────────────────────────────
const Sidebar = ({ isMobileOpen, isDesktopCollapsed, onMobileClose, onDesktopToggle, userRole }) => {
  const location  = useLocation();
  const { hasPermission } = useAuth();

  const groups = NAV_GROUPS[userRole] || [];
  const filteredGroups = groups
    .map(g => ({
      ...g,
      items: g.items.filter(it => !it.permission || hasPermission(it.permission)),
    }))
    .filter(g => g.items.length > 0);

  const isActive = (path) => location.pathname === path;

  // ── Shared inner content ──────────────────────────────────────────────────
  const SidebarInner = ({ collapsed, onNavClick }) => (
    <div className="flex flex-col h-full">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className={`
        flex-shrink-0 border-b border-white/[0.07]
        transition-all duration-300
        ${collapsed ? 'px-0 py-5' : 'px-5 py-4'}
      `}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-[#1877F2]/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-2 rounded-xl border border-white/10 bg-white/5">
                <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 p-1.5 rounded-xl border border-white/10 bg-white/5">
              <img src={logo} alt="Logo" className="w-9 h-9 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-extrabold text-xl tracking-widest leading-none">DIGICUR</p>
              <p className="text-[#1877F2] text-[9px] font-bold tracking-[0.18em] mt-1 leading-none">
                DIGITAL CUSTOMER RECORD
              </p>
              <div className="mt-1.5 h-px bg-gradient-to-r from-[#1877F2]/60 via-white/15 to-transparent rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="space-y-0.5">
          {filteredGroups.map((group, gi) => (
            <div key={gi}>
              {/* Section divider + label */}
              {gi > 0 && (
                <div className={`${collapsed ? 'px-3' : 'px-4'} pt-3 pb-1.5`}>
                  <div className="border-t border-white/[0.07]" />
                  {!collapsed && (
                    <p className="mt-2.5 text-[10px] font-bold tracking-[0.18em] text-white/30 uppercase px-2">
                      {group.label}
                    </p>
                  )}
                </div>
              )}
              {gi === 0 && !collapsed && (
                <p className="px-6 pb-1.5 text-[10px] font-bold tracking-[0.18em] text-white/30 uppercase">
                  {group.label}
                </p>
              )}

              {/* Items */}
              <ul className={`space-y-0.5 ${collapsed ? 'px-2' : ''}`}>
                {group.items.map(item => (
                  <li key={item.path}>
                    <NavItem
                      item={item}
                      isActive={isActive}
                      isCollapsed={collapsed}
                      onNavClick={onNavClick}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Desktop collapse toggle ───────────────────────────────────────── */}
      {onDesktopToggle && (
        <div className="flex-shrink-0 border-t border-white/[0.07]">
          <button
            onClick={onDesktopToggle}
            className={`
              w-full flex items-center py-3.5
              text-white/35 hover:text-white hover:bg-white/[0.05]
              transition-all duration-200 group
              ${collapsed ? 'justify-center' : 'justify-between px-5'}
            `}
          >
            {!collapsed && (
              <span className="text-[11px] font-medium tracking-wide">Collapse sidebar</span>
            )}
            {collapsed
              ? <MdChevronRight className="text-lg group-hover:translate-x-0.5 transition-transform" />
              : <MdChevronLeft  className="text-lg group-hover:-translate-x-0.5 transition-transform" />
            }
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside
        className={`
          hidden lg:flex flex-col fixed top-0 left-0 z-50 h-screen
          bg-gradient-to-b from-[#01060f] via-[#05173a] to-[#020a1d]
          shadow-[4px_0_24px_rgba(0,0,0,0.4)] overflow-hidden
          transition-[width] duration-300 ease-in-out
          ${isDesktopCollapsed ? 'w-[72px]' : 'w-[260px]'}
        `}
      >
        <SidebarInner collapsed={isDesktopCollapsed} onNavClick={null} />
      </aside>

      {/* ── Mobile sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`
          flex lg:hidden flex-col fixed top-0 left-0 z-50 h-screen w-[272px]
          bg-gradient-to-b from-[#01060f] via-[#05173a] to-[#020a1d]
          shadow-[4px_0_24px_rgba(0,0,0,0.5)] overflow-hidden
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <MdClose className="text-lg" />
        </button>

        <SidebarInner collapsed={false} onNavClick={onMobileClose} />
      </aside>
    </>
  );
};

export default Sidebar;
