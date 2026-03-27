'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'change', label: 'Changes' },
  { value: 'keyword', label: 'Keywords' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => {
        setAlerts(data.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.read;
    if (filter === 'change') return a.type === 'change';
    if (filter === 'keyword') return a.type === 'keyword';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <>
      <div className="page-header fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Alerts</h1>
            <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}</p>
          </div>
          {unreadCount > 0 ? (
            <button className="btn btn-secondary" onClick={handleMarkAllRead}>Mark All as Read</button>
          ) : null}
        </div>
      </div>

      <div className="filter-bar fade-in">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`tab-btn ${filter === tab.value ? 'active' : ''}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card fade-in">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="alert-list">
            {filtered.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item ${alert.read ? '' : 'unread'}`}
                style={{ cursor: 'pointer' }}
                onClick={() => !alert.read && handleMarkRead(alert.id)}
              >
                <span className="alert-icon" style={{ fontSize: 20 }}>
                  {alert.type === 'change' ? '📝' : alert.type === 'keyword' ? '🔑' : '🔔'}
                </span>
                <div style={{ flex: 1 }}>
                  <strong>{alert.title}</strong>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{alert.message}</p>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                {alert.billId ? (
                  <Link
                    href={`/bills/${alert.billId}`}
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Bill →
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>{alerts.length === 0 ? 'No alerts yet' : 'No matching alerts'}</h3>
            <p>{alerts.length === 0 ? 'Ingest some bills from the Dashboard to generate alerts.' : 'Try a different filter.'}</p>
          </div>
        )}
      </div>
    </>
  );
}
