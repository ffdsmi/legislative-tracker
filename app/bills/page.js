'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const STATE_NAMES = {
  US: 'U.S. Congress', AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida',
  GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana',
  IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin',
  WY: 'Wyoming', DC: 'Washington D.C.',
};

export default function BillsPage() {
  const [search, setSearch] = useState('');
  const [trackedJurisdictions, setTrackedJurisdictions] = useState([]);
  const [activeStates, setActiveStates] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [source, setSource] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Load tracked jurisdictions from settings
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        const tracked = data.trackedJurisdictions || [];
        setTrackedJurisdictions(tracked);
        setActiveStates(tracked); // Start with all selected
      })
      .catch(() => {});
  }, []);

  const fetchBills = useCallback(async (searchQuery, stateCodes) => {
    if (stateCodes.length === 0) {
      setBills([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Fetch from all active states in parallel
      const fetches = stateCodes.map(async (stateCode) => {
        const params = new URLSearchParams({ state: stateCode });
        if (searchQuery.trim()) params.set('search', searchQuery.trim());

        const res = await fetch(`/api/bills?${params.toString()}`);
        const data = await res.json();
        if (data.error) return { bills: [], total: 0, state: stateCode, error: data.error };
        return {
          bills: (data.bills || []).map(b => ({ ...b, jurisdiction: stateCode })),
          total: data.total || 0,
          source: data.source || '',
          state: stateCode,
        };
      });

      const results = await Promise.all(fetches);
      const allBills = results.flatMap(r => r.bills);
      const totalCount = results.reduce((sum, r) => sum + r.total, 0);
      const errors = results.filter(r => r.error).map(r => `${r.state}: ${r.error}`);
      const src = results.find(r => r.source)?.source || '';

      setBills(allBills);
      setTotal(totalCount);
      setSource(src);
      if (errors.length > 0) setError(errors.join('; '));
      setHasSearched(true);
    } catch (err) {
      setError('Failed to fetch bills. Check your connection and API key.');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load: wait for settings, then fetch
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (activeStates.length > 0 && !initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchBills('', activeStates);
    }
  }, [activeStates, fetchBills]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchBills(search, activeStates);
  };

  const toggleState = (code) => {
    setActiveStates(prev => {
      const next = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      return next;
    });
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

      {/* Jurisdiction toggle buttons */}
      <div className="filter-bar fade-in" style={{ gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginRight: 'var(--space-2)' }}>
          Jurisdictions:
        </span>
        {trackedJurisdictions.map(code => {
          const isActive = activeStates.includes(code);
          return (
            <button
              key={code}
              onClick={() => toggleState(code)}
              style={{
                fontSize: 'var(--text-sm)',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: isActive ? '1px solid var(--accent)' : '1px dashed var(--border)',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontWeight: isActive ? 600 : 400,
                opacity: isActive ? 1 : 0.6,
              }}
            >
              {isActive ? '✓ ' : ''}{STATE_NAMES[code] || code}
            </button>
          );
        })}
        {trackedJurisdictions.length > 1 && (
          <>
            <span style={{ color: 'var(--border)', margin: '0 var(--space-1)' }}>|</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setActiveStates([...trackedJurisdictions])}
              style={{ fontSize: 'var(--text-xs)' }}
            >
              All
            </button>
          </>
        )}
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="filter-bar fade-in" style={{ marginTop: 'var(--space-2)' }}>
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

        <button type="submit" className="btn btn-primary" disabled={loading || activeStates.length === 0}>
          {loading ? 'Searching...' : 'Search'}
        </button>

        {hasSearched && !loading ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            {total.toLocaleString()} bills {activeStates.length > 1 ? `across ${activeStates.length} jurisdictions` : ''} {source === 'masterlist' ? `(showing ${bills.length})` : 'found'}
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
                {activeStates.length > 1 ? <th>State</th> : null}
                <th>Status</th>
                <th>Last Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.length > 0 ? (
                bills.map((bill) => (
                  <tr key={`${bill.jurisdiction || ''}-${bill.id}`}>
                    <td>
                      <Link href={`/bills/${bill.id}`} className="bill-number">
                        {bill.number}
                      </Link>
                    </td>
                    <td className="bill-title">{bill.title}</td>
                    {activeStates.length > 1 ? (
                      <td>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                          {bill.jurisdiction}
                        </span>
                      </td>
                    ) : null}
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
                  <td colSpan={activeStates.length > 1 ? 6 : 5}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      <h3>{activeStates.length === 0 ? 'No jurisdictions selected' : hasSearched ? 'No bills found' : 'Loading...'}</h3>
                      <p>{activeStates.length === 0 ? 'Select a jurisdiction above to browse bills.' : hasSearched ? 'Try a different search term or select another jurisdiction.' : 'Fetching bills from LegiScan...'}</p>
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
