import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const AppLayout = ({ children, userRole }) => {
  // Mobile overlay — closed by default, never persisted
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Desktop collapse — persisted in localStorage, default expanded
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; }
    catch { return false; }
  });

  // Close mobile overlay when viewport grows past lg breakpoint
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setIsMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleMobile = () => setIsMobileOpen(p => !p);

  const toggleDesktopCollapse = () => {
    setIsDesktopCollapsed(p => {
      const next = !p;
      try { localStorage.setItem('sidebar-collapsed', String(next)); } catch { /* noop */ }
      return next;
    });
  };

  // Hamburger: mobile → overlay toggle; desktop → collapse toggle
  const handleHeaderToggle = () => {
    if (window.innerWidth < 1024) toggleMobile();
    else toggleDesktopCollapse();
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <Sidebar
        isMobileOpen={isMobileOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        onMobileClose={toggleMobile}
        onDesktopToggle={toggleDesktopCollapse}
        userRole={userRole}
      />

      {/* Main area — no margin on mobile (sidebar is overlay), left margin on desktop */}
      <div className={`
        transition-[margin-left] duration-300 ease-in-out
        ${isDesktopCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}
      `}>
        <Header onSidebarToggle={handleHeaderToggle} userRole={userRole} />

        <main className="min-h-screen p-3 sm:p-4 md:p-6 pb-20 sm:pb-24 md:pb-32">
          <div className="w-full">{children}</div>
        </main>

        <Footer />
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={toggleMobile}
          aria-label="Close sidebar"
        />
      )}

    </div>
  );
};

export default AppLayout;
