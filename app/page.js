'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({ bills: 0, watchlist: 0, keywords: 0, alerts: 0 });
  const [alerts, setAlerts] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);

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
    }).catch(() => {});
  }, []);

  const handleIngest = async (state) => {
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, limit: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        setIngestResult(`✓ Ingested ${data.result.ingested} bills from ${data.result.session}`);
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
    }
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
            Pull bills from LegiScan, store text versions, compute diffs, and check keyword matches.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => handleIngest('NE')} disabled={ingesting}>
              {ingesting ? '⏳ Ingesting...' : '🌽 Ingest Nebraska'}
            </button>
            <button className="btn btn-secondary" onClick={() => handleIngest('US')} disabled={ingesting}>
              🏛 Ingest U.S. Congress
            </button>
            {ingestResult ? (
              <span style={{ fontSize: 'var(--text-sm)', color: ingestResult.startsWith('✓') ? 'var(--color-success)' : 'var(--color-oppose)' }}>
                {ingestResult}
              </span>
            ) : null}
          </div>
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
