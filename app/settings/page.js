'use client';

import { useState, useEffect } from 'react';

const ALL_JURISDICTIONS = [
  { code: 'US', label: 'U.S. Congress' },
  { code: 'AL', label: 'Alabama' },
  { code: 'AK', label: 'Alaska' },
  { code: 'AZ', label: 'Arizona' },
  { code: 'AR', label: 'Arkansas' },
  { code: 'CA', label: 'California' },
  { code: 'CO', label: 'Colorado' },
  { code: 'CT', label: 'Connecticut' },
  { code: 'DE', label: 'Delaware' },
  { code: 'FL', label: 'Florida' },
  { code: 'GA', label: 'Georgia' },
  { code: 'HI', label: 'Hawaii' },
  { code: 'ID', label: 'Idaho' },
  { code: 'IL', label: 'Illinois' },
  { code: 'IN', label: 'Indiana' },
  { code: 'IA', label: 'Iowa' },
  { code: 'KS', label: 'Kansas' },
  { code: 'KY', label: 'Kentucky' },
  { code: 'LA', label: 'Louisiana' },
  { code: 'ME', label: 'Maine' },
  { code: 'MD', label: 'Maryland' },
  { code: 'MA', label: 'Massachusetts' },
  { code: 'MI', label: 'Michigan' },
  { code: 'MN', label: 'Minnesota' },
  { code: 'MS', label: 'Mississippi' },
  { code: 'MO', label: 'Missouri' },
  { code: 'MT', label: 'Montana' },
  { code: 'NE', label: 'Nebraska' },
  { code: 'NV', label: 'Nevada' },
  { code: 'NH', label: 'New Hampshire' },
  { code: 'NJ', label: 'New Jersey' },
  { code: 'NM', label: 'New Mexico' },
  { code: 'NY', label: 'New York' },
  { code: 'NC', label: 'North Carolina' },
  { code: 'ND', label: 'North Dakota' },
  { code: 'OH', label: 'Ohio' },
  { code: 'OK', label: 'Oklahoma' },
  { code: 'OR', label: 'Oregon' },
  { code: 'PA', label: 'Pennsylvania' },
  { code: 'RI', label: 'Rhode Island' },
  { code: 'SC', label: 'South Carolina' },
  { code: 'SD', label: 'South Dakota' },
  { code: 'TN', label: 'Tennessee' },
  { code: 'TX', label: 'Texas' },
  { code: 'UT', label: 'Utah' },
  { code: 'VT', label: 'Vermont' },
  { code: 'VA', label: 'Virginia' },
  { code: 'WA', label: 'Washington' },
  { code: 'WV', label: 'West Virginia' },
  { code: 'WI', label: 'Wisconsin' },
  { code: 'WY', label: 'Wyoming' },
  { code: 'DC', label: 'Washington D.C.' },
];

export default function SettingsPage() {
  const [legiscanKey, setLegiscanKey] = useState('');
  const [congressKey, setCongressKey] = useState('');
  const [pollInterval, setPollInterval] = useState('60');
  const [trackedJurisdictions, setTrackedJurisdictions] = useState(['US', 'NE']);
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
        setTrackedJurisdictions(data.trackedJurisdictions || ['US', 'NE']);
        setHasLegiscanKey(data.hasLegiscanKey || false);
        setHasCongressKey(data.hasCongressKey || false);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const toggleJurisdiction = (code) => {
    setTrackedJurisdictions(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { pollInterval: Number(pollInterval), trackedJurisdictions };
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
          <p>Select the jurisdictions you want to monitor for legislative activity.</p>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <label>Tracked Jurisdictions ({trackedJurisdictions.length} selected)</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setTrackedJurisdictions(ALL_JURISDICTIONS.map(j => j.code))}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setTrackedJurisdictions([])}
                >
                  Clear All
                </button>
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 'var(--space-1)',
              maxHeight: 300,
              overflowY: 'auto',
              padding: 'var(--space-3)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}>
              {ALL_JURISDICTIONS.map((j) => (
                <label
                  key={j.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-1) var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    color: trackedJurisdictions.includes(j.code) ? 'var(--text-primary)' : 'var(--text-muted)',
                    background: trackedJurisdictions.includes(j.code) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={trackedJurisdictions.includes(j.code)}
                    onChange={() => toggleJurisdiction(j.code)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontWeight: trackedJurisdictions.includes(j.code) ? 500 : 400 }}>
                    {j.label}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginLeft: 'auto' }}>
                    {j.code}
                  </span>
                </label>
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
