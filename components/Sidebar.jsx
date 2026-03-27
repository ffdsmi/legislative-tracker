'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    links: [
      { href: '/', label: 'Dashboard', icon: '📊' },
      { href: '/bills', label: 'Bill Explorer', icon: '📜' },
    ],
  },
  {
    title: 'Monitoring',
    links: [
      { href: '/watchlist', label: 'Watchlist', icon: '👁' },
      { href: '/keywords', label: 'Keywords', icon: '🔍' },
      { href: '/alerts', label: 'Alerts', icon: '🔔', badgeKey: 'alerts' },
    ],
  },
  {
    title: 'System',
    links: [
      { href: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚖️</div>
          <div className="sidebar-logo-text">
            <h1>LegisTracker</h1>
            <span>Legislative Monitor</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-link-icon">{link.icon}</span>
                  <span>{link.label}</span>
                  {link.badgeKey ? (
                    <span className="sidebar-badge">0</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{
        padding: 'var(--space-4) var(--space-6)',
        borderTop: '1px solid var(--border-primary)',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)',
      }}>
        v0.1.0 MVP
      </div>
    </aside>
  );
}
