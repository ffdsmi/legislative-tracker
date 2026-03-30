'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import GlobalSearch from '@/components/GlobalSearch';

export default function ClientLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <GlobalSearch />
      
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Mobile header */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
          LegisTracker
        </span>
        <div style={{ width: 44 }} aria-hidden="true" />
      </header>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content" id="main-content">
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
}
