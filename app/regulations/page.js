'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function RegulationsContent() {
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [agencyFilter, setAgencyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'commentEndDate', direction: 'asc' });

  useEffect(() => {
    fetchDockets();
  }, []);

  const fetchDockets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/regulations');
      if (!res.ok) throw new Error('Failed to fetch dockets');
      const data = await res.json();
      setRules(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/regulations/sync', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sync');
      }
      const data = await res.json();
      if (data.newCount > 0) {
        alert(`Synced ${data.newCount} new dockets!`);
      }
      await fetchDockets();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedRules = [...rules]
    .filter(rule => {
      const matchesSearch = rule.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            rule.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAgency = agencyFilter === 'ALL' || rule.agency === agencyFilter;
      const matchesStatus = statusFilter === 'ALL' || rule.status === statusFilter;
      
      const typeLower = (rule.type || '').toLowerCase();
      const matchesType = typeFilter === 'ALL' || typeLower.includes(typeFilter.toLowerCase());
      
      return matchesSearch && matchesAgency && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      
      if (sortConfig.key === 'commentEndDate') {
        aVal = aVal ? new Date(aVal).getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
        bVal = bVal ? new Date(bVal).getTime() : (sortConfig.direction === 'asc' ? Infinity : -Infinity);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <>
      <div className="page-header fade-in">
        <h1>Regulatory Rules</h1>
        <p>Monitor dockets, notices, and proposed rulemakings from official federal agencies.</p>
      </div>

      <div className="card fade-in">
        {error && <div className="toast toast-error">{error}</div>}
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="input"
            placeholder="Search by Title or Docket ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: '1 1 300px' }}
          />
          <select 
            className="input" 
            value={agencyFilter}
            onChange={(e) => setAgencyFilter(e.target.value)}
            style={{ flex: '0 0 auto', maxWidth: '200px' }}
            aria-label="Filter by Agency"
          >
            <option value="ALL">All Agencies</option>
            <option value="NCUA">NCUA (Credit Union Admin)</option>
            <option value="CFPB">CFPB (Financial Protection)</option>
            <option value="FDIC">FDIC</option>
          </select>
          <select 
            className="input" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ flex: '0 0 auto', maxWidth: '180px' }}
            aria-label="Filter by Status"
          >
            <option value="ALL">All Statuses</option>
            <option value="Open for Comment">Open for Comment</option>
            <option value="Closed">Closed</option>
          </select>
          <select 
            className="input" 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ flex: '0 0 auto', maxWidth: '180px' }}
            aria-label="Filter by Type"
          >
            <option value="ALL">All Types</option>
            <option value="Rule">Rule</option>
            <option value="Proposed">Proposed</option>
            <option value="Notice">Notice</option>
          </select>
          <button 
            className="btn btn-primary" 
            aria-label="Refresh dockets"
            onClick={handleSync}
            disabled={syncing}
          >
            <span aria-hidden="true">{syncing ? '⏳' : '🔄'}</span> 
            {syncing ? 'Syncing...' : 'Sync Regulations.gov'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Loading regulations...</div>
        ) : processedRules.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <caption className="sr-only">Regulatory Dockets</caption>
              <thead>
                <tr style={{ userSelect: 'none' }}>
                  <th scope="col" style={{ width: '15%', cursor: 'pointer' }} onClick={() => handleSort('id')}>
                    Docket ID {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th scope="col" style={{ width: '8%', cursor: 'pointer' }} onClick={() => handleSort('agency')}>
                    Agency {sortConfig.key === 'agency' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th scope="col" style={{ width: '37%', cursor: 'pointer' }} onClick={() => handleSort('title')}>
                    Title {sortConfig.key === 'title' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th scope="col" style={{ width: '12%', cursor: 'pointer' }} onClick={() => handleSort('type')}>
                    Type {sortConfig.key === 'type' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th scope="col" style={{ width: '15%', cursor: 'pointer' }} onClick={() => handleSort('commentEndDate')}>
                    Deadline {sortConfig.key === 'commentEndDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th scope="col" style={{ width: '13%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {processedRules.map((rule) => {
                  const isOpen = rule.status === 'Open for Comment';
                  const isClosed = rule.status === 'Closed';
                  
                  return (
                    <tr key={rule.id}>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>{rule.id}</strong>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem', padding: '0.125rem 0.375rem' }}>
                          {rule.agency}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{rule.title}</span>
                      </td>
                      <td>{rule.type}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>{rule.commentEndDate ? new Date(rule.commentEndDate).toLocaleDateString() : '—'}</span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: isOpen ? 'var(--color-support)' : isClosed ? 'var(--text-muted)' : 'var(--color-watch)' 
                          }}>
                            {rule.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Link href={`/regulations/${rule.id}`} className="btn btn-secondary btn-sm" aria-label={`View docket ${rule.id} details`}>
                          View Details
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">⚖️</div>
            <h3>No rulemakings found</h3>
            <p>We couldn't find any regulatory dockets matching your criteria. Try syncing from Regulations.gov.</p>
            {agencyFilter !== 'ALL' && (
              <button className="btn btn-secondary" onClick={() => setAgencyFilter('ALL')} style={{ marginTop: 'var(--space-3)' }}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function RegulationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>Loading...</div>}>
      <RegulationsContent />
    </Suspense>
  );
}
