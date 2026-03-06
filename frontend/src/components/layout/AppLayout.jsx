import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const AppLayout = ({ children, userRole }) => {
  // Sidebar should be closed on mobile by default, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Set initial sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setIsSidebarOpen(isDesktop);
    };

    // Set initial state
    handleResize();

    // Listen for window resize with debounce
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        userRole={userRole}
        onToggle={toggleSidebar}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-20'}`}>
        {/* Header */}
        <Header
          onSidebarToggle={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          userRole={userRole}
        />

        {/* Main Content Area */}
        <main className="min-h-screen p-3 sm:p-4 md:p-6 pb-20 sm:pb-24 md:pb-32">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>

        {/* Fixed Footer */}
        <Footer />
      </div>

      {/* Mobile Sidebar Overlay - Only show on mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
          aria-label="Close sidebar overlay"
        />
      )}
    </div>
  );
};

export default AppLayout;