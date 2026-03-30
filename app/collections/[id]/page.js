'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CollectionDetailPage() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [colRes, billsRes] = await Promise.all([
          fetch('/api/collections'),
          fetch(`/api/collections/${id}/bills`),
        ]);
        const colData = await colRes.json();
        const billsData = await billsRes.json();
        const col = (colData.collections || []).find(c => c.id === id);
        setCollection(col);
        setBills(billsData.bills || []);
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleRemove = async (billId) => {
    try {
      await fetch(`/api/collections/${id}/bills?billId=${billId}`, { method: 'DELETE' });
      setBills(prev => prev.filter(b => String(b.billId) !== String(billId)));
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading collection...</p>
      </div>
    );
  }

  return (
    <>
      <Link href="/collections" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-3)' }}>
        ← Back to Collections
      </Link>

      <div className="page-header fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: 'var(--space-1)' }}>📁 {collection?.name || 'Collection'}</h1>
          {collection?.description && <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{collection.description}</p>}
        </div>
        <div>
          <Link href={`/collections/${id}/advocacy`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span>📄 Build Advocacy Packet</span>
          </Link>
        </div>
      </div>

      <div className="card fade-in">
        {bills.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Title</th>
                  <th>Jurisdiction</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.billId}>
                    <td>
                      <Link href={`/bills/${b.billId}`} className="bill-number">
                        {b.billNumber || b.billId}
                      </Link>
                    </td>
                    <td className="bill-title">{b.billTitle || '—'}</td>
                    <td>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                        {b.jurisdiction || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {b.addedAt ? new Date(b.addedAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRemove(b.billId)}
                        style={{ color: 'var(--color-oppose)' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <h3>No bills in this collection</h3>
            <p>Go to a bill detail page and use "Add to Collection" to add bills here.</p>
          </div>
        )}
      </div>
    </>
  );
}
