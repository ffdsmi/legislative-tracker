'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export default function LegislatorsPage() {
  const [legislators, setLegislators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedParty, setSelectedParty] = useState('');
  const [selectedChamber, setSelectedChamber] = useState('');
  const [trackedStates, setTrackedStates] = useState([]);
  
  // Modal state
  const [selectedLeg, setSelectedLeg] = useState(null);
  const [legDetails, setLegDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fetchLegislators = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/legislators', window.location.origin);
      if (search) url.searchParams.append('search', search);
      if (selectedState) url.searchParams.append('state', selectedState);
      if (selectedParty) url.searchParams.append('party', selectedParty);
      if (selectedChamber) url.searchParams.append('chamber', selectedChamber);
      
      const res = await fetch(url);
      const data = await res.json();
      setLegislators(data.legislators || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.trackedJurisdictions) {
          const list = [...data.trackedJurisdictions];
          if (!list.includes('US')) list.push('US');
          setTrackedStates(list);
        } else {
          setTrackedStates(['US']);
        }
      })
      .catch(() => { setTrackedStates(['US']); });
  }, []);

  useEffect(() => {
    const delay = setTimeout(fetchLegislators, 300);
    return () => clearTimeout(delay);
  }, [search, selectedState, selectedParty, selectedChamber]);
  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress(null);
    try {
      const res = await fetch('/api/legislators/sync', { method: 'POST' });
      if (!res.ok) throw new Error('API Error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let currentText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        currentText += decoder.decode(value, { stream: true });
        const lines = currentText.split('\n');
        currentText = lines.pop(); // keep remainder
        for (const line of lines) {
          if (line.trim()) {
            const data = JSON.parse(line);
            if (data.type === 'progress' || data.type === 'start') {
              setSyncProgress(data);
            } else if (data.type === 'error') {
              console.error(data.message);
            }
          }
        }
      }

      await fetchLegislators();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncProgress(null), 3000);
    }
  };

  const openDetails = async (leg) => {
    setSelectedLeg(leg);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/legislators?id=${leg.peopleId}`);
      const data = await res.json();
      setLegDetails(data);
    } catch (err) {
      console.error(err);
    }
    setDetailsLoading(false);
  };

  const closeModal = () => {
    setSelectedLeg(null);
    setLegDetails(null);
  };

  const getPartyColor = (party) => {
    if (party === 'D') return '#3b82f6';
    if (party === 'R') return '#ef4444';
    if (party === 'N') return '#8b5cf6';
    return '#64748b';
  };

  return (
    <>
      <div className="page-container fade-in">
      <header className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 className="page-title" style={{ margin: 0 }}>Legislator Directory</h1>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
            <button className="btn btn-secondary" disabled={syncing} onClick={handleSync}>
              {syncing ? 'Syncing...' : 'Sync Directory'}
            </button>
            {syncProgress && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '250px' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  {syncProgress.message || 'Starting...'}
                </div>
                {syncProgress.total ? (
                  <progress 
                    value={syncProgress.current || 0} 
                    max={syncProgress.total} 
                    style={{ width: '100%', height: '4px', accentColor: 'var(--color-primary)' }} 
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--space-3)', width: '100%', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '300px' }}>
            <span className="search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="input"
              placeholder="Search by name or district..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="input" 
            style={{ width: 'auto' }}
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          >
            <option value="">All States</option>
            {trackedStates.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select 
            className="input" 
            style={{ width: 'auto' }}
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
          >
            <option value="">All Parties</option>
            <option value="D">Democrat</option>
            <option value="R">Republican</option>
            <option value="N">Nonpartisan</option>
            <option value="I">Independent/Other</option>
          </select>
          <select 
            className="input" 
            style={{ width: 'auto' }}
            value={selectedChamber}
            onChange={(e) => setSelectedChamber(e.target.value)}
          >
            <option value="">All Chambers</option>
            <option value="H">House/Assembly</option>
            <option value="S">Senate</option>
          </select>
        </div>
      </header>

      <div style={{ padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Legend:</strong>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6' }}></span> D - Democrat</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }}></span> R - Republican</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#8b5cf6' }}></span> N - Nonpartisan (NE)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#64748b' }}></span> I - Independent/Other</span>
      </div>

      {loading ? (
        <div className="empty-state">Loading directory...</div>
      ) : legislators.length === 0 ? (
        <div className="empty-state">
          <div>👔</div>
          <h3>No legislators found</h3>
          <p>Track bills to automatically populate the sponsor directory.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
          {legislators.map(leg => (
            <div 
              key={leg.peopleId} 
              className="card interactive" 
              onClick={() => openDetails(leg)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)' }}
            >
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', 
                backgroundColor: 'var(--bg-tertiary)', border: `2px solid ${getPartyColor(leg.party)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '18px', color: 'var(--text-primary)',
                overflow: 'hidden', flexShrink: 0
              }}>
                {leg.imageUrl ? (
                  <img src={leg.imageUrl} alt={leg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                ) : null}
                <div style={{ display: leg.imageUrl ? 'none' : 'flex' }}>
                  {leg.firstName?.[0] || ''}{leg.lastName?.[0] || leg.name?.[0] || '?'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', marginBottom: '2px' }}>
                  {leg.name || `${leg.firstName} ${leg.lastName}`}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  <span style={{ color: getPartyColor(leg.party), fontWeight: 'bold' }}>{leg.party}</span>
                  {' • '}{leg.role} • {leg.state}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {leg.district}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

      {/* Modal Detail View */}
      {mounted && selectedLeg && createPortal(
        <div className="modal-overlay" onMouseDown={closeModal} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 0' }}>
          <div className="modal-content card" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              type="button" 
              onClick={closeModal} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }} 
              aria-label="Close modal"
            >
              ✕
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ 
                  width: '64px', height: '64px', borderRadius: '50%', 
                  backgroundColor: 'var(--bg-tertiary)', border: `3px solid ${getPartyColor(selectedLeg.party)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '24px', color: 'var(--text-primary)',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {selectedLeg.imageUrl ? (
                    <img src={selectedLeg.imageUrl} alt={selectedLeg.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div style={{ display: selectedLeg.imageUrl ? 'none' : 'flex' }}>
                    {selectedLeg.firstName?.[0] || ''}{selectedLeg.lastName?.[0] || selectedLeg.name?.[0] || '?'}
                  </div>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px' }}>{selectedLeg.name}</h2>
                  <div style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                    <span style={{ color: getPartyColor(selectedLeg.party), fontWeight: 'bold' }}>{selectedLeg.party === 'D' ? 'Democrat' : selectedLeg.party === 'R' ? 'Republican' : selectedLeg.party === 'N' ? 'Nonpartisan' : 'Independent'}</span>
                    {' • '}{selectedLeg.role} • {selectedLeg.state} {selectedLeg.district}
                  </div>
                </div>
              </div>
            </div>

            {detailsLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Loading details...</div>
            ) : legDetails && !legDetails.error && legDetails.legislator ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                
                {/* Committees */}
                {legDetails.legislator.committeeAssignments?.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Committees</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {legDetails.legislator.committeeAssignments.map((c, i) => (
                        <span key={i} className="badge badge-outline">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sponsored Bills */}
                <div>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>
                    Sponsored Bills ({legDetails.sponsoredBills?.length || 0})
                  </h3>
                  {legDetails.sponsoredBills?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {legDetails.sponsoredBills.map(bill => (
                        <Link key={bill.id} href={`/bills/${bill.id}`} className="card interactive" style={{ padding: 'var(--space-3)', display: 'block', textDecoration: 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bill.number}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(bill.statusDate).toLocaleDateString()}</span>
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {bill.title.length > 80 ? bill.title.substring(0, 80) + '...' : bill.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No tracked bills sponsored yet.</div>
                  )}
                </div>

              </div>
            ) : null}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
