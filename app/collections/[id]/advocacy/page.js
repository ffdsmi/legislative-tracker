'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdvocacyEditor from './AdvocacyEditor';

export default function AdvocacyPacketBuilder() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const [colRes, billsRes] = await Promise.all([
          fetch('/api/collections'),
          fetch(`/api/collections/${id}/bills`),
        ]);
        const colData = await colRes.json();
        const billsData = await billsRes.json();
        
        const col = (colData.collections || []).find(c => c.id === id);
        setCollection(col);
        setBills(billsData.bills || []);
        
        if (billsData.bills && billsData.bills.length > 0) {
          setExpanded({ [billsData.bills[0].billId]: true });
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [id]);

  const toggleExpand = (billId) => {
    setExpanded(prev => ({ ...prev, [billId]: !prev[billId] }));
  };

  const updateBillField = (billId, field, value) => {
    setBills(prev => prev.map(b => 
      b.billId === billId ? { ...b, [field]: value } : b
    ));
    setSaveStatus('Unsaved changes');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('Saving...');
    try {
      await Promise.all(bills.map(async b => {
        await fetch(`/api/collections/${id}/advocacy`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            billId: b.billId,
            targetStance: b.targetStance,
            talkingPoints: b.talkingPoints,
            considerations: b.considerations
          })
        });
      }));
      setSaveStatus('All changes saved!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch {
      setSaveStatus('Error saving');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading Advocacy Builder...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <Link href={`/collections/${id}`} className="btn btn-ghost btn-sm">
          ← Back to Collection
        </Link>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          {saveStatus && <span style={{ fontSize: 'var(--text-sm)', color: saveStatus.includes('Error') ? 'var(--color-oppose)' : 'var(--text-secondary)' }}>{saveStatus}</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Drafts'}
          </button>
          <Link href={`/collections/${id}/advocacy/print`} className="btn btn-secondary" target="_blank">
            🖨️ Preview & Export PDF
          </Link>
        </div>
      </div>

      <div className="page-header fade-in">
        <h1>Advocacy Packet: {collection?.name || 'Untitled'}</h1>
        <p>Draft talking points and stances for each bill in this collection. These will be generated into a distributable dossier.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {bills.length === 0 ? (
          <div className="card empty-state">No bills found in this collection. Add bills first.</div>
        ) : (
          bills.map(b => {
             const isExpanded = !!expanded[b.billId];
             return (
               <div key={b.billId} className="card fade-in" style={{ padding: 0, overflow: 'hidden' }}>
                  <div 
                    onClick={() => toggleExpand(b.billId)}
                    style={{ 
                      padding: 'var(--space-4)', 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: 'var(--text-lg)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="badge badge-outline">{b.jurisdiction || '—'}</span>
                        <Link href={`/bills/${b.billId}`} className="bill-number" onClick={e => e.stopPropagation()} target="_blank">{b.billNumber || b.billId}</Link>
                        <span>{b.billTitle}</span>
                      </h2>
                    </div>
                    <div>
                      {isExpanded ? '▲ Collapse' : '▼ Draft Talking Points'}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      <div>
                        <label className="label">Our Stance / Position</label>
                        <select 
                          className="input" 
                          value={b.targetStance || ''} 
                          onChange={e => updateBillField(b.billId, 'targetStance', e.target.value)}
                          style={{ maxWidth: '300px' }}
                        >
                          <option value="">— Select Stance —</option>
                          <option value="Strongly Support">✅ Strongly Support</option>
                          <option value="Support">👍 Support</option>
                          <option value="Neutral / Watch">👀 Neutral / Monitor</option>
                          <option value="Oppose">👎 Oppose</option>
                          <option value="Strongly Oppose">❌ Strongly Oppose</option>
                          <option value="Amend">✏️ Amend</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Talking Points (Distributed to CUs)</label>
                        <AdvocacyEditor 
                          content={b.talkingPoints} 
                          onChange={(content) => updateBillField(b.billId, 'talkingPoints', content)} 
                          placeholder="List out the primary arguments, impact on members, and calls to action..."
                        />
                      </div>

                      <div>
                        <label className="label">Internal Considerations & Notes (Optional)</label>
                        <AdvocacyEditor 
                          content={b.considerations} 
                          onChange={(content) => updateBillField(b.billId, 'considerations', content)} 
                          placeholder="Draft any background caveats, political climate notes, or internal instructions..."
                        />
                      </div>
                    </div>
                  )}
               </div>
             );
          })
        )}
      </div>
    </>
  );
}
