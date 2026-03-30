'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'change', label: 'Changes' },
  { value: 'keyword', label: 'Keywords' },
];

const GROUP_OPTIONS = [
  { value: 'none', label: 'No Grouping' },
  { value: 'date', label: 'By Date' },
  { value: 'bill', label: 'By Bill' },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [groupBy, setGroupBy] = useState('none');
  const [loading, setLoading] = useState(true);
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(data => {
        setAlerts(data.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleSelection = (id) => {
    setSelectedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleRead = async (id, currentRead) => {
    const newRead = !currentRead;
    await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: newRead }),
    });
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: newRead } : a));
  };

  const handleBulkChange = async (readState) => {
    const ids = Array.from(selectedAlerts);
    await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, read: readState }),
    });
    setAlerts(prev => prev.map(a => ids.includes(a.id) ? { ...a, read: readState } : a));
    setSelectedAlerts(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedAlerts.size} selected alerts?`)) return;
    const ids = Array.from(selectedAlerts).join(',');
    const res = await fetch(`/api/alerts?ids=${ids}`, { method: 'DELETE' });
    const data = await res.json();
    setAlerts(data.alerts || []);
    setSelectedAlerts(new Set());
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/alerts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };

  const handleDeleteRead = async () => {
    if (!confirm('Delete all read alerts?')) return;
    const res = await fetch('/api/alerts?mode=read', { method: 'DELETE' });
    const data = await res.json();
    setAlerts(data.alerts || []);
  };

  const handleDeleteOne = async (id) => {
    const res = await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    setAlerts(data.alerts || []);
  };

  const filtered = alerts.filter(a => {
    if (filter === 'unread') return !a.read;
    if (filter === 'change') return a.type === 'change';
    if (filter === 'keyword') return a.type === 'keyword';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.read).length;
  const readCount = alerts.filter(a => a.read).length;

  // Grouping
  const grouped = () => {
    if (groupBy === 'none') return [{ key: 'all', label: null, items: filtered }];

    if (groupBy === 'date') {
      const groups = {};
      filtered.forEach(a => {
        const date = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Unknown';
        if (!groups[date]) groups[date] = [];
        groups[date].push(a);
      });
      return Object.entries(groups).map(([key, items]) => ({ key, label: key, items }));
    }

    if (groupBy === 'bill') {
      const groups = {};
      filtered.forEach(a => {
        const key = a.billNumber || a.billId || 'Unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(a);
      });
      return Object.entries(groups).map(([key, items]) => ({ key, label: key, items }));
    }

    return [{ key: 'all', label: null, items: filtered }];
  };

  return (
    <>
      <div className="page-header fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Alerts</h1>
            <p>{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {readCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleDeleteRead} style={{ color: 'var(--color-oppose)' }}>
                🗑 Clear Read ({readCount})
              </button>
            )}
            {unreadCount > 0 && (
              <button className="btn btn-secondary" onClick={handleMarkAllRead}>Mark All as Read</button>
            )}
          </div>
        </div>
      </div>

      <div className="filter-bar fade-in" role="tablist" aria-label="Alert filters">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`tab-btn ${filter === tab.value ? 'active' : ''}`}
            onClick={() => setFilter(tab.value)}
            role="tab"
            aria-selected={filter === tab.value}
          >
            {tab.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <select className="filter-select" value={groupBy} onChange={e => setGroupBy(e.target.value)} aria-label="Group alerts by">
          {GROUP_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {selectedAlerts.size > 0 && (
        <div className="card fade-in" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--accent-primary-glow)', borderColor: 'var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: 'var(--text-heading)' }}>{selectedAlerts.size} alert{selectedAlerts.size !== 1 && 's'} selected</strong>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-primary btn-sm" onClick={() => handleBulkChange(false)}>Mark Unread</button>
            <button className="btn btn-secondary btn-sm" style={{ background: 'var(--bg-card)', color: 'var(--text-heading)' }} onClick={() => handleBulkChange(true)}>Mark Read</button>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-oppose)' }} onClick={handleBulkDelete}>Delete</button>
          </div>
        </div>
      )}

      <div className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'center', padding: '0 var(--space-3)' }}>
                    <input
                      type="checkbox"
                      checked={selectedAlerts.size === filtered.length && filtered.length > 0}
                      onChange={() => {
                        if (selectedAlerts.size === filtered.length) setSelectedAlerts(new Set());
                        else setSelectedAlerts(new Set(filtered.map(a => a.id)));
                      }}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                      title="Select All"
                    />
                  </th>
                  <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Date</th>
                  <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Type</th>
                  <th style={{ width: '1%', whiteSpace: 'nowrap' }}>Bill</th>
                  <th style={{ width: 'auto' }}>Description</th>
                  <th style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'right', paddingRight: 'var(--space-4)' }}>Actions</th>
                </tr>
              </thead>
              {grouped().map(group => (
                <tbody key={group.key}>
                  {group.label && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--bg-secondary)', fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {group.label} ({group.items.length})
                      </td>
                    </tr>
                  )}
                  {group.items.map((alert) => {
                    const isExpanded = expandedAlerts.has(alert.id);
                    return (
                      <React.Fragment key={alert.id}>
                        <tr className={selectedAlerts.has(alert.id) ? 'selected' : ''} style={{ background: selectedAlerts.has(alert.id) ? 'var(--accent-primary-glow)' : 'transparent' }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedAlerts.has(alert.id)}
                              onChange={() => toggleSelection(alert.id)}
                              style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                            />
                          </td>
                          <td>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleRead(alert.id, alert.read); }}
                              className={`badge ${alert.read ? 'badge-neutral' : 'badge-info'}`}
                              style={{ border: 'none', cursor: 'pointer', minWidth: 70, justifyContent: 'center' }}
                              title={alert.read ? 'Click to mark Unread' : 'Click to mark Read'}
                            >
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: alert.read ? 'var(--text-muted)' : 'var(--color-info)', flexShrink: 0, marginRight: 4 }} />
                              {alert.read ? 'Read' : 'Unread'}
                            </button>
                          </td>
                          <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : ''}
                          </td>
                          <td style={{ fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>
                            <span style={{ marginRight: 6 }}>{alert.type === 'change' ? '📝' : alert.type === 'keyword' ? '🔑' : '🔔'}</span>
                            <span style={{ textTransform: 'capitalize' }}>{alert.type}</span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {alert.billId ? (
                               <Link href={`/bills/${alert.billId}`} style={{ fontWeight: 600, color: 'var(--text-heading)' }} onClick={() => { if (!alert.read) handleToggleRead(alert.id, alert.read); }}>
                                 {alert.billNumber || alert.billId.substring(0,8)}
                               </Link>
                            ) : '-'}
                          </td>
                          <td style={{ maxWidth: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong style={{ fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{alert.title}</strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                  {alert.message}
                                </p>
                                <button onClick={() => toggleExpand(alert.id)} className="btn btn-ghost btn-sm" style={{ padding: '0 4px', fontSize: '10px', height: 'auto', minHeight: 0, flexShrink: 0 }}>
                                  {isExpanded ? '▼ Hide' : '▶ Expand'}
                                </button>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: 'var(--space-4)' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDeleteOne(alert.id)}
                              style={{ color: 'var(--color-oppose)', padding: 'var(--space-1) var(--space-2)' }}
                              title={`Delete alert: ${alert.title}`}
                            >
                              × Delete
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: 'var(--bg-secondary)' }}>
                            <td colSpan={2}></td>
                            <td colSpan={5} style={{ padding: 'var(--space-3) var(--space-4)' }}>
                              <div style={{ borderLeft: '3px solid var(--accent-primary)', paddingLeft: 'var(--space-3)' }}>
                                <strong style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Full Alert Details</strong>
                                <p style={{ fontSize: 'var(--text-sm)', margin: 0, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                  {alert.message}
                                </p>
                                <div style={{ marginTop: 'var(--space-3)' }}>
                                  {alert.billId && (
                                    <Link href={`/bills/${alert.billId}`} className="btn btn-secondary btn-sm" onClick={() => { if (!alert.read) handleToggleRead(alert.id, alert.read); }}>
                                      View Bill Document →
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">🔔</div>
            <h3>{alerts.length === 0 ? 'No alerts yet' : 'No matching alerts'}</h3>
            <p>{alerts.length === 0 ? 'Ingest some bills from the Dashboard to generate alerts.' : 'Try a different filter.'}</p>
          </div>
        )}
      </div>
    </>
  );
}
