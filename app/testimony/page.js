'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { buildTestimonyPdfHtml } from '@/lib/pdf-template';
import TestimonyBlock from './TestimonyBlock';

export default function TestimonyPage() {
  const [testimonies, setTestimonies] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTestimony, setActiveTestimony] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedBillId, setSelectedBillId] = useState('');
  const [billSearch, setBillSearch] = useState('');
  const [billJurisdiction, setBillJurisdiction] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const [newSectionRef, setNewSectionRef] = useState('');

  const [defaultAuthor, setDefaultAuthor] = useState('');
  const [defaultJob, setDefaultJob] = useState('');
  const [defaultOrg, setDefaultOrg] = useState('');

  const [editorRevision, setEditorRevision] = useState(0);

  // Split-Pane UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeRightPane, setActiveRightPane] = useState('none'); // 'none', 'bill', 'preview'
  const [fullScreenPreview, setFullScreenPreview] = useState(false);
  const [billHtml, setBillHtml] = useState(null);
  const [loadingBillHtml, setLoadingBillHtml] = useState(false);

  const [blocks, setBlocks] = useState([]);

  // Load testimonies and bills
  useEffect(() => {
    Promise.all([
      fetch('/api/testimonies').then(r => r.json()),
      fetch('/api/stats').then(r => r.json()).catch(() => ({ bills: 0 })),
    ]).then(([testData, statsData]) => {
      setTestimonies(testData.testimonies || []);
    }).finally(() => setLoading(false));

    // Load all locally stored bills for the bill picker
    fetch('/api/bills?source=local').then(r => r.json()).then(data => {
      setBills(data.bills || []);
    }).catch(() => {});

    // Load user identity defaults
    setDefaultAuthor(localStorage.getItem('lt_username') || 'Jane Doe');
    setDefaultJob(localStorage.getItem('lt_userRole') || 'Member');
    setDefaultOrg(localStorage.getItem('lt_userOrg') || 'Public Citizen');
  }, []);

  // Load active testimony into editor and fetch linked bill text
  useEffect(() => {
    if (activeTestimony) {
      // Hydrate DB body string into blocks
      let parsedBlocks;
      try {
        if (activeTestimony.body && activeTestimony.body.trim().startsWith('[')) {
          parsedBlocks = JSON.parse(activeTestimony.body);
        } else {
          parsedBlocks = [{ id: crypto.randomUUID(), type: 'intro', content: activeTestimony.body || '' }];
        }
      } catch (e) {
        parsedBlocks = [{ id: crypto.randomUUID(), type: 'intro', content: activeTestimony.body || '' }];
      }
      setBlocks(parsedBlocks);
      
      // Auto-open bill view if a bill is attached and no pane is open
      if (activeTestimony.billId && activeRightPane === 'none') {
        setActiveRightPane('bill');
      } else if (!activeTestimony.billId && activeRightPane === 'bill') {
        setActiveRightPane('none');
      }

      // Fetch Bill Text for Split View
      if (activeTestimony.billId) {
        setLoadingBillHtml(true);
        fetch('/api/bills/' + activeTestimony.billId)
          .then(r => r.json())
          .then(data => {
            if (data.versions && data.versions.length > 0) {
              setBillHtml(data.versions[0].text);
            } else {
              setBillHtml(null);
            }
          })
          .catch(() => setBillHtml(null))
          .finally(() => setLoadingBillHtml(false));
      } else {
        setBillHtml(null);
      }
    } else {
      setBillHtml(null);
    }
  }, [activeTestimony]);

  // Auto-save when editor content changes
  const handleSave = useCallback(async () => {
    if (!activeTestimony) return;
    setSaving(true);
    setSaveStatus('');
    try {
      const serializedBody = JSON.stringify(blocks);
      const res = await fetch('/api/testimonies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTestimony.id,
          body: serializedBody,
          title: activeTestimony.title,
          status: activeTestimony.status,
          sectionRef: activeTestimony.sectionRef,
          authorName: activeTestimony.authorName,
          jobTitle: activeTestimony.jobTitle,
          organization: activeTestimony.organization,
          committeeDate: activeTestimony.committeeDate,
          position: activeTestimony.position,
        }),
      });
      const data = await res.json();
      setActiveTestimony(data.testimony);
      setTestimonies(prev => prev.map(t => t.id === data.testimony.id ? data.testimony : t));
      setSaveStatus('✓ Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch {
      setSaveStatus('⚠ Save failed');
    } finally {
      setSaving(false);
    }
  }, [activeTestimony, blocks]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const selectedBill = bills.find(b => String(b.id) === selectedBillId);
    try {
      const res = await fetch('/api/testimonies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          billId: selectedBillId || null,
          billNumber: selectedBill?.number || '',
          billTitle: selectedBill?.title || '',
          sectionRef: newSectionRef.trim(),
          authorName: defaultAuthor,
          jobTitle: defaultJob,
          organization: defaultOrg,
          committeeDate: new Date().toISOString().split('T')[0],
          position: 'support',
        }),
      });
      const data = await res.json();
      setTestimonies(prev => [data.testimony, ...prev]);
      setActiveTestimony(data.testimony);
      setNewTitle('');
      setSelectedBillId('');
      setNewSectionRef('');
      setShowCreate(false);
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this testimony draft?')) return;
    await fetch(`/api/testimonies?id=${id}`, { method: 'DELETE' });
    setTestimonies(prev => prev.filter(t => t.id !== id));
    if (activeTestimony?.id === id) {
      setActiveTestimony(null);
      setBlocks([]);
    }
  };

  const handleToggleStatus = async () => {
    if (!activeTestimony) return;
    const newStatus = activeTestimony.status === 'draft' ? 'final' : 'draft';
    const serializedBody = JSON.stringify(blocks);
    const res = await fetch('/api/testimonies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: activeTestimony.id,
        status: newStatus,
        body: serializedBody,
      }),
    });
    const data = await res.json();
    setActiveTestimony(data.testimony);
    setTestimonies(prev => prev.map(t => t.id === data.testimony.id ? data.testimony : t));
  };

  const handleExportPdf = async () => {
    if (!activeTestimony) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (activeTestimony.billId) params.set('billId', activeTestimony.billId);
      params.set('testimonyId', activeTestimony.id);
      params.set('type', 'testimony');

      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTestimony.billNumber || 'testimony'}-testimony.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleTitleChange = (title) => {
    setActiveTestimony(prev => ({ ...prev, title }));
  };

  const availableJurisdictions = Array.from(new Set(bills.map(b => b.jurisdiction).filter(Boolean)));
  const filteredBills = bills.filter(b => {
    const matchesSearch = !billSearch || b.number?.toLowerCase().includes(billSearch.toLowerCase()) || b.title?.toLowerCase().includes(billSearch.toLowerCase());
    const matchesJurisdiction = !billJurisdiction || b.jurisdiction === billJurisdiction;
    return matchesSearch && matchesJurisdiction;
  }).slice(0, 50);

  const handleBlockChange = (index, newBlockData) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = newBlockData;
      return next;
    });
    // Trigger auto-save debounce (using setTimeout to allow React render cycle)
    setTimeout(handleSave, 500);
  };

  const handleBlockRemove = (index) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
    setTimeout(handleSave, 100);
  };

  const addBlock = (type) => {
    setBlocks(prev => [...prev, { id: crypto.randomUUID(), type, content: '' }]);
  };

  const wordCount = blocks.reduce((acc, b) => acc + (b.content?.replace(/<[^>]*>?/gm, '').split(/\s+/).filter(Boolean).length || 0), 0) || (activeTestimony?.wordCount || 0);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, animation: 'pulse 1.5s infinite' }} aria-hidden="true">✍️</div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)' }}>Loading testimony workspace...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header fade-in">
        <h1><span aria-hidden="true">✍️</span> Testimony Workspace</h1>
        <p>Draft, edit, and export testimony for legislative bills</p>
      </div>

      <div className="testimony-layout-flex fade-in">
        {/* Left panel — testimony list */}
        <div className="testimony-sidebar testimony-panel-left" data-open={sidebarOpen} style={{ 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {sidebarOpen ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Drafts</h2>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
                    + New
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(false)} title="Collapse Sidebar" style={{ padding: '4px' }}>
                    ◀
                  </button>
                </div>
              </div>

          {showCreate && (
            <div className="testimony-create-form card" style={{ marginBottom: 'var(--space-4)' }}>
              <input
                className="input"
                placeholder="Testimony title..."
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                aria-label="Testimony title"
              />
              <div style={{ marginTop: 'var(--space-2)', position: 'relative' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {availableJurisdictions.length > 0 && (
                    <select
                      className="input"
                      style={{ flex: '0 0 auto', width: 'auto', fontSize: 'var(--text-xs)' }}
                      value={billJurisdiction}
                      onChange={(e) => { setBillJurisdiction(e.target.value); setShowPicker(true); }}
                    >
                      <option value="">All Regions</option>
                      {availableJurisdictions.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  )}
                  <input
                    className="input"
                    placeholder="Search bills to link..."
                    value={billSearch}
                    onChange={e => { setBillSearch(e.target.value); setShowPicker(true); }}
                    onFocus={() => setShowPicker(true)}
                    onBlur={() => setTimeout(() => setShowPicker(false), 200)}
                    aria-label="Search bills"
                    style={{ fontSize: 'var(--text-xs)', flex: 1 }}
                  />
                </div>
                {showPicker && filteredBills.length > 0 && (
                  <div className="bill-picker-dropdown" style={{ position: 'absolute', zIndex: 10, width: '100%', top: '100%', marginTop: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxHeight: '250px', overflowY: 'auto' }}>
                    {filteredBills.map(b => (
                      <div
                        key={b.id}
                        className={`bill-picker-item ${selectedBillId === String(b.id) ? 'selected' : ''}`}
                        onClick={() => { setSelectedBillId(String(b.id)); setBillSearch(b.number); setShowPicker(false); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-outline" style={{ fontSize: '10px', padding: '2px 4px' }}>{b.jurisdiction}</span>
                          <strong>{b.number}</strong>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', display: 'block', marginTop: '2px' }}>{b.title?.slice(0, 60)}...</span>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  className="input"
                  placeholder="Specific section (e.g. § 12.A) (Optional)"
                  value={newSectionRef}
                  onChange={e => setNewSectionRef(e.target.value)}
                  aria-label="Testimony section reference"
                  style={{ fontSize: 'var(--text-xs)', flex: 1, marginTop: 'var(--space-2)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={!newTitle.trim()}>Create</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); setNewTitle(''); setNewSectionRef(''); }}>Cancel</button>
              </div>
            </div>
          )}

          {testimonies.length > 0 ? (
            <div className="testimony-list">
              {testimonies.map(t => (
                <div
                  key={t.id}
                  className={`testimony-card ${activeTestimony?.id === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTestimony(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTestimony(t); } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div className="testimony-card-title">{t.title}</div>
                      {t.billNumber && (
                        <div className="testimony-card-bill">
                          <span aria-hidden="true">📜</span> {t.billNumber}
                        </div>
                      )}
                    </div>
                    <span className={`testimony-status ${t.status}`}>
                      {t.status === 'final' ? 'Final' : 'Draft'}
                    </span>
                  </div>
                  <div className="testimony-card-meta">
                    {t.wordCount || 0} words · {new Date(t.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : !showCreate && (
            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
              <div className="empty-state-icon" aria-hidden="true" style={{ fontSize: 36 }}>✍️</div>
              <h3>No testimony drafts</h3>
              <p>Click "+ New" to start drafting testimony for a bill.</p>
            </div>
          )}
            </>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-2) 0', gap: 'var(--space-4)' }}>
               <button className="btn btn-ghost btn-sm" onClick={() => setSidebarOpen(true)} title="Expand Sidebar">
                 ▶
               </button>
               {testimonies.slice(0, 5).map(t => (
                 <div 
                   key={t.id} 
                   title={t.title}
                   onClick={() => setActiveTestimony(t)}
                   style={{
                     width: '32px', height: '32px', 
                     borderRadius: '50%', 
                     background: activeTestimony?.id === t.id ? 'var(--accent-primary)' : 'var(--bg-input)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     cursor: 'pointer', fontSize: '14px', fontWeight: 'bold'
                   }}
                 >
                   {t.title.charAt(0).toUpperCase()}
                 </div>
               ))}
             </div>
          )}
        </div>

        {/* Center panel — editor */}
        <div className="testimony-editor-panel testimony-panel-center">
          {activeTestimony ? (
            <>
              {/* Editor header */}
              <div className="testimony-editor-header">
                <div style={{ flex: 1 }}>
                  <input
                    className="testimony-title-input"
                    value={activeTestimony.title}
                    onChange={e => handleTitleChange(e.target.value)}
                    onBlur={handleSave}
                    aria-label="Testimony title"
                  />
                  {activeTestimony.billNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                      <span aria-hidden="true">📜</span> Re: {activeTestimony.billNumber}
                      {activeTestimony.billId && (
                        <> · <Link href={`/bills/${activeTestimony.billId}`} style={{ fontSize: 'var(--text-xs)' }}>View Bill →</Link></>
                      )}
                      <input
                        className="input"
                        placeholder="Section reference (e.g. § 1.A)"
                        value={activeTestimony.sectionRef || ''}
                        onChange={e => setActiveTestimony(prev => ({ ...prev, sectionRef: e.target.value }))}
                        onBlur={handleSave}
                        style={{ marginLeft: 'var(--space-3)', width: '200px', fontSize: '10px', padding: '2px 6px', background: 'transparent' }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                  <button
                    className={`btn btn-sm ${activeTestimony.status === 'final' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={handleToggleStatus}
                  >
                    {activeTestimony.status === 'final' ? '✓ Final' : '📝 Draft'}
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={handleSave} disabled={saving}>
                    {saving ? '⏳' : '💾'} Save
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={handleExportPdf} disabled={exporting}>
                    {exporting ? '⏳' : '📄'} PDF
                  </button>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => handleDelete(activeTestimony.id)}
                    style={{ color: 'var(--color-oppose)' }}
                    aria-label="Delete testimony"
                  >
                    🗑
                  </button>
                  <div style={{ marginLeft: 'var(--space-2)', borderLeft: '1px solid var(--border-primary)', paddingLeft: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                    <button 
                      className={`btn btn-sm ${activeRightPane === 'preview' ? 'btn-primary' : 'btn-ghost'}`} 
                      onClick={() => setActiveRightPane(activeRightPane === 'preview' ? 'none' : 'preview')} 
                      title="Toggle Live PDF Preview"
                    >
                       👀 Preview
                    </button>
                    {activeTestimony.billId && (
                       <button 
                         className={`btn btn-sm ${activeRightPane === 'bill' ? 'btn-primary' : 'btn-ghost'}`} 
                         onClick={() => setActiveRightPane(activeRightPane === 'bill' ? 'none' : 'bill')} 
                         title="Toggle Bill Reference Pane"
                       >
                         📜 Source
                       </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Metadata */}
              <div className="testimony-metadata-form form-grid-3" style={{ gap: 'var(--space-4)', padding: 'var(--space-4)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                <div>
                  <label className="label" style={{ fontSize: 'var(--text-xs)' }}>Author Name <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '10px' }}>(Prints on FROM line)</span></label>
                  <input className="input" style={{ padding: '4px 8px' }} value={activeTestimony.authorName || ''} onChange={e => setActiveTestimony(prev => ({ ...prev, authorName: e.target.value }))} onBlur={handleSave} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 'var(--text-xs)' }}>Job Title</label>
                  <input className="input" style={{ padding: '4px 8px' }} value={activeTestimony.jobTitle || ''} onChange={e => setActiveTestimony(prev => ({ ...prev, jobTitle: e.target.value }))} onBlur={handleSave} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 'var(--text-xs)' }}>Organization</label>
                  <input className="input" style={{ padding: '4px 8px' }} value={activeTestimony.organization || ''} onChange={e => setActiveTestimony(prev => ({ ...prev, organization: e.target.value }))} onBlur={handleSave} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 'var(--text-xs)' }}>Committee Date <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '10px' }}>(Prints on DATE line)</span></label>
                  <input type="date" className="input" style={{ padding: '4px 8px' }} value={activeTestimony.committeeDate || ''} onChange={e => { setActiveTestimony(prev => ({ ...prev, committeeDate: e.target.value })); setTimeout(handleSave, 0); }} />
                </div>
                <div>
                  <label className="label" style={{ fontSize: 'var(--text-xs)' }}>Position <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '10px' }}>(Header bold)</span></label>
                  <select className="input" style={{ padding: '4px 8px' }} value={activeTestimony.position || 'neutral'} onChange={e => { setActiveTestimony(prev => ({ ...prev, position: e.target.value })); setTimeout(handleSave, 0); }}>
                    <option value="support">Support</option>
                    <option value="oppose">Oppose</option>
                    <option value="neutral">Neutral</option>
                    <option value="interested">Interested Party</option>
                  </select>
                </div>
              </div>

              {/* Testimony Builder Blocks */}
              <div className="testimony-builder" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', backgroundColor: 'var(--bg-app)' }}>
                {blocks.map((block, i) => (
                  <TestimonyBlock key={block.id} block={block} index={i} onChange={handleBlockChange} onRemove={handleBlockRemove} />
                ))}
                
                <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', padding: 'var(--space-8) 0', borderTop: '2px dashed var(--border-color)', marginTop: 'var(--space-4)' }}>
                  <button className="btn btn-secondary" onClick={() => addBlock('intro')}>+ Add General Text</button>
                  <button className="btn btn-primary" onClick={() => addBlock('section')}>+ Add Section Analysis</button>
                </div>
              </div>

              {/* Footer stats */}
              <div className="testimony-editor-footer">
                <span>{wordCount} words</span>
                <span aria-live="polite">{saveStatus}</span>
                <span>Last saved: {new Date(activeTestimony.updatedAt).toLocaleTimeString()}</span>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-12)' }}>
              <div className="empty-state-icon" aria-hidden="true" style={{ fontSize: 48 }}>✍️</div>
              <h3>Select a testimony draft</h3>
              <p>Choose a draft from the list or create a new one to start writing.</p>
            </div>
          )}
        </div>

        {/* Right Reference Pane */}
        {activeTestimony && activeRightPane !== 'none' && (
          <div className="testimony-reference-panel testimony-panel-right" data-open={true} data-sidebar-open={sidebarOpen} style={{ 
            background: activeRightPane === 'preview' ? '#525659' : '#fff', // dark gray for PDF preview bg
            color: '#000', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-primary)',
            flexDirection: 'column', 
            overflow: 'hidden',
            maxHeight: '80vh'
          }}>
            <div style={{ padding: 'var(--space-3)', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 'var(--text-sm)', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeRightPane === 'bill' ? (
                  <><span aria-hidden="true">📜</span> Source: {activeTestimony.billNumber}</>
                ) : (
                  <><span aria-hidden="true">👀</span> Live PDF Preview</>
                )}
              </strong>
              <div style={{ display: 'flex', gap: '4px' }}>
                {activeRightPane === 'preview' && (
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setFullScreenPreview(true)} 
                    title="Enlarge Full Screen" 
                    style={{ color: '#64748b', padding: '2px 8px' }}
                  >
                    ⤢
                  </button>
                )}
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={() => setActiveRightPane('none')} 
                  title="Close Pane" 
                  style={{ color: '#94a3b8', padding: '2px 8px' }}
                >
                  ✕
                </button>
              </div>
            </div>
            {activeRightPane === 'bill' ? (
              <div style={{ padding: 'var(--space-5)', overflowY: 'auto', flex: 1, fontSize: '13px', lineHeight: '1.6', fontFamily: 'var(--font-mono)' }}>
                {loadingBillHtml ? (
                  <div style={{ textAlign: 'center', color: '#64748b', marginTop: 'var(--space-8)' }}>
                    Loading bill text...
                  </div>
                ) : billHtml ? (
                  <div className="raw-bill-content" dangerouslySetInnerHTML={{ __html: billHtml.length > 50000 ? billHtml.substring(0, 50000) + '... (truncated)' : billHtml }} />
                ) : (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    No full text available for this bill yet. 
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, backgroundColor: '#525659', padding: 'var(--space-4)', overflow: 'hidden' }}>
                 <iframe 
                  srcDoc={buildTestimonyPdfHtml({ testimony: { ...activeTestimony, body: JSON.stringify(blocks) || '' } }).replace('</head>', '<style>html { background: #525659; } body { zoom: 0.5; background: #fff; max-width: 816px; margin: 0 auto !important; min-height: 1056px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); padding: 1in; } @media (max-width: 900px) { body { zoom: 0.4; } }</style></head>')}
                  style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#525659' }}
                  title="PDF Preview"
                />
              </div>
            )}
          </div>
        )}

      </div>

      {/* Full Screen PDF Preview Modal */}
      {fullScreenPreview && activeTestimony && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, 
          display: 'flex', flexDirection: 'column' 
        }}>
          <div style={{ 
            height: '60px', 
            background: '#1e293b', 
            color: '#fff', 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
            padding: '0 var(--space-6)',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span aria-hidden="true">📄</span> Live Document Preview
            </h2>
            <button 
              className="btn btn-ghost" 
              onClick={() => setFullScreenPreview(false)} 
              style={{ color: '#cbd5e1', fontSize: '18px', padding: '4px 12px' }}
              title="Close Full Screen"
            >
              ✕ Close
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', padding: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
             <iframe 
              srcDoc={buildTestimonyPdfHtml({ testimony: { ...activeTestimony, body: JSON.stringify(blocks) || '' } }).replace('</head>', '<style>html { background: transparent; } body { background: #fff; max-width: 850px; margin: 0 auto !important; min-height: 1100px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); padding: 1in; }</style></head>')}
              style={{ width: '100%', maxWidth: '900px', height: '100%', border: 'none', backgroundColor: 'transparent' }}
              title="Full Screen PDF Preview"
            />
          </div>
        </div>
      )}
    </>
  );
}
