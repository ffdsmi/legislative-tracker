'use client';

import { useState } from 'react';
import Link from 'next/link';

const DEMO_ALERTS = [
  { id: 1, type: 'change', billNumber: 'HR 1234', message: 'New committee amendment version available for HR 1234', isRead: false, createdAt: '2026-03-26 14:30' },
  { id: 2, type: 'keyword', billNumber: 'SB 890', keyword: 'data privacy', message: 'Keyword "data privacy" matched in SB 890 — Data Privacy and Consumer Protection Act', isRead: false, createdAt: '2026-03-26 12:15' },
  { id: 3, type: 'change', billNumber: 'LB 567', message: 'Status changed: LB 567 moved from "Introduced" to "In Committee"', isRead: false, createdAt: '2026-03-25 16:45' },
  { id: 4, type: 'keyword', billNumber: 'HR 2345', keyword: 'cybersecurity', message: 'Keyword "cybersecurity" matched in HR 2345 — Federal Cybersecurity Enhancement Act', isRead: true, createdAt: '2026-03-25 10:00' },
  { id: 5, type: 'new', billNumber: 'LB 789', message: 'New bill matching keyword "property tax": LB 789 — Property Tax Exemption Amendment', isRead: true, createdAt: '2026-03-24 09:30' },
];

const ALERT_ICONS = {
  change: '📝',
  keyword: '🔍',
  new: '🆕',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [filter, setFilter] = useState('all');

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unread') return !alert.isRead;
    if (filter === 'changes') return alert.type === 'change';
    if (filter === 'keywords') return alert.type === 'keyword';
    return true;
  });

  const markAsRead = (id) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
  };

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  };

  return (
    <>
      <div className="page-header fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Alerts</h1>
          <p>{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 ? (
          <button className="btn btn-secondary" onClick={markAllRead}>
            Mark All as Read
          </button>
        ) : null}
      </div>

      <div className="tabs fade-in">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'changes', label: 'Changes' },
          { key: 'keywords', label: 'Keywords' },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab ${filter === t.key ? 'active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-3)' }} className="stagger">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="card fade-in"
              style={{
                padding: 'var(--space-4) var(--space-5)',
                borderLeft: alert.isRead ? undefined : '3px solid var(--accent-primary)',
                opacity: alert.isRead ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: 20, marginTop: 1 }}>{ALERT_ICONS[alert.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                    {alert.message}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {alert.createdAt}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Link href={`/bills/1`} className="btn btn-ghost btn-sm">View</Link>
                  {!alert.isRead ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => markAsRead(alert.id)}>
                      ✓ Read
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card fade-in">
            <div className="empty-state">
              <div className="empty-state-icon">🔔</div>
              <h3>No alerts</h3>
              <p>You&apos;re all caught up! Alerts will appear here when bills change or keywords match.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
