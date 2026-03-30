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
  const [regulationsKey, setRegulationsKey] = useState('');
  const [openStatesKey, setOpenStatesKey] = useState('');
  const [pollInterval, setPollInterval] = useState('60');
  const [trackedJurisdictions, setTrackedJurisdictions] = useState(['US', 'NE']);
  const [userName, setUserName] = useState('');
  const [userJob, setUserJob] = useState('');
  const [userOrg, setUserOrg] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasLegiscanKey, setHasLegiscanKey] = useState(false);
  const [hasCongressKey, setHasCongressKey] = useState(false);
  const [hasRegulationsKey, setHasRegulationsKey] = useState(false);
  const [hasOpenStatesKey, setHasOpenStatesKey] = useState(false);
  
  // Email Digest
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [digestEmail, setDigestEmail] = useState('');
  const [digestFrequency, setDigestFrequency] = useState('disabled');
  const [hasSmtpPass, setHasSmtpPass] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState({ status: 'stopped' });
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetResult, setDatasetResult] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setLegiscanKey(data.legiscanApiKey || '');
        setCongressKey(data.congressApiKey || '');
        setRegulationsKey(data.regulationsApiKey || '');
        setPollInterval(String(data.pollInterval || 60));
        setTrackedJurisdictions(data.trackedJurisdictions || ['US', 'NE']);
        setHasLegiscanKey(data.hasLegiscanKey || false);
        setHasCongressKey(data.hasCongressKey || false);
        setHasRegulationsKey(data.hasRegulationsKey || false);
        setHasOpenStatesKey(data.hasOpenStatesKey || false);
        setOpenStatesKey(data.openStatesApiKey || '');
        setSmtpHost(data.smtpHost || '');
        setSmtpPort(String(data.smtpPort || '587'));
        setSmtpUser(data.smtpUser || '');
        setSmtpPass(data.smtpPass || '');
        setDigestEmail(data.digestEmail || '');
        setDigestFrequency(data.digestFrequency || 'disabled');
        setHasSmtpPass(data.hasSmtpPass || false);
        setLoaded(true);

        // Load local profile settings
        setUserName(localStorage.getItem('lt_username') || '');
        setUserJob(localStorage.getItem('lt_jobtitle') || '');
        setUserOrg(localStorage.getItem('lt_organization') || '');
      })
      .catch(() => setLoaded(true));

    // Load scheduler status
    fetch('/api/scheduler').then(r => r.json())
      .then(data => setSchedulerStatus(data))
      .catch(() => {});
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
      if (regulationsKey && !regulationsKey.includes('••')) {
        payload.regulationsApiKey = regulationsKey;
      }
      if (openStatesKey && !openStatesKey.includes('••')) {
        payload.openStatesApiKey = openStatesKey;
      }
      if (smtpPass && !smtpPass.includes('••')) {
        payload.smtpPass = smtpPass;
      }
      payload.smtpHost = smtpHost;
      payload.smtpPort = Number(smtpPort);
      payload.smtpUser = smtpUser;
      payload.digestEmail = digestEmail;
      payload.digestFrequency = digestFrequency;

      // Save local profile settings
      localStorage.setItem('lt_username', userName);
      localStorage.setItem('lt_jobtitle', userJob);
      localStorage.setItem('lt_organization', userOrg);

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
        setHasRegulationsKey(data.settings.hasRegulationsKey);
        setHasOpenStatesKey(data.settings.hasOpenStatesKey);
        setLegiscanKey(data.settings.legiscanApiKey || '');
        setCongressKey(data.settings.congressApiKey || '');
        setRegulationsKey(data.settings.regulationsApiKey || '');
        setOpenStatesKey(data.settings.openStatesApiKey || '');
        setHasSmtpPass(data.settings.hasSmtpPass);
        setSmtpPass(data.settings.smtpPass || '');
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
          <h3><span aria-hidden="true">👤</span> Profile Defaults</h3>
          <p>Set the default identity injected into your generated PDF memorandums and testimonies.</p>
          <div className="input-group">
            <label>Author Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Jane Doe"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Job Title</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Senior Analyst"
              value={userJob}
              onChange={(e) => setUserJob(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Organization</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Public Citizen"
              value={userOrg}
              onChange={(e) => setUserOrg(e.target.value)}
            />
          </div>
        </div>

        <div className="settings-card fade-in">
          <h3><span aria-hidden="true">🔑</span> API Keys</h3>
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

          <div className="input-group">
            <label>
              Regulations.gov API Key
              {hasRegulationsKey ? (
                <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-support)' }}>✓ Configured</span>
              ) : null}
            </label>
            <div className="input-with-action">
              <input
                type="password"
                className="input"
                placeholder={loaded ? 'Enter your Regulations.gov API key' : 'Loading...'}
                value={regulationsKey}
                onChange={(e) => setRegulationsKey(e.target.value)}
                onFocus={() => {
                  if (regulationsKey.includes('••')) setRegulationsKey('');
                }}
              />
              <a
                href="https://open.gsa.gov/api/regulationsgov/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Get Key
              </a>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', display: 'block' }}>
              Used to fetch dockets and rulemakings from CFPB, NCUA, and other federal agencies.
            </span>
          </div>

          <div className="input-group">
            <label>
              Open States API Key
              {hasOpenStatesKey ? (
                <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-support)' }}>✓ Configured</span>
              ) : null}
            </label>
            <div className="input-with-action">
              <input
                type="password"
                className="input"
                placeholder={loaded ? 'Enter your Open States API key' : 'Loading...'}
                value={openStatesKey}
                onChange={(e) => setOpenStatesKey(e.target.value)}
                onFocus={() => {
                  if (openStatesKey.includes('••')) setOpenStatesKey('');
                }}
              />
              <a
                href="https://openstates.org/api/register/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Get Key
              </a>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)', display: 'block' }}>
              Used to pull high quality official headshots for State Legislators (NE, IA, etc).
            </span>
          </div>
        </div>

        <div className="settings-card fade-in">
          <h3><span aria-hidden="true">⏱</span> Polling Schedule</h3>
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

          <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <strong style={{ fontSize: 'var(--text-sm)' }}>Auto-Ingest Scheduler</strong>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                  {schedulerStatus.status === 'running' ? (
                    <span style={{ color: 'var(--color-support)' }}>● Background Engine Active</span>
                  ) : schedulerStatus.status === 'idle' ? (
                    <span style={{ color: 'var(--color-watch)' }}>● Idle — no API key configured</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>○ Stopped</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {schedulerStatus.status !== 'running' ? (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={schedulerLoading}
                    onClick={async () => {
                      setSchedulerLoading(true);
                      try {
                        const res = await fetch('/api/scheduler', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'start' }),
                        });
                        const data = await res.json();
                        setSchedulerStatus(data);
                      } catch { /* ignore */ }
                      setSchedulerLoading(false);
                    }}
                  >
                    {schedulerLoading ? '...' : '▶ Start'}
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-oppose)' }}
                    disabled={schedulerLoading}
                    onClick={async () => {
                      setSchedulerLoading(true);
                      try {
                        const res = await fetch('/api/scheduler', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'stop' }),
                        });
                        const data = await res.json();
                        setSchedulerStatus(data);
                      } catch { /* ignore */ }
                      setSchedulerLoading(false);
                    }}
                  >
                    ■ Stop
                  </button>
                )}
              </div>
            </div>
            {schedulerStatus.lastRun && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Last run: {new Date(schedulerStatus.lastRun).toLocaleString()}
                {schedulerStatus.lastResult?.billsProcessed !== undefined && (
                  <> — {schedulerStatus.lastResult.billsProcessed} bills processed</>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="settings-card fade-in">
          <h3><span aria-hidden="true">📊</span> Data Management</h3>
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
                  
                  {trackedJurisdictions.includes(j.code) && (
                    <button
                      type="button"
                      title={`Command Exhasutive Auto-Sync for ${j.code}`}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0 4px', fontSize: 'var(--text-xs)', marginLeft: '8px', zIndex: 10 }}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Change icon to loading using standard DOM manipulation for instant feedback safely
                        const btn = e.currentTarget;
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '⏳';
                        btn.disabled = true;
                        try {
                          const res = await fetch('/api/ingest', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ state: j.code })
                          });
                          
                          // Consume the streaming response to completion
                          const reader = res.body.getReader();
                          while (true) {
                            const { done } = await reader.read();
                            if (done) break;
                          }
                          
                          btn.innerHTML = '✅';
                          setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                        } catch(err) {
                          console.error(err);
                          btn.innerHTML = '❌';
                          setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
                        }
                      }}
                    >
                      🔄
                    </button>
                  )}
                  
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginLeft: 'auto' }}>
                    {j.code}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const res = await fetch('/api/settings/data');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `legislative-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  alert('Export failed: ' + err.message);
                }
              }}
            >
              Export Data
            </button>
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--color-oppose)' }}
              onClick={async () => {
                if (!confirm('⚠️ This will permanently delete ALL bills, annotations, markups, testimonies, watchlist items, and alerts. This cannot be undone.\n\nAre you sure?')) return;
                try {
                  const res = await fetch('/api/settings/data', { method: 'DELETE' });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Server error during deletion');
                  if (data.success) {
                    alert('✓ All data has been cleared.');
                    window.location.reload();
                  }
                } catch (err) {
                  alert('Clear failed: ' + err.message);
                }
              }}
            >
              Clear Database
            </button>
          </div>
        </div>

        <div className="settings-card fade-in">
          <h3><span aria-hidden="true">📦</span> LegiScan Dataset Backfill</h3>
          <p>Upload a Weekly Dataset ZIP from LegiScan to instantly prepopulate the local database without burning Free Tier API limits. Ensure you download the JSON format.</p>
          <div className="input-group">
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Upload ZIP Archive
              <a href="https://legiscan.com/datasets" target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)' }}>
                Download from LegiScan ↗
              </a>
            </label>
            <input 
              type="file" 
              accept=".zip"
              className="input" 
              style={{ width: '100%', padding: 'var(--space-2)' }}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                setDatasetLoading(true);
                setDatasetResult(null);
                
                const formData = new FormData();
                formData.append('dataset', file);
                
                try {
                  const res = await fetch('/api/ingest/dataset', {
                    method: 'POST',
                    body: formData
                  });
                  const data = await res.json();
                  if (data.success) {
                    setDatasetResult(`Success: Migrated ${data.count} bills into the database.`);
                  } else {
                    setDatasetResult(`Error: ${data.error}`);
                  }
                } catch (err) {
                  setDatasetResult(`Upload failed: ${err.message}`);
                } finally {
                  setDatasetLoading(false);
                  e.target.value = ''; // clear input
                }
              }}
              disabled={datasetLoading}
            />
            {datasetLoading && <span style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)', display: 'block' }}>Uploading and unpacking dataset... This may take a minute.</span>}
            {datasetResult && <span style={{ color: datasetResult.startsWith('Success') ? 'var(--color-support)' : 'var(--color-oppose)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)', display: 'block' }}>{datasetResult}</span>}
          </div>
        </div>


        <div className="settings-card fade-in">
          <h3><span aria-hidden="true">✉️</span> Email Digest</h3>
          <p>Configure automated email summaries for tracked bills and keywords.</p>

          <div className="settings-grid-row">
            <div className="input-group">
              <label>SMTP Host</label>
              <input type="text" className="input" placeholder="smtp.example.com" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
            </div>
            <div className="input-group">
              <label>SMTP Port</label>
              <input type="number" className="input" placeholder="587" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
            </div>
            <div className="input-group">
              <label>SMTP Username</label>
              <input type="text" className="input" placeholder="user@example.com" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} />
            </div>
            <div className="input-group">
              <label>
                SMTP Password
                {hasSmtpPass && <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-support)' }}>✓ Configured</span>}
              </label>
              <input type="password" className="input" placeholder="Password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} onFocus={() => { if (smtpPass.includes('••')) setSmtpPass(''); }} />
            </div>
          </div>

          <div className="settings-grid-row" style={{ marginTop: 'var(--space-4)' }}>
            <div className="input-group">
              <label>Recipient Email</label>
              <input type="email" className="input" placeholder="recipient@example.com" value={digestEmail} onChange={e => setDigestEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Digest Frequency</label>
              <select className="input" value={digestFrequency} onChange={e => setDigestFrequency(e.target.value)}>
                <option value="disabled">Disabled</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            <button
              className="btn btn-secondary"
              disabled={testingEmail || !smtpHost || !smtpUser}
              onClick={async () => {
                setTestingEmail(true);
                try {
                  const payload = { smtpHost, smtpPort, smtpUser, smtpPass, digestEmail };
                  if (smtpPass && smtpPass.includes('••')) delete payload.smtpPass;
                  const res = await fetch('/api/email/test', { method: 'POST', body: JSON.stringify(payload) });
                  const data = await res.json();
                  alert(data.success ? '✓ Test email sent successfully!' : 'Test failed: ' + (data.error || 'Unknown error'));
                } catch (err) {
                  alert('Test failed: ' + err.message);
                }
                setTestingEmail(false);
              }}
            >
              {testingEmail ? 'Sending...' : 'Send Test Email'}
            </button>
            <a href="/api/email" target="_blank" rel="noreferrer" className="btn btn-secondary">
              Preview Digest
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved ? (
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-success)' }} role="status" aria-live="polite">
              ✓ Settings saved successfully
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
