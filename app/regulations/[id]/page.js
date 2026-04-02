'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function RegulationDetailPage() {
  const { id } = useParams();
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchRule() {
      try {
        const res = await fetch('/api/regulations'); // Re-using MVP collector endpoint
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        const found = data.find(r => r.id === id);
        if (found) {
          setRule(found);
        } else if (id === 'NCUA-2026-0014') {
          // Demo fallback for the mock alert on the dashboard
          setRule({
            id: 'NCUA-2026-0014',
            title: 'Fidelity Bonds for Corporate Credit Unions',
            agency: 'NCUA',
            type: 'Proposed Rule',
            status: 'Open for Comment',
            commentEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            documentUrl: 'https://www.regulations.gov/document/NCUA-2026-0014'
          });
        } else {
          setError('Regulatory document not found.');
        }
      } catch (err) {
        setError('Failed to load document.');
      } finally {
        setLoading(false);
      }
    }
    fetchRule();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, animation: 'pulse 1.5s infinite' }}>⚖️</div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)' }}>Loading document details...</p>
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-oppose)' }}>{error || 'Document not found'}</p>
        <Link href="/regulations" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }}>← Back to Regulations</Link>
      </div>
    );
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'text', label: 'Full Text (Phase 7)' },
    { id: 'annotations', label: 'Annotations (Phase 7)' },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <Link href="/regulations" className="btn btn-ghost btn-sm">← Back to Regulations</Link>
      </div>

      <div className="page-header fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h1>{rule.id}</h1>
          <span className="badge badge-status" style={{ backgroundColor: rule.status === 'Open for Comment' ? '#ecfdf5' : 'var(--bg-tertiary)', color: rule.status === 'Open for Comment' ? '#059669' : 'var(--text-muted)' }}>
            {rule.status}
          </span>
          <span className="badge badge-info">{rule.agency}</span>
          <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)' }}>{rule.type}</span>
        </div>
        <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 500, marginTop: 'var(--space-3)' }}>{rule.title}</h2>
      </div>

      <div className="tab-bar fade-in" role="tablist" aria-label="Regulatory details">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="fade-in" style={{ marginTop: 'var(--space-4)' }}>
        {activeTab === 'overview' && (
          <div className="card" role="tabpanel">
            <div className="settings-grid-row">
              <div>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Agency</strong>
                <p>{rule.agency}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Document Type</strong>
                <p>{rule.type}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Deadline / Status Date</strong>
                <p>{rule.commentEndDate ? new Date(rule.commentEndDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>External Document</strong>
                <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  {rule.documentUrl ? (
                    <a href={rule.documentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                      Review Rulemaking on Regulations.gov →
                    </a>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>No external link available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="card" role="tabpanel">
             <div className="empty-state">
                <div style={{ fontSize: 32, marginBottom: 'var(--space-2)' }} aria-hidden="true">📄</div>
                <h3 style={{ marginBottom: 'var(--space-2)' }}>Federal Register Parsing (Phase 7)</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
                  Native extraction and diffing of monolithic Federal Register PDFs directly inside this dashboard is slated for Phase 7. 
                  <br /><br />
                  Currently, please use the Regulations.gov external link on the Overview tab to download and read the full text.
                </p>
              </div>
          </div>
        )}

        {activeTab === 'annotations' && (
          <div className="card" role="tabpanel">
             <div className="empty-state">
                <div style={{ fontSize: 32, marginBottom: 'var(--space-2)' }} aria-hidden="true">💬</div>
                <h3 style={{ marginBottom: 'var(--space-2)' }}>Regulatory Annotations (Phase 7)</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto' }}>
                  Semantic highlighting, threaded commenting, and markup redlining for Federal Regulations will unlock once the Phase 7 Text Engine is deployed.
                </p>
              </div>
          </div>
        )}
      </div>
    </>
  );
}
