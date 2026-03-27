'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [legiscanKey, setLegiscanKey] = useState('');
  const [congressKey, setCongressKey] = useState('');
  const [pollInterval, setPollInterval] = useState('60');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasLegiscanKey, setHasLegiscanKey] = useState(false);
  const [hasCongressKey, setHasCongressKey] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setLegiscanKey(data.legiscanApiKey || '');
        setCongressKey(data.congressApiKey || '');
        setPollInterval(String(data.pollInterval || 60));
        setHasLegiscanKey(data.hasLegiscanKey || false);
        setHasCongressKey(data.hasCongressKey || false);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { pollInterval: Number(pollInterval) };
      // Only send keys if user typed a new value (not the masked placeholder)
      if (legiscanKey && !legiscanKey.includes('••')) {
        payload.legiscanApiKey = legiscanKey;
      }
      if (congressKey && !congressKey.includes('••')) {
        payload.congressApiKey = congressKey;
      }

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setHasLegiscanKey(data.settings.hasLegiscanKey);
        setHasCongressKey(data.settings.hasCongressKey);
        setLegiscanKey(data.settings.legiscanApiKey || '');
        setCongressKey(data.settings.congressApiKey || '');
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header fade-in">
        <h1>Settings</h1>
        <p>Configure API keys, polling intervals, and app preferences</p>
      </div>

      <div className="settings-grid">
        <div className="settings-card fade-in">
          <h3>🔑 API Keys</h3>
          <p>Enter your API keys to enable legislative data ingestion. Keys are stored securely on the server and masked in the UI.</p>

          <div className="input-group">
            <label>
              LegiScan API Key
              {hasLegiscanKey ? (
                <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-support)' }}>✓ Configured</span>
              ) : null}
            </label>
            <div className="input-with-action">
              <input
                type="password"
                className="input"
                placeholder={loaded ? 'Enter your LegiScan API key' : 'Loading...'}
                value={legiscanKey}
                onChange={(e) => setLegiscanKey(e.target.value)}
                onFocus={() => {
                  if (legiscanKey.includes('••')) setLegiscanKey('');
                }}
              />
              <a
                href="https://legiscan.com/user/register"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Get Key
              </a>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', display: 'block' }}>
              Free tier: 30,000 queries/month. Covers all 50 states + U.S. Congress.
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
              <a href="https://legiscan.com/user/register" target="_blank" rel="noopener noreferrer">🔗 Register for API Key</a>
              <a href="https://legiscan.com/legiscan" target="_blank" rel="noopener noreferrer">📖 API Documentation</a>
              <a href="https://legiscan.com" target="_blank" rel="noopener noreferrer">🌐 LegiScan.com</a>
            </div>
          </div>

          <div className="input-group">
            <label>
              Congress.gov API Key
              {hasCongressKey ? (
                <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-support)' }}>✓ Configured</span>
              ) : null}
            </label>
            <div className="input-with-action">
              <input
                type="password"
                className="input"
                placeholder={loaded ? 'Enter your Congress.gov API key' : 'Loading...'}
                value={congressKey}
                onChange={(e) => setCongressKey(e.target.value)}
                onFocus={() => {
                  if (congressKey.includes('••')) setCongressKey('');
                }}
              />
              <a
                href="https://api.congress.gov/sign-up/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Get Key
              </a>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', display: 'block' }}>
              Official Library of Congress API. Federal bills, amendments, and summaries.
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
              <a href="https://api.congress.gov/sign-up/" target="_blank" rel="noopener noreferrer">🔗 Register for API Key</a>
              <a href="https://api.congress.gov" target="_blank" rel="noopener noreferrer">📖 API Documentation</a>
              <a href="https://congress.gov" target="_blank" rel="noopener noreferrer">🌐 Congress.gov</a>
            </div>
          </div>
        </div>

        <div className="settings-card fade-in">
          <h3>⏱ Polling Schedule</h3>
          <p>How often the app checks for new or updated legislation.</p>

          <div className="input-group">
            <label>Check Interval</label>
            <select
              className="filter-select"
              value={pollInterval}
              onChange={(e) => setPollInterval(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every hour</option>
              <option value="360">Every 6 hours</option>
              <option value="1440">Once daily</option>
            </select>
          </div>
        </div>

        <div className="settings-card fade-in">
          <h3>📊 Data Management</h3>
          <p>Manage your tracked jurisdictions and data storage.</p>

          <div className="input-group">
            <label>Tracked Jurisdictions</label>
            <div className="keyword-list">
              {['U.S. Congress', 'Nebraska', 'California', 'Texas', 'New York'].map((j) => (
                <span key={j} className="keyword-chip">
                  {j}
                  <span className="remove">✕</span>
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button className="btn btn-secondary">Export Data</button>
            <button className="btn btn-ghost" style={{ color: 'var(--color-oppose)' }}>Clear Database</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved ? (
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>
              ✓ Settings saved successfully
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
