import React, { memo, useCallback, useEffect, useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((current) => !current), []);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', closeOnDesktop);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('resize', closeOnDesktop);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    const shouldLockScroll = sidebarOpen && window.innerWidth < 1024;
    document.body.classList.toggle('drawer-open', shouldLockScroll);

    return () => {
      document.body.classList.remove('drawer-open');
    };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="app-shell__content">
        <Navbar onMenuToggle={toggleSidebar} />
        <main className="dashboard-main">
          <div className="dashboard-container">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default memo(DashboardLayout);
