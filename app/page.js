'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({ bills: 0, watchlist: 0, keywords: 0, alerts: 0 });
  const [alerts, setAlerts] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestingState, setIngestingState] = useState(null);
  const [ingestResult, setIngestResult] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [trackedJurisdictions, setTrackedJurisdictions] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/watchlist').then(r => r.json()),
      fetch('/api/keywords').then(r => r.json()),
      fetch('/api/alerts').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([watchlist, keywords, alertsData, settings]) => {
      setStats({
        bills: 0,
        watchlist: watchlist.total || 0,
        keywords: keywords.total || 0,
        alerts: alertsData.unread || 0,
      });
      setAlerts((alertsData.alerts || []).slice(0, 5));
      setHasApiKey(settings.hasLegiscanKey || false);
      setTrackedJurisdictions(settings.trackedJurisdictions || []);
    }).catch(() => {});
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
    { label: 'Watchlist Items', value: stats.watchlist, icon: '👁', href: '/watchlist' },
    { label: 'Keywords Monitored', value: stats.keywords, icon: '🔑', href: '/keywords' },
    { label: 'Unread Alerts', value: stats.alerts, icon: '🔔', href: '/alerts' },
  ];

  return (
    <>
      <div className="page-header fade-in">
        <h1>Dashboard</h1>
        <p>Overview of your legislative monitoring activity</p>
      </div>

      {!hasApiKey ? (
        <div className="setup-banner fade-in">
          <span>⚠️</span>
          <span>API keys not configured. <Link href="/settings">Go to Settings</Link> to add your LegiScan and Congress.gov API keys to start monitoring bills.</span>
        </div>
      ) : null}

      <div className="stats-grid fade-in">
        {STAT_CARDS.map((card) => (
          <Link key={card.label} href={card.href} className="stat-card">
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
            <div className="stat-icon">{card.icon}</div>
          </Link>
        ))}
      </div>

      {hasApiKey ? (
        <div className="card fade-in" style={{ marginTop: 'var(--space-4)' }}>
          <h3>📥 Ingest Bills</h3>
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
          {ingestResult ? (
            <p style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)', color: ingestResult.startsWith('✓') ? 'var(--color-success)' : 'var(--color-oppose)' }}>
              {ingestResult}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid-2 fade-in" style={{ marginTop: 'var(--space-4)' }}>
        <div className="card">
          <div className="card-header">
            <h3>Recent Alerts</h3>
            <Link href="/alerts" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          {alerts.length > 0 ? (
            <div className="alert-list">
              {alerts.map((alert) => (
                <div key={alert.id} className={`alert-item ${alert.read ? '' : 'unread'}`}>
                  <span className="alert-icon">{alert.type === 'change' ? '📝' : '🔑'}</span>
                  <div>
                    <strong>{alert.title}</strong>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📜</div>
              <h3>No alerts yet</h3>
              <p>Ingest some bills to start tracking changes.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
            <Link href="/bills" className="btn btn-secondary" style={{ textAlign: 'center' }}>🔍 Browse Bills</Link>
            <Link href="/keywords" className="btn btn-secondary" style={{ textAlign: 'center' }}>🔑 Manage Keywords</Link>
            <Link href="/watchlist" className="btn btn-secondary" style={{ textAlign: 'center' }}>👁 View Watchlist</Link>
            <Link href="/settings" className="btn btn-secondary" style={{ textAlign: 'center' }}>⚙️ Settings</Link>
          </div>
        </div>
      </div>
    </>
  );
}
