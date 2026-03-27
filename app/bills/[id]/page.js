'use client';

import { useState } from 'react';
import Link from 'next/link';

const DEMO_BILL = {
  id: 1,
  number: 'HR 1234',
  title: 'Infrastructure Investment and Jobs Act Amendment',
  jurisdiction: 'U.S. Congress',
  session: '119th Congress',
  status: 'In Committee',
  introducedDate: '2026-03-10',
  lastActionDate: '2026-03-24',
  sponsors: ['Rep. John Smith (D-CA)', 'Rep. Jane Doe (R-TX)'],
  summary: 'This bill amends the Infrastructure Investment and Jobs Act to authorize additional funding for broadband infrastructure in underserved communities, strengthen cybersecurity requirements for critical infrastructure, and establish a grant program for state and local governments to modernize transportation systems.',
  sourceUrl: 'https://congress.gov/bill/119th-congress/house-bill/1234',
  versions: [
    { id: 1, label: 'Introduced', date: '2026-03-10', textPreview: 'SECTION 1. SHORT TITLE.\nThis Act may be cited as the "Infrastructure Investment and Jobs Act Amendment of 2026".\n\nSEC. 2. BROADBAND INFRASTRUCTURE.\n(a) Authorization of Appropriations.—There is authorized to be appropriated $5,000,000,000 for each of fiscal years 2027 through 2031 for broadband infrastructure development in underserved communities.\n(b) Grant Program.—The Secretary of Commerce shall establish a competitive grant program...' },
    { id: 2, label: 'Committee Amendment', date: '2026-03-24', textPreview: 'SECTION 1. SHORT TITLE.\nThis Act may be cited as the "Infrastructure Investment and Jobs Act Amendment of 2026".\n\nSEC. 2. BROADBAND INFRASTRUCTURE.\n(a) Authorization of Appropriations.—There is authorized to be appropriated $7,500,000,000 for each of fiscal years 2027 through 2032 for broadband infrastructure development in underserved and rural communities.\n(b) Grant Program.—The Secretary of Commerce, in coordination with the FCC, shall establish a competitive grant program...' },
  ],
};

const DIFF_LINES = [
  { type: 'context', text: 'SECTION 1. SHORT TITLE.' },
  { type: 'context', text: 'This Act may be cited as the "Infrastructure Investment' },
  { type: 'context', text: 'and Jobs Act Amendment of 2026".' },
  { type: 'context', text: '' },
  { type: 'context', text: 'SEC. 2. BROADBAND INFRASTRUCTURE.' },
  { type: 'removed', text: '(a) Authorization of Appropriations.—There is authorized to be appropriated $5,000,000,000 for each of fiscal years 2027 through 2031 for broadband infrastructure development in underserved communities.' },
  { type: 'added', text: '(a) Authorization of Appropriations.—There is authorized to be appropriated $7,500,000,000 for each of fiscal years 2027 through 2032 for broadband infrastructure development in underserved and rural communities.' },
  { type: 'removed', text: '(b) Grant Program.—The Secretary of Commerce shall establish a competitive grant program...' },
  { type: 'added', text: '(b) Grant Program.—The Secretary of Commerce, in coordination with the FCC, shall establish a competitive grant program...' },
];

export default function BillDetailPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [position, setPosition] = useState('watch');
  const bill = DEMO_BILL;

  return (
    <>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link href="/bills" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-3)', display: 'inline-flex' }}>
          ← Back to Bills
        </Link>
      </div>

      <div className="page-header fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <h1 style={{ marginBottom: 0 }}>{bill.number}</h1>
            <span className="badge badge-status">{bill.status}</span>
            <span className="badge badge-info">{bill.jurisdiction}</span>
          </div>
          <p style={{ maxWidth: 700 }}>{bill.title}</p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <select
            className="filter-select"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            style={{ minWidth: 120 }}
          >
            <option value="watch">👁 Watch</option>
            <option value="support">✅ Support</option>
            <option value="oppose">❌ Oppose</option>
            <option value="neutral">➖ Neutral</option>
          </select>
          <button className="btn btn-primary">+ Add to Watchlist</button>
        </div>
      </div>

      <div className="tabs fade-in">
        {['overview', 'versions', 'diff'].map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Summary</div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>
              {bill.summary}
            </p>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Details</div>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {[
                ['Session', bill.session],
                ['Introduced', bill.introducedDate],
                ['Last Action', bill.lastActionDate],
                ['Versions', `${bill.versions.length} versions`],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Sponsors</div>
                {bill.sponsors.map((s) => (
                  <div key={s} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 2 }}>{s}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'versions' ? (
        <div className="card fade-in">
          <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Version History</div>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {bill.versions.map((version) => (
              <div
                key={version.id}
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{version.label}</span>
                    <span style={{ marginLeft: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{version.date}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('diff')}>View Diff</button>
                </div>
                <pre style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.6,
                  maxHeight: 120,
                  overflow: 'hidden',
                }}>
                  {version.textPreview}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'diff' ? (
        <div className="card fade-in">
          <div className="card-header">
            <div className="card-title">Changes: Introduced → Committee Amendment</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <span className="badge badge-support">+2 additions</span>
              <span className="badge badge-oppose">-2 removals</span>
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            lineHeight: 1.8,
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
          }}>
            {DIFF_LINES.map((line, i) => (
              <div
                key={i}
                style={{
                  padding: '2px var(--space-4)',
                  background: line.type === 'added' ? 'var(--color-added-bg)' :
                    line.type === 'removed' ? 'var(--color-removed-bg)' : 'transparent',
                  borderLeft: line.type === 'added' ? '3px solid var(--color-added)' :
                    line.type === 'removed' ? '3px solid var(--color-removed)' : '3px solid transparent',
                  color: line.type === 'added' ? 'var(--color-added)' :
                    line.type === 'removed' ? 'var(--color-removed)' : 'var(--text-secondary)',
                }}
              >
                <span style={{ opacity: 0.5, marginRight: 'var(--space-3)', userSelect: 'none' }}>
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {line.text || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
