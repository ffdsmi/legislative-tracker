import Link from 'next/link';

export const metadata = {
  title: 'Dashboard — LegisTracker',
};

export default function DashboardPage() {
  return (
    <>
      <div className="page-header fade-in">
        <h1>Dashboard</h1>
        <p>Overview of your legislative monitoring activity</p>
      </div>

      <div className="setup-banner fade-in">
        <span>⚠️</span>
        <span>
          API keys not configured. <Link href="/settings">Go to Settings</Link> to add your LegiScan and Congress.gov API keys to start monitoring bills.
        </span>
      </div>

      <div className="stats-grid stagger">
        <div className="stat-card fade-in">
          <div className="stat-icon">📜</div>
          <div className="stat-value">0</div>
          <div className="stat-label">Bills Tracked</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-icon">👁</div>
          <div className="stat-value">0</div>
          <div className="stat-label">Watchlist Items</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-icon">🔍</div>
          <div className="stat-value">0</div>
          <div className="stat-label">Keywords Monitored</div>
        </div>
        <div className="stat-card fade-in">
          <div className="stat-icon">🔔</div>
          <div className="stat-value">0</div>
          <div className="stat-label">Unread Alerts</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <div className="card fade-in">
          <div className="card-header">
            <div className="card-title">Recent Activity</div>
            <Link href="/alerts" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
            <div className="empty-state-icon">📋</div>
            <h3>No activity yet</h3>
            <p>Configure your API keys in Settings and add bills to your watchlist to start tracking changes.</p>
          </div>
        </div>

        <div className="card fade-in">
          <div className="card-header">
            <div className="card-title">Recent Changes</div>
            <Link href="/bills" className="btn btn-ghost btn-sm">Browse Bills</Link>
          </div>
          <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
            <div className="empty-state-icon">📝</div>
            <h3>No changes detected</h3>
            <p>Bill diffs will appear here once the system starts ingesting data from legislative APIs.</p>
          </div>
        </div>
      </div>
    </>
  );
}
