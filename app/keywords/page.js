'use client';

import { useState } from 'react';

const DEMO_KEYWORDS = [
  { id: 1, term: 'broadband infrastructure', jurisdiction: 'All', isActive: true, matchCount: 3, lastMatch: '2026-03-25' },
  { id: 2, term: 'property tax', jurisdiction: 'Nebraska', isActive: true, matchCount: 7, lastMatch: '2026-03-24' },
  { id: 3, term: 'cybersecurity', jurisdiction: 'U.S. Congress', isActive: true, matchCount: 12, lastMatch: '2026-03-26' },
  { id: 4, term: 'renewable energy', jurisdiction: 'All', isActive: false, matchCount: 5, lastMatch: '2026-03-20' },
];

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState(DEMO_KEYWORDS);
  const [newTerm, setNewTerm] = useState('');
  const [newJurisdiction, setNewJurisdiction] = useState('All');

  const addKeyword = () => {
    if (newTerm.trim() === '') return;
    const keyword = {
      id: Date.now(),
      term: newTerm.trim(),
      jurisdiction: newJurisdiction,
      isActive: true,
      matchCount: 0,
      lastMatch: '-',
    };
    setKeywords((prev) => [keyword, ...prev]);
    setNewTerm('');
  };

  const toggleActive = (id) => {
    setKeywords((prev) =>
      prev.map((kw) => (kw.id === id ? { ...kw, isActive: !kw.isActive } : kw))
    );
  };

  const removeKeyword = (id) => {
    setKeywords((prev) => prev.filter((kw) => kw.id !== id));
  };

  return (
    <>
      <div className="page-header fade-in">
        <h1>Keyword Monitor</h1>
        <p>Define terms to watch for across all tracked legislation</p>
      </div>

      <div className="card fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Add New Keyword</div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--space-2)' }}>
              Keyword or Phrase
            </label>
            <input
              type="text"
              className="input"
              placeholder='e.g. "electric vehicle", "data privacy"'
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addKeyword(); }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-heading)', marginBottom: 'var(--space-2)' }}>
              Jurisdiction
            </label>
            <select
              className="filter-select"
              value={newJurisdiction}
              onChange={(e) => setNewJurisdiction(e.target.value)}
            >
              <option value="All">All Jurisdictions</option>
              <option value="U.S. Congress">U.S. Congress</option>
              <option value="Nebraska">Nebraska</option>
              <option value="California">California</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={addKeyword}>Add Keyword</button>
        </div>
      </div>

      <div className="card fade-in">
        <div className="card-header">
          <div className="card-title">Active Keywords</div>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            {keywords.filter((k) => k.isActive).length} active
          </span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Jurisdiction</th>
              <th>Matches</th>
              <th>Last Match</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw) => (
              <tr key={kw.id} style={{ opacity: kw.isActive ? 1 : 0.5 }}>
                <td>
                  <span className="keyword-chip">
                    🔍 {kw.term}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{kw.jurisdiction}</td>
                <td>
                  <span style={{ fontWeight: 600, color: kw.matchCount > 0 ? 'var(--text-accent)' : 'var(--text-muted)' }}>
                    {kw.matchCount}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {kw.lastMatch}
                </td>
                <td>
                  <button
                    className={`btn btn-sm ${kw.isActive ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => toggleActive(kw.id)}
                  >
                    {kw.isActive ? 'Active' : 'Paused'}
                  </button>
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeKeyword(kw.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
