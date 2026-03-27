'use client';

import { useState, useEffect } from 'react';

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState([]);
  const [newTerm, setNewTerm] = useState('');
  const [newJurisdiction, setNewJurisdiction] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/keywords')
      .then(r => r.json())
      .then(data => {
        setKeywords(data.keywords || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTerm.trim()) return;
    const res = await fetch('/api/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term: newTerm.trim(), jurisdiction: newJurisdiction }),
    });
    const data = await res.json();
    if (data.success) {
      setKeywords(prev => [...prev, data.keyword]);
      setNewTerm('');
    }
  };

  const handleToggle = async (id, currentActive) => {
    await fetch('/api/keywords', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !currentActive }),
    });
    setKeywords(prev => prev.map(k => k.id === id ? { ...k, active: !currentActive } : k));
  };

  const handleDelete = async (id) => {
    await fetch(`/api/keywords?id=${id}`, { method: 'DELETE' });
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  return (
    <>
      <div className="page-header fade-in">
        <h1>Keywords</h1>
        <p>Monitor bills matching specific terms</p>
      </div>

      <form onSubmit={handleAdd} className="card fade-in" style={{ marginBottom: 'var(--space-4)' }}>
        <h3>Add Keyword</h3>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            placeholder="e.g., credit union, broadband, tax credit..."
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <select
            className="filter-select"
            value={newJurisdiction}
            onChange={(e) => setNewJurisdiction(e.target.value)}
          >
            <option value="ALL">All Jurisdictions</option>
            <option value="NE">Nebraska</option>
            <option value="US">U.S. Congress</option>
            <option value="CA">California</option>
            <option value="TX">Texas</option>
          </select>
          <button type="submit" className="btn btn-primary">+ Add Keyword</button>
        </div>
      </form>

      <div className="card fade-in">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Loading keywords...</p>
          </div>
        ) : keywords.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Jurisdiction</th>
                <th>Matches</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => (
                <tr key={kw.id} style={{ opacity: kw.active ? 1 : 0.5 }}>
                  <td><strong>{kw.term}</strong></td>
                  <td>{kw.jurisdiction === 'ALL' ? 'All' : kw.jurisdiction}</td>
                  <td>{kw.matchCount || 0}</td>
                  <td>
                    <button
                      className={`btn btn-ghost btn-sm`}
                      onClick={() => handleToggle(kw.id, kw.active)}
                      style={{ color: kw.active ? 'var(--color-support)' : 'var(--text-muted)' }}
                    >
                      {kw.active ? '● Active' : '○ Paused'}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(kw.id)} style={{ color: 'var(--color-oppose)' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔑</div>
            <h3>No keywords configured</h3>
            <p>Add keywords above to monitor bills matching specific terms.</p>
          </div>
        )}
      </div>
    </>
  );
}
