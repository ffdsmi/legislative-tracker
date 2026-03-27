'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const STATE_OPTIONS = [
  { value: 'NE', label: 'Nebraska' },
  { value: 'US', label: 'U.S. Congress' },
  { value: 'CA', label: 'California' },
  { value: 'TX', label: 'Texas' },
  { value: 'NY', label: 'New York' },
  { value: 'CO', label: 'Colorado' },
  { value: 'FL', label: 'Florida' },
  { value: 'IL', label: 'Illinois' },
];

export default function BillsPage() {
  const [search, setSearch] = useState('');
  const [state, setState] = useState('NE');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchBills = useCallback(async (searchQuery, stateCode) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ state: stateCode });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/bills?${params.toString()}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setBills([]);
      } else {
        setBills(data.bills || []);
        setTotal(data.total || 0);
        setSource(data.source || '');
      }
      setHasSearched(true);
    } catch (err) {
      setError('Failed to fetch bills. Check your connection and API key.');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load master list on mount and when state changes
  useEffect(() => {
    fetchBills('', state);
  }, [state, fetchBills]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBills(search, state);
  };

  return (
    <>
      <div className="page-header fade-in">
        <h1>Bill Explorer</h1>
        <p>Search and browse bills from LegiScan</p>
      </div>

      {error ? (
        <div className="setup-banner fade-in">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      <form onSubmit={handleSearch} className="filter-bar fade-in">
        <div className="search-bar" style={{ flex: 1, maxWidth: 500 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="input"
            placeholder="Search by keyword, bill number, or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          {STATE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>

        {hasSearched && !loading ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            {total} bills {source === 'masterlist' ? `(showing ${bills.length})` : 'found'}
          </span>
        ) : null}
      </form>

      <div className="card fade-in">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-4)', animation: 'pulse 1.5s infinite' }}>📜</div>
            <p style={{ color: 'var(--text-secondary)' }}>Fetching bills from LegiScan...</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Title</th>
                <th>Status</th>
                <th>Last Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.length > 0 ? (
                bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>
                      <Link href={`/bills/${bill.id}`} className="bill-number">
                        {bill.number}
                      </Link>
                    </td>
                    <td className="bill-title">{bill.title}</td>
                    <td>
                      <span className="badge badge-status">{bill.status}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: 250 }}>
                      <div>{bill.lastAction}</div>
                      {bill.lastActionText ? (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>
                          {bill.lastActionText}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <Link href={`/bills/${bill.id}`} className="btn btn-ghost btn-sm">View →</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      <h3>{hasSearched ? 'No bills found' : 'Loading...'}</h3>
                      <p>{hasSearched ? 'Try a different search term or select another state.' : 'Fetching bills from LegiScan...'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
