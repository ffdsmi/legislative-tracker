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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [watchedIds, setWatchedIds] = useState(new Set());

  // Initialization flag
  const hasLoadedSettings = useRef(false);

  // Load tracked jurisdictions from settings and restore session filters
  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/watchlist').then(r => r.json()),
    ]).then(([data, watchData]) => {
      const tracked = data.trackedJurisdictions || [];
      setTrackedJurisdictions(tracked);
      
      try {
        const savedStates = sessionStorage.getItem('billExplorer_states');
        const savedSearch = sessionStorage.getItem('billExplorer_search');
        const savedStatus = sessionStorage.getItem('billExplorer_statusFilter');
        
        if (savedStates) {
          setActiveStates(JSON.parse(savedStates));
        } else {
          setActiveStates(tracked);
        }
        
        if (savedSearch) setSearch(savedSearch);
        if (savedStatus) setStatusFilter(savedStatus);
      } catch (e) {
        setActiveStates(tracked);
      }

      const ids = new Set((watchData.items || []).map(i => String(i.billId)));
      setWatchedIds(ids);
      hasLoadedSettings.current = true;
    }).catch(() => {
      hasLoadedSettings.current = true;
    });
  }, []);

  // Save filters to session storage when they change (after initial load)
  useEffect(() => {
    if (!hasLoadedSettings.current) return;
    sessionStorage.setItem('billExplorer_states', JSON.stringify(activeStates));
  }, [activeStates]);

  useEffect(() => {
    if (!hasLoadedSettings.current) return;
    sessionStorage.setItem('billExplorer_search', search);
  }, [search]);

  useEffect(() => {
    if (!hasLoadedSettings.current) return;
    sessionStorage.setItem('billExplorer_statusFilter', statusFilter);
  }, [statusFilter]);

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

  // Initial load: wait for settings, then fetch with restored search terms
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (activeStates.length > 0 && !initialLoadDone.current && hasLoadedSettings.current) {
      initialLoadDone.current = true;
      fetchBills(search, activeStates);
    }
  }, [activeStates, search, fetchBills]);

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
        <p>Search and browse all tracked bills.</p>
      </div>

      {error ? (
        <div className="setup-banner fade-in" role="alert">
          <span aria-hidden="true">⚠️</span>
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
              aria-pressed={isActive}
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
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="input"
            placeholder="Search by keyword, bill number, or topic..."
            aria-label="Search bills by keyword, bill number, or topic"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="input" 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 'auto' }}
          aria-label="Filter by Status"
        >
          <option value="ALL">All Statuses</option>
          <option value="Introduced">Introduced</option>
          <option value="Engrossed">Engrossed</option>
          <option value="Enrolled">Enrolled</option>
          <option value="Passed">Passed</option>
          <option value="Vetoed">Vetoed</option>
          <option value="Failed">Failed</option>
        </select>

        <button type="submit" className="btn btn-primary" disabled={loading || activeStates.length === 0}>
          {loading ? 'Searching...' : 'Search'}
        </button>

        {hasSearched && !loading ? (
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            {total.toLocaleString()} tracked bills {activeStates.length > 1 ? `across ${activeStates.length} jurisdictions ` : ''}(showing {bills.filter(b => activeStates.includes(b.jurisdiction)).length})
          </span>
        ) : null}
      </form>

      <div className="card fade-in">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-4)', animation: 'pulse 1.5s infinite' }} aria-hidden="true">📜</div>
            <p style={{ color: 'var(--text-secondary)' }} role="status">Loading bills from database...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <caption className="sr-only">Bills from tracked jurisdictions</caption>
              <thead>
                <tr>
                  <th scope="col">Bill</th>
                  <th scope="col">Title</th>
                  {activeStates.length > 1 ? <th scope="col">State</th> : null}
                  <th scope="col">Status</th>
                  <th scope="col">Last Action</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {bills.filter(b => activeStates.includes(b.jurisdiction) && (statusFilter === 'ALL' || String(b.status).includes(statusFilter))).length > 0 ? (
                  bills.filter(b => activeStates.includes(b.jurisdiction) && (statusFilter === 'ALL' || String(b.status).includes(statusFilter))).map((bill) => (
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
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className={`btn btn-sm ${watchedIds.has(String(bill.id)) ? 'btn-ghost' : 'btn-secondary'}`}
                          aria-label={watchedIds.has(String(bill.id)) ? `Stop watching ${bill.number}` : `Watch ${bill.number}`}
                          onClick={async (e) => {
                            e.preventDefault();
                            const id = String(bill.id);
                            if (watchedIds.has(id)) {
                              await fetch(`/api/watchlist?billId=${bill.id}`, { method: 'DELETE' });
                              setWatchedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
                            } else {
                              await fetch('/api/watchlist', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ billId: bill.id, billNumber: bill.number, title: bill.title, jurisdiction: bill.jurisdiction || activeStates[0] }),
                              });
                              setWatchedIds(prev => new Set(prev).add(id));
                            }
                          }}
                          style={{ fontSize: 'var(--text-xs)', marginRight: 'var(--space-1)' }}
                        >
                          {watchedIds.has(String(bill.id)) ? '✓ Watching' : '👁 Watch'}
                        </button>
                        <Link href={`/bills/${bill.id}`} className="btn btn-ghost btn-sm">View →</Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={activeStates.length > 1 ? 6 : 5}>
                      <div className="empty-state">
                        <div className="empty-state-icon" aria-hidden="true">🔍</div>
                        <h3>{activeStates.length === 0 ? 'No jurisdictions selected' : hasSearched ? 'No bills found' : 'Loading...'}</h3>
                        <p>{activeStates.length === 0 ? 'Select a jurisdiction above to browse bills.' : hasSearched ? 'Try a different search term or select another jurisdiction.' : 'Loading bills...'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
