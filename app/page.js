'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({ bills: 0, watchlist: 0, keywords: 0, alerts: 0, dockets: 0 });
  const [alerts, setAlerts] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestingState, setIngestingState] = useState(null);
  const [ingestResult, setIngestResult] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [trackedJurisdictions, setTrackedJurisdictions] = useState([]);
  const [watchlistBills, setWatchlistBills] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);


  useEffect(() => {
    Promise.all([
      fetch('/api/watchlist').then(r => r.json()),
      fetch('/api/keywords').then(r => r.json()),
      fetch('/api/alerts').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/stats').then(r => r.json()).catch(() => ({ bills: 0 })),
    ]).then(([watchlist, keywords, alertsData, settings, statsData]) => {
      setStats({
        bills: statsData.bills || 0,
        watchlist: watchlist.total || 0,
        keywords: keywords.total || 0,
        alerts: alertsData.unread || 0,
        dockets: statsData.dockets || 0,
      });
      setAlerts((alertsData.alerts || []).slice(0, 5));
      setHasApiKey(settings.hasLegiscanKey || false);
      setTrackedJurisdictions(settings.trackedJurisdictions || []);

      // Instantly load watchlist pipeline from DB response instead of LegiScan
      const watchItems = watchlist.items || [];
      if (watchItems.length > 0) {
        setWatchlistBills(watchItems.map(w => ({
          id: w.billId,
          billId: w.billId,
          number: w.billNumber,
          title: w.title,
          jurisdiction: w.jurisdiction,
          status: w.status,
          watchPosition: w.position,
        })));
      }
      setIsLoadingStats(false);
    }).catch(() => {
      setIsLoadingStats(false);
    });
  }, []);

  const handleIngest = async (state) => {
    setIngesting(true);
    setIngestingState(state);
    setIngestResult(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, limit: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        const r = data.result;
        const parts = [`${r.updated} updated`];
        if (r.skipped) parts.push(`${r.skipped} skipped`);
        parts.push(`${r.totalInSession} total in session`);
        setIngestResult(`✓ ${r.session}: ${parts.join(', ')}`);
        // Refresh stats
        const [alertsData] = await Promise.all([
          fetch('/api/alerts').then(r => r.json()),
        ]);
        setStats(prev => ({ ...prev, alerts: alertsData.unread || 0 }));
        setAlerts((alertsData.alerts || []).slice(0, 5));
      } else {
        setIngestResult(`⚠️ ${data.error}`);
      }
    } catch (err) {
      setIngestResult(`⚠️ Error: ${err.message}`);
    } finally {
      setIngesting(false);
      setIngestingState(null);
    }
  };

  const handleIngestAll = async () => {
    setIngesting(true);
    setIngestResult(null);
    const results = [];
    for (const code of trackedJurisdictions) {
      setIngestingState(code);
      try {
        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: code, limit: 10 }),
        });
        const data = await res.json();
        if (data.success) {
          const r = data.result;
          results.push(`${code}: ${r.updated} updated, ${r.skipped || 0} skipped (${r.totalInSession} total)`);
        } else {
          results.push(`${code}: ${data.error}`);
        }
      } catch (err) {
        results.push(`${code}: error`);
      }
    }
    // Refresh stats
    try {
      const alertsData = await fetch('/api/alerts').then(r => r.json());
      setStats(prev => ({ ...prev, alerts: alertsData.unread || 0 }));
      setAlerts((alertsData.alerts || []).slice(0, 5));
    } catch {}
    setIngestResult(`✓ ${results.join(' · ')}`);
    setIngesting(false);
    setIngestingState(null);
  };

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

  const STAT_CARDS = [
    { label: 'Bills Tracked', value: stats.bills, icon: '📜', href: '/bills' },
    { label: 'Watchlist Items', value: stats.watchlist, icon: '👁', href: '/watchlist' },
    { label: 'Keywords Monitored', value: stats.keywords, icon: '🔑', href: '/keywords' },
    { label: 'Active Dockets', value: stats.dockets || 0, icon: '🏛️', href: '/regulations' },
    { label: 'Unread Alerts', value: stats.alerts, icon: '🔔', href: '/alerts' },
  ];

  return (
    <>
      <div className="page-header fade-in">
        <h1>Dashboard</h1>
        <p>Overview of your legislative monitoring activity</p>
      </div>

      {/* Skip link target announcement */}
      <div aria-live="polite" className="sr-only" id="route-announcer" />

      {!hasApiKey ? (
        <div className="setup-banner fade-in" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>API keys not configured. <Link href="/settings">Go to Settings</Link> to add your LegiScan and Congress.gov API keys to start monitoring bills.</span>
        </div>
      ) : null}

      <div className="stats-grid fade-in">
        {STAT_CARDS.map((card, i) => (
          isLoadingStats ? (
            <div key={`skel-${i}`} className="stat-card skeleton" style={{ height: '120px', display: 'flex', flexDirection: 'column', padding: 'var(--space-4)', gap: 'var(--space-2)' }}>
              <div className="skeleton-pulse" style={{ width: '40%', height: '32px', borderRadius: '4px' }}></div>
              <div className="skeleton-pulse" style={{ width: '60%', height: '16px', borderRadius: '4px', marginTop: 'auto' }}></div>
            </div>
          ) : (
            <Link key={card.label} href={card.href} className="stat-card" aria-label={`${card.label}: ${card.value}`}>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-icon" aria-hidden="true">{card.icon}</div>
            </Link>
          )
        ))}
      </div>

      {/* Status Pipeline (Kanban) */}
      {watchlistBills.length > 0 && (
        <StatusPipeline bills={watchlistBills} />
      )}

      {hasApiKey ? (
        <div className="card fade-in" style={{ marginTop: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}><span aria-hidden="true">📥</span> Ingest Bills</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Pull bills from your tracked jurisdictions, store text versions, compute diffs, and check keyword matches.
          </p>
          {trackedJurisdictions.length > 0 ? (
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={handleIngestAll} disabled={ingesting}>
                {ingesting ? `⏳ Ingesting ${ingestingState || ''}...` : `📥 Ingest All (${trackedJurisdictions.length} jurisdictions)`}
              </button>
              {trackedJurisdictions.map(code => (
                <button
                  key={code}
                  className="btn btn-secondary"
                  onClick={() => handleIngest(code)}
                  disabled={ingesting}
                  style={{ fontSize: 'var(--text-sm)' }}
                >
                  {ingestingState === code ? '⏳' : '📄'} {STATE_NAMES[code] || code}
                </button>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              No jurisdictions selected. <Link href="/settings">Go to Settings</Link> to choose which states to track.
            </p>
          )}
          <div aria-live="polite" role="status">
            {ingestResult ? (
              <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)', color: ingestResult.startsWith('✓') ? 'var(--color-success)' : 'var(--color-oppose)' }}>
                {ingestResult}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid-2 fade-in" style={{ marginTop: 'var(--space-4)' }}>
        <div className="card">
          <div className="card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Recent Alerts</h2>
              <Link href="/alerts" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            {/* Phase 6 Mock Filter */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }} aria-label="Alert Filters">
              <button className="btn btn-sm" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)' }}>All Types</button>
              <button className="btn btn-sm btn-ghost">📜 Legislative</button>
              <button className="btn btn-sm btn-ghost">🏛️ Regulatory</button>
            </div>
          </div>
          {alerts.length > 0 ? (
            <div className="alert-list">
              {/* Mock Regulatory Alert */}
              <div className="alert-item unread">
                <span className="alert-icon" aria-hidden="true" style={{ backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>⚖️</span>
                <div>
                  <strong>NCUA-2026-0014: Proposed Rule Published</strong>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Fidelity Bonds for Corporate Credit Unions</p>
                </div>
              </div>
              {alerts.map((alert) => (
                <div key={alert.id} className={`alert-item ${alert.read ? '' : 'unread'}`}>
                  <span className="alert-icon" aria-hidden="true">{alert.type === 'change' ? '📝' : '🔑'}</span>
                  <div>
                    <strong>{alert.title}</strong>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">📜</div>
              <h3>No alerts yet</h3>
              <p>Ingest some bills to start tracking changes.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Quick Actions</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
            <Link href="/bills" className="btn btn-secondary" style={{ textAlign: 'center' }}><span aria-hidden="true">🔍</span> Browse Bills</Link>
            <Link href="/keywords" className="btn btn-secondary" style={{ textAlign: 'center' }}><span aria-hidden="true">🔑</span> Manage Keywords</Link>
            <Link href="/watchlist" className="btn btn-secondary" style={{ textAlign: 'center' }}><span aria-hidden="true">👁</span> View Watchlist</Link>
            <Link href="/settings" className="btn btn-secondary" style={{ textAlign: 'center' }}><span aria-hidden="true">⚙️</span> Settings</Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Status Pipeline (Kanban) ──────────────────────────────
const PIPELINE_STAGES = [
  { id: 'prefiled', label: 'Prefiled', color: '#64748b' },
  { id: 'introduced', label: 'Introduced', color: '#3b82f6' },
  { id: 'committee', label: 'Committee', color: '#f59e0b' },
  { id: 'floor', label: 'Floor', color: '#8b5cf6' },
  { id: 'passed', label: 'Passed', color: '#22c55e' },
  { id: 'enacted', label: 'Enacted / Vetoed', color: '#ef4444' },
];

function mapStatusToStage(status) {
  if (!status) return 'introduced';
  const s = String(status).toLowerCase();
  if (s.includes('prefiled') || s.includes('pre-filed')) return 'prefiled';
  if (s.includes('introduced') || s.includes('filed')) return 'introduced';
  if (s.includes('committee') || s.includes('referred') || s.includes('hearing')) return 'committee';
  if (s.includes('floor') || s.includes('reading') || s.includes('vote') || s.includes('amended')) return 'floor';
  if (s.includes('passed') || s.includes('enrolled') || s.includes('engross')) return 'passed';
  if (s.includes('signed') || s.includes('enacted') || s.includes('vetoed') || s.includes('law') || s.includes('chaptered')) return 'enacted';
  // Numeric status codes from LegiScan
  const num = parseInt(status);
  if (num === 1) return 'introduced';
  if (num === 2 || num === 3) return 'committee';
  if (num === 4) return 'passed';
  return 'introduced';
}

function StatusPipeline({ bills }) {
  const stageMap = {};
  PIPELINE_STAGES.forEach(s => { stageMap[s.id] = []; });

  bills.forEach(bill => {
    const stage = mapStatusToStage(bill.status || bill.statusDesc);
    if (stageMap[stage]) {
      stageMap[stage].push(bill);
    } else {
      stageMap['introduced'].push(bill);
    }
  });

  return (
    <div className="card fade-in" style={{ marginBottom: 'var(--space-6)' }}>
      <div className="card-header">
        <h2 className="card-title"><span aria-hidden="true">📋</span> Status Pipeline</h2>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{bills.length} watchlisted bill{bills.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="pipeline-container" role="region" aria-label="Bill status pipeline">
        {PIPELINE_STAGES.map(stage => (
          <div key={stage.id} className="pipeline-column">
            <div className="pipeline-column-header" style={{ borderTopColor: stage.color }}>
              <span>{stage.label}</span>
              <span className="pipeline-count">{stageMap[stage.id].length}</span>
            </div>
            <div className="pipeline-column-body">
              {stageMap[stage.id].map(bill => (
                <Link
                  key={bill.id || bill.billId}
                  href={`/bills/${bill.id || bill.billId}`}
                  className="pipeline-card"
                >
                  <div className="pipeline-card-number">{bill.number}</div>
                  <div className="pipeline-card-title">{(bill.title || '').slice(0, 80)}{(bill.title || '').length > 80 ? '...' : ''}</div>
                  <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                    {bill.jurisdiction && <span className="badge badge-info" style={{ fontSize: '9px', padding: '1px 6px' }}>{bill.jurisdiction}</span>}
                    {bill.watchPosition && <span className={`badge badge-${bill.watchPosition}`} style={{ fontSize: '9px', padding: '1px 6px' }}>{bill.watchPosition}</span>}
                  </div>
                </Link>
              ))}
              {stageMap[stage.id].length === 0 && (
                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  No bills
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

