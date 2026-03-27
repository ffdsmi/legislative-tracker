'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function BillDetailPage() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchBill() {
      try {
        const res = await fetch(`/api/bills/${id}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setBill(data.bill);
          setVersions(data.versions || []);
        }
      } catch {
        setError('Failed to load bill details.');
      } finally {
        setLoading(false);
      }
    }
    fetchBill();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, animation: 'pulse 1.5s infinite' }}>📜</div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)' }}>Loading bill details...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-oppose)' }}>{error || 'Bill not found'}</p>
        <Link href="/bills" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }}>← Back to Bills</Link>
      </div>
    );
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: `History (${bill.history?.length || 0})` },
    { id: 'versions', label: `Text Versions (${versions.length})` },
    { id: 'sponsors', label: `Sponsors (${bill.sponsors?.length || 0})` },
    { id: 'votes', label: `Votes (${bill.votes?.length || 0})` },
  ];

  return (
    <>
      <Link href="/bills" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-3)' }}>← Back to Bills</Link>

      <div className="page-header fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h1>{bill.number}</h1>
          <span className="badge badge-status">{bill.status}</span>
          <span className="badge badge-jurisdiction">{bill.jurisdiction}</span>
        </div>
        <p>{bill.title}</p>
        {bill.description && bill.description !== bill.title ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>{bill.description}</p>
        ) : null}
      </div>

      <div className="tab-bar fade-in">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card fade-in" style={{ marginTop: 'var(--space-4)' }}>
        {activeTab === 'overview' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Session</strong>
              <p>{bill.session}</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Last Action</strong>
              <p>{bill.lastActionDate}</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{bill.lastAction}</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Introduced</strong>
              <p>{bill.introducedDate || 'N/A'}</p>
            </div>
            <div>
              <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Status Date</strong>
              <p>{bill.statusDate || 'N/A'}</p>
            </div>
            {bill.subjects?.length > 0 ? (
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Subjects</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  {bill.subjects.map((s) => (
                    <span key={s.subject_id || s} className="keyword-chip">{s.subject_name || s}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <div style={{ gridColumn: '1 / -1' }}>
              <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>External Links</strong>
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                {bill.url ? <a href={bill.url} target="_blank" rel="noopener noreferrer">LegiScan Page →</a> : null}
                {bill.stateLink ? <a href={bill.stateLink} target="_blank" rel="noopener noreferrer">State Legislature Page →</a> : null}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'history' ? (
          <div className="history-list">
            {bill.history?.length > 0 ? (
              bill.history.map((h, i) => (
                <div key={i} style={{ padding: 'var(--space-3) 0', borderBottom: i < bill.history.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', minWidth: 80 }}>{h.date}</span>
                    {h.chamber ? <span className="badge" style={{ fontSize: 'var(--text-xs)' }}>{h.chamber === 'H' ? 'House' : 'Senate'}</span> : null}
                    <span style={{ fontSize: 'var(--text-sm)' }}>{h.action}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No history available.</p>
            )}
          </div>
        ) : null}

        {activeTab === 'versions' ? (
          <div>
            {versions.length > 0 ? (
              versions.map((v, i) => (
                <div key={v.docId || i} style={{ marginBottom: 'var(--space-6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <strong>{v.type || `Version ${i + 1}`}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>{v.date}</span>
                    </div>
                    {v.url ? <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">View on State Site →</a> : null}
                  </div>
                  {v.text && v.mimeId !== 'application/pdf' ? (
                    <pre style={{
                      background: 'var(--bg-tertiary)',
                      padding: 'var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-xs)',
                      maxHeight: 400,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      border: '1px solid var(--border)',
                    }}>{v.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000)}</pre>
                  ) : v.text ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>📄 PDF document — <a href={v.url} target="_blank" rel="noopener noreferrer">view on state site</a>.</p>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{v.error || 'Text not available'}</p>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No text versions available for this bill.</p>
            )}
          </div>
        ) : null}

        {activeTab === 'sponsors' ? (
          <div>
            {bill.sponsors?.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Party</th><th>Role</th><th>District</th></tr>
                </thead>
                <tbody>
                  {bill.sponsors.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.party || '—'}</td>
                      <td>{s.role === 1 ? 'Primary' : 'Co-Sponsor'}</td>
                      <td>{s.district || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No sponsor information available.</p>
            )}
          </div>
        ) : null}

        {activeTab === 'votes' ? (
          <div>
            {bill.votes?.length > 0 ? (
              bill.votes.map((v, i) => (
                <div key={i} style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)' }}>
                  <div><strong>{v.desc}</strong> <span style={{ color: 'var(--text-muted)' }}>— {v.date}</span></div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-support)' }}>✓ Yea: {v.yea}</span>
                    <span style={{ color: 'var(--color-oppose)' }}>✗ Nay: {v.nay}</span>
                    <span style={{ color: 'var(--text-muted)' }}>— Absent: {v.absent}</span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No votes recorded yet.</p>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
