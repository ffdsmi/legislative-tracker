'use client';

import { useState } from 'react';
import Link from 'next/link';

const POSITION_OPTIONS = [
  { value: '', label: 'All Positions' },
  { value: 'support', label: '✅ Support' },
  { value: 'oppose', label: '❌ Oppose' },
  { value: 'watch', label: '👁 Watch' },
  { value: 'neutral', label: '➖ Neutral' },
];

const DEMO_WATCHLIST = [
  { id: 1, billNumber: 'HR 1234', title: 'Infrastructure Investment and Jobs Act Amendment', jurisdiction: 'U.S. Congress', status: 'In Committee', position: 'support', hasChanges: true, lastChecked: '2 hours ago' },
  { id: 2, billNumber: 'LB 567', title: 'Nebraska Clean Energy Transition Act', jurisdiction: 'Nebraska', status: 'Introduced', position: 'watch', hasChanges: false, lastChecked: '1 hour ago' },
  { id: 3, billNumber: 'SB 890', title: 'Data Privacy and Consumer Protection Act', jurisdiction: 'California', status: 'Floor Vote', position: 'oppose', hasChanges: true, lastChecked: '30 min ago' },
];

const POSITION_BADGE_MAP = {
  support: 'badge-support',
  oppose: 'badge-oppose',
  watch: 'badge-watch',
  neutral: 'badge-neutral',
};

const POSITION_LABEL_MAP = {
  support: '✅ Support',
  oppose: '❌ Oppose',
  watch: '👁 Watch',
  neutral: '➖ Neutral',
};

export default function WatchlistPage() {
  const [positionFilter, setPositionFilter] = useState('');
  const [items, setItems] = useState(DEMO_WATCHLIST);

  const filteredItems = items.filter((item) =>
    positionFilter === '' || item.position === positionFilter
  );

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <>
      <div className="page-header fade-in">
        <h1>Watchlist</h1>
        <p>Bills you&apos;re actively monitoring for changes</p>
      </div>

      <div className="filter-bar fade-in">
        <select
          className="filter-select"
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
        >
          {POSITION_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
          {filteredItems.length} of {items.length} items
        </span>
      </div>

      {filteredItems.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }} className="stagger">
          {filteredItems.map((item) => (
            <div key={item.id} className="card fade-in" style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                    <Link href={`/bills/${item.id}`} style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>
                      {item.billNumber}
                    </Link>
                    <span className={`badge ${POSITION_BADGE_MAP[item.position]}`}>
                      {POSITION_LABEL_MAP[item.position]}
                    </span>
                    <span className="badge badge-status">{item.status}</span>
                    {item.hasChanges ? (
                      <span className="badge badge-watch">⚡ Changed</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {item.jurisdiction} · Last checked {item.lastChecked}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {item.hasChanges ? (
                    <Link href={`/bills/${item.id}`} className="btn btn-primary btn-sm">View Diff</Link>
                  ) : null}
                  <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card fade-in">
          <div className="empty-state">
            <div className="empty-state-icon">👁</div>
            <h3>No bills in your watchlist</h3>
            <p>Browse bills and add them to your watchlist to monitor for changes.</p>
            <Link href="/bills" className="btn btn-primary">Browse Bills</Link>
          </div>
        </div>
      )}
    </>
  );
}
