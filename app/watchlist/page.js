'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const POSITION_LABELS = {
  support: { label: 'Support', color: 'var(--color-support)' },
  oppose: { label: 'Oppose', color: 'var(--color-oppose)' },
  watch: { label: 'Watch', color: 'var(--color-watch)' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Positions' },
  { value: 'support', label: 'Support' },
  { value: 'oppose', label: 'Oppose' },
  { value: 'watch', label: 'Watch' },
];

export default function WatchlistPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/watchlist')
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRemove = async (billId) => {
    await fetch(`/api/watchlist?billId=${billId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => String(i.billId) !== String(billId)));
  };

  const handlePositionChange = async (billId, position) => {
    await fetch('/api/watchlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billId, position }),
    });
    setItems(prev => prev.map(i =>
      String(i.billId) === String(billId) ? { ...i, position } : i
    ));
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.position === filter);

  return (
    <>
      <div className="page-header fade-in">
        <h1>Watchlist</h1>
        <p>Bills you are actively tracking</p>
      </div>

      <div className="filter-bar fade-in">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`tab-btn ${filter === opt.value ? 'active' : ''}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label} {opt.value === 'all' ? `(${items.length})` : `(${items.filter(i => i.position === opt.value).length})`}
          </button>
        ))}
      </div>

      <div className="card fade-in">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, animation: 'pulse 1.5s infinite' }}>👁</div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading watchlist...</p>
          </div>
        ) : filtered.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Title</th>
                <th>Position</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.billId}>
                  <td>
                    <Link href={`/bills/${item.billId}`} className="bill-number">{item.billNumber}</Link>
                  </td>
                  <td className="bill-title">{item.title}</td>
                  <td>
                    <select
                      className="filter-select"
                      value={item.position || 'watch'}
                      onChange={(e) => handlePositionChange(item.billId, e.target.value)}
                      style={{ minWidth: 100 }}
                    >
                      <option value="support">Support</option>
                      <option value="oppose">Oppose</option>
                      <option value="watch">Watch</option>
                    </select>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                    {item.addedAt ? new Date(item.addedAt).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(item.billId)} style={{ color: 'var(--color-oppose)' }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👁</div>
            <h3>{items.length === 0 ? 'No bills on your watchlist' : 'No matching bills'}</h3>
            <p>{items.length === 0 ? 'Browse bills and click "Add to Watchlist" to start tracking.' : 'Try a different filter.'}</p>
            {items.length === 0 ? <Link href="/bills" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>Browse Bills</Link> : null}
          </div>
        )}
      </div>
    </>
  );
}
