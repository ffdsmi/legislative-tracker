'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    links: [
      { href: '/', label: 'Dashboard', icon: '📊' },
      { href: '/bills', label: 'Bill Explorer', icon: '📜' },
      { href: '/regulations', label: 'Regulatory Rules', icon: '🏛️' },
    ],
  },
  {
    title: 'Monitoring',
    links: [
      { href: '/watchlist', label: 'Watchlist', icon: '👁' },
      { href: '/keywords', label: 'Keywords', icon: '🔍' },
      { href: '/compare', label: 'Compare Bills', icon: '⚖️' },
      { href: '/alerts', label: 'Alerts', icon: '🔔', badgeKey: 'alerts' },
    ],
  },
  {
    title: 'Organization',
    links: [
      { href: '/collections', label: 'Collections', icon: '📁' },
    ],
  },
  {
    title: 'Awareness',
    links: [
      { href: '/calendar', label: 'Calendar', icon: '📅' },
      { href: '/legislators', label: 'Directory', icon: '👔' },
    ],
  },
  {
    title: 'Advocacy',
    links: [
      { href: '/testimony', label: 'Testimony', icon: '✍️' },
    ],
  },
  {
    title: 'System',
    links: [
      { href: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const fetchAlerts = () => {
      fetch('/api/alerts')
        .then(r => r.json())
        .then(data => setAlertCount(data.unread || 0))
        .catch(() => {});
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon" aria-hidden="true">⚖️</div>
            <div className="sidebar-logo-text">
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                LegisTracker
              </div>
              <span>Legislative Monitor</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="sidebar-section" role="group" aria-label={section.title}>
              <div className="sidebar-section-title" aria-hidden="true">{section.title}</div>
              {section.links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`sidebar-link ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={onClose}
                  >
                    <span className="sidebar-link-icon" aria-hidden="true">{link.icon}</span>
                    <span>{link.label}</span>
                    {link.badgeKey === 'alerts' && alertCount > 0 ? (
                      <span className="sidebar-badge" aria-label={`${alertCount} unread alerts`}>
                        {alertCount}
                      </span>
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
        }} aria-label="Application version">
          v0.5.0 — Phase 5
        </div>
      </aside>
    </>
  );
}
