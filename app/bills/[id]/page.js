'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const TAG_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#64748b',
];

const MARKUP_COLORS = {
  highlight: '#fbbf24',
  strikethrough: '#ef4444',
  suggest: '#22c55e',
};

export default function BillDetailPage() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isWatched, setIsWatched] = useState(false);
  const [relatedBills, setRelatedBills] = useState([]);

  // Tags
  const [allTags, setAllTags] = useState([]);
  const [billTags, setBillTags] = useState([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');

  // Collections
  const [collections, setCollections] = useState([]);
  const [billCollections, setBillCollections] = useState([]);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);

  // Annotations
  const [annotations, setAnnotations] = useState([]);
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  // Markups (Phase 3)
  const [markups, setMarkups] = useState([]);
  const [activeMarkupTool, setActiveMarkupTool] = useState(null); // 'highlight' | 'strikethrough' | 'suggest'
  const [suggestText, setSuggestText] = useState('');
  const [showSuggestInput, setShowSuggestInput] = useState(false);
  const [markupSelectedText, setMarkupSelectedText] = useState('');
  const [markupOffsets, setMarkupOffsets] = useState({ start: 0, end: 0 });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchBill() {
      try {
        const [res, watchRes, tagsRes, billTagsRes, annoRes, colsRes, markupsRes, relRes] = await Promise.all([
          fetch(`/api/bills/${id}`),
          fetch('/api/watchlist'),
          fetch('/api/tags'),
          fetch(`/api/bills/${id}/tags`),
          fetch(`/api/annotations?billId=${id}`),
          fetch('/api/collections'),
          fetch(`/api/markups?billId=${id}`),
          fetch(`/api/relationships?billId=${id}`),
        ]);
        const data = await res.json();
        const watchData = await watchRes.json();
        const tagsData = await tagsRes.json();
        const billTagsData = await billTagsRes.json();
        const annoData = await annoRes.json();
        const colsData = await colsRes.json();
        const markupsData = await markupsRes.json();
        const relData = await relRes.json();

        if (data.error) {
          setError(data.error);
        } else {
          setBill(data.bill);
          setVersions(data.versions || []);
          if (data.versions && data.versions.length > 0) {
            setSelectedVersionId(data.versions[0].docId);
          }
        }
        const watched = (watchData.items || []).some(i => String(i.billId) === String(id));
        setIsWatched(watched);
        setAllTags(tagsData.tags || []);
        setBillTags(billTagsData.billTags || []);
        setAnnotations(annoData.annotations || []);
        setCollections(colsData.collections || []);
        setMarkups(markupsData.markups || []);
        setRelatedBills(relData.related || []);

        // Check which collections this bill is in
        const colChecks = await Promise.all(
          (colsData.collections || []).map(async (c) => {
            const r = await fetch(`/api/collections/${c.id}/bills`);
            const d = await r.json();
            const has = (d.bills || []).some(b => String(b.billId) === String(id));
            return has ? c.id : null;
          })
        );
        setBillCollections(colChecks.filter(Boolean));
      } catch {
        setError('Failed to load bill details.');
      } finally {
        setLoading(false);
      }
    }
    fetchBill();
  }, [id]);

  // Load comments for active annotation
  useEffect(() => {
    if (!activeAnnotation) { setComments([]); return; }
    fetch(`/api/annotations/${activeAnnotation.id}/comments`)
      .then(r => r.json())
      .then(d => setComments(d.comments || []))
      .catch(() => setComments([]));
  }, [activeAnnotation]);

  const handleTextSelect = () => {
    const sel = window.getSelection();
    const text = sel?.toString()?.trim();
    if (text && text.length > 2) {
      // If a markup tool is active, apply the markup
      if (activeMarkupTool) {
        const range = sel.getRangeAt(0);
        const container = range.startContainer.parentElement?.closest('.bill-text-viewer');
        if (container) {
          const fullText = container.textContent || '';
          const start = fullText.indexOf(text);
          const end = start + text.length;
          setMarkupSelectedText(text);
          setMarkupOffsets({ start, end });
          if (activeMarkupTool === 'suggest') {
            setShowSuggestInput(true);
          } else {
            handleCreateMarkup(activeMarkupTool, text, start, end);
          }
        }
        sel.removeAllRanges();
        return;
      }
      setSelectedText(text);
      setShowAnnotationForm(true);
    }
  };

  const handleCreateMarkup = async (type, text, startOffset, endOffset, suggested = '') => {
    try {
      const res = await fetch('/api/markups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: id,
          selectedText: text || markupSelectedText,
          type,
          startOffset: startOffset ?? markupOffsets.start,
          endOffset: endOffset ?? markupOffsets.end,
          suggestedText: suggested || suggestText,
          color: MARKUP_COLORS[type],
        }),
      });
      const data = await res.json();
      setMarkups(prev => [...prev, data.markup]);
      setShowSuggestInput(false);
      setSuggestText('');
      setMarkupSelectedText('');
    } catch { /* ignore */ }
  };

  const handleDeleteMarkup = async (markupId) => {
    try {
      await fetch(`/api/markups?id=${markupId}`, { method: 'DELETE' });
      setMarkups(prev => prev.filter(m => m.id !== markupId));
    } catch { /* ignore */ }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?billId=${id}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bill?.number || 'bill'}-export.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleCreateAnnotation = async () => {
    if (!selectedText) return;
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: id,
          selectedText,
          note: newNote,
          startOffset: 0,
          endOffset: selectedText.length,
        }),
      });
      const data = await res.json();
      setAnnotations(prev => [...prev, data.annotation]);
      setSelectedText('');
      setNewNote('');
      setShowAnnotationForm(false);
    } catch { /* ignore */ }
  };

  const handleDeleteAnnotation = async (annoId) => {
    try {
      await fetch(`/api/annotations?id=${annoId}`, { method: 'DELETE' });
      setAnnotations(prev => prev.filter(a => a.id !== annoId));
      if (activeAnnotation?.id === annoId) setActiveAnnotation(null);
    } catch { /* ignore */ }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !activeAnnotation) return;
    try {
      const res = await fetch(`/api/annotations/${activeAnnotation.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment }),
      });
      const data = await res.json();
      setComments(prev => [...prev, data.comment]);
      setNewComment('');
    } catch { /* ignore */ }
  };

  const handleAddTag = async (tagId) => {
    try {
      await fetch(`/api/bills/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });
      setBillTags(prev => [...prev, { billId: id, tagId }]);
    } catch { /* ignore */ }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await fetch(`/api/bills/${id}/tags?tagId=${tagId}`, { method: 'DELETE' });
      setBillTags(prev => prev.filter(bt => bt.tagId !== tagId));
    } catch { /* ignore */ }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });
      const data = await res.json();
      setAllTags(prev => [...prev, data.tag]);
      setNewTagName('');
    } catch { /* ignore */ }
  };

  const handleToggleCollection = async (colId) => {
    if (billCollections.includes(colId)) {
      await fetch(`/api/collections/${colId}/bills?billId=${id}`, { method: 'DELETE' });
      setBillCollections(prev => prev.filter(c => c !== colId));
    } else {
      await fetch(`/api/collections/${colId}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: id, billNumber: bill?.number, billTitle: bill?.title, jurisdiction: bill?.jurisdiction }),
      });
      setBillCollections(prev => [...prev, colId]);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, animation: 'pulse 1.5s infinite' }}>📜</div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)' }}>Loading bill details...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <p style={{ color: 'var(--color-oppose)' }}>{error || 'Bill not found'}</p>
        <Link href="/bills" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }}>← Back to Bills</Link>
      </div>
    );
  }

  const billTagObjects = billTags.map(bt => allTags.find(t => t.id === bt.tagId)).filter(Boolean);
  const availableTags = allTags.filter(t => !billTags.some(bt => bt.tagId === t.id));

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'text', label: 'Read Text' },
    { id: 'history', label: `History (${bill.history?.length || 0})` },
    { id: 'versions', label: `Versions & Diffs (${versions.length})` },
    { id: 'sponsors', label: `Sponsors (${bill.sponsors?.length || 0})` },
    { id: 'votes', label: `Votes (${bill.votes?.length || 0})` },
    { id: 'annotations', label: `Annotations (${annotations.length})` },
    { id: 'markups', label: `Markups (${markups.length})` },
    { id: 'related', label: `Related (${relatedBills.length})` },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <Link href="/bills" className="btn btn-ghost btn-sm">← Back to Bills</Link>
        <button className="btn btn-sm btn-secondary" onClick={handleExportPdf} disabled={exporting}>
          {exporting ? '⏳ Exporting...' : '📄 Export PDF'}
        </button>
      </div>

      <div className="page-header fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h1>{bill.number}</h1>
          <span className="badge badge-status">{bill.status}</span>
          <span className="badge badge-info">{bill.jurisdiction}</span>
          <button
            className={`btn btn-sm ${isWatched ? 'btn-primary' : 'btn-secondary'}`}
            onClick={async () => {
              if (isWatched) {
                await fetch(`/api/watchlist?billId=${id}`, { method: 'DELETE' });
                setIsWatched(false);
              } else {
                await fetch('/api/watchlist', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ billId: id, billNumber: bill.number, title: bill.title, jurisdiction: bill.jurisdiction }),
                });
                setIsWatched(true);
              }
            }}
          >
            {isWatched ? '✓ Watching' : 'Watch'}
          </button>

          {/* Collection picker */}
          <div className="tag-picker" style={{ position: 'relative' }}>
            <button className="btn btn-sm btn-secondary" onClick={() => { setShowCollectionPicker(!showCollectionPicker); setShowTagPicker(false); }} aria-expanded={showCollectionPicker} aria-haspopup="true">
              <span aria-hidden="true">📁</span> {billCollections.length > 0 ? `In ${billCollections.length} collection${billCollections.length > 1 ? 's' : ''}` : 'Add to Collection'}
            </button>
            {showCollectionPicker && (
              <div className="tag-picker-dropdown" style={{ minWidth: 220 }} role="listbox" aria-label="Collections">
                {collections.length > 0 ? collections.map(c => (
                  <div key={c.id} className="tag-picker-item" role="option" aria-selected={billCollections.includes(c.id)} onClick={() => handleToggleCollection(c.id)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleCollection(c.id); } }}>
                    <span>{billCollections.includes(c.id) ? '✓' : '○'}</span>
                    <span>{c.name}</span>
                  </div>
                )) : (
                  <div style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    No collections yet. <Link href="/collections">Create one →</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <p>{bill.title}</p>
        {bill.description && bill.description !== bill.title ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>{bill.description}</p>
        ) : null}

        {/* Tags */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)', alignItems: 'center' }}>
          {billTagObjects.map(tag => (
            <span key={tag.id} className="tag-chip">
              <span className="tag-color-dot" style={{ background: tag.color }} aria-hidden="true" />
              {tag.name}
              <button className="remove-tag" onClick={() => handleRemoveTag(tag.id)} aria-label={`Remove tag ${tag.name}`} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.5, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          <div className="tag-picker" style={{ position: 'relative' }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 'var(--text-xs)' }} onClick={() => { setShowTagPicker(!showTagPicker); setShowCollectionPicker(false); }} aria-expanded={showTagPicker} aria-haspopup="true">
              + Tag
            </button>
            {showTagPicker && (
              <div className="tag-picker-dropdown" role="listbox" aria-label="Available tags">
                {availableTags.map(tag => (
                  <div key={tag.id} className="tag-picker-item" role="option" aria-selected={false} onClick={() => { handleAddTag(tag.id); setShowTagPicker(false); }} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleAddTag(tag.id); setShowTagPicker(false); } }}>
                    <span className="tag-color-dot" style={{ background: tag.color }} aria-hidden="true" />
                    <span>{tag.name}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <input
                      className="input"
                      style={{ flex: 1, fontSize: 'var(--text-xs)', padding: '4px 8px' }}
                      placeholder="New tag..."
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
                    />
                    <select
                      value={newTagColor}
                      onChange={e => setNewTagColor(e.target.value)}
                      aria-label="Tag color"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: newTagColor, fontSize: 'var(--text-xs)', padding: '4px' }}
                    >
                      {TAG_COLORS.map(c => (
                        <option key={c} value={c} style={{ color: c }}>●</option>
                      ))}
                    </select>
                    <button className="btn btn-sm btn-primary" onClick={handleCreateTag} style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}>+</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tab-bar fade-in" role="tablist" aria-label="Bill details">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="fade-in" style={{ marginTop: 'var(--space-4)' }}>
        {activeTab === 'overview' && (
          <div className="card" role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
            <div className="settings-grid-row">
              <div>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Session</strong>
                <p>{bill.session}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Last Action</strong>
                <p>{bill.lastActionDate}</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{bill.lastAction}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Introduced</strong>
                <p>{bill.introducedDate || 'N/A'}</p>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Status Date</strong>
                <p>{bill.statusDate || 'N/A'}</p>
              </div>
              {bill.subjects?.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Subjects</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    {bill.subjects.map((s) => (
                      <span key={s.subject_id || s} className="keyword-chip">{s.subject_name || s}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>External Links</strong>
                <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  {bill.url && <a href={bill.url} target="_blank" rel="noopener noreferrer">LegiScan Page →</a>}
                  {bill.stateLink && <a href={bill.stateLink} target="_blank" rel="noopener noreferrer">State Legislature Page →</a>}
                </div>
              </div>
              {bill.amendmentCount > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Amendments</strong>
                  <p><span className="badge badge-info">{bill.amendmentCount} amendment{bill.amendmentCount !== 1 ? 's' : ''}</span></p>
                </div>
              )}
            </div>

            {/* CRS Summary — Congress.gov enrichment */}
            {bill.crsSummary && (
              <div style={{ marginTop: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                  <span aria-hidden="true">📋</span> CRS Summary
                </h2>
                <div className="crs-summary-card">
                  <div dangerouslySetInnerHTML={{ __html: bill.crsSummary }} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div className="card" role="tabpanel" id="tabpanel-text" aria-labelledby="tab-text">
            {versions.length > 0 ? (() => {
              const latest = versions.find(v => String(v.docId) === String(selectedVersionId)) || versions[0];
              return (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>Bill Text</h2>
                      <select 
                        className="input" 
                        style={{ padding: '4px 8px', fontSize: 'var(--text-sm)', minWidth: 200 }}
                        value={selectedVersionId}
                        onChange={(e) => setSelectedVersionId(e.target.value)}
                        aria-label="Select bill version"
                      >
                        {versions.map((v, i) => (
                          <option key={v.docId} value={v.docId}>
                            {v.type || `Version ${versions.length - i}`} ({v.date})
                          </option>
                        ))}
                      </select>
                    </div>
                    {latest.url && <a href={latest.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">View Original Document →</a>}
                  </div>
                  
                  {latest.text ? (
                    <div className="bill-text-viewer" style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text-primary)', maxWidth: '800px', margin: '0 auto', background: 'var(--bg-primary)', padding: 'var(--space-6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', whiteSpace: 'pre-wrap' }}>
                      {latest.text}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)' }}>Text not available for the current version.</p>
                  )}
                </div>
              );
            })() : (
              <div className="empty-state">
                <div style={{ fontSize: 32, marginBottom: 'var(--space-2)' }}>📄</div>
                <p>No text available. Ingest this bill from the Dashboard first.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card" role="tabpanel" id="tabpanel-history" aria-labelledby="tab-history">
            {bill.history?.length > 0 ? (
              bill.history.map((h, i) => (
                <div key={i} style={{ padding: 'var(--space-3) 0', borderBottom: i < bill.history.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', minWidth: 80 }}>{h.date}</span>
                    {h.chamber && <span className="badge" style={{ fontSize: 'var(--text-xs)' }}>{h.chamber === 'H' ? 'House' : 'Senate'}</span>}
                    <span style={{ fontSize: 'var(--text-sm)' }}>{h.action}</span>
                  </div>
                </div>
              ))
            ) : <p style={{ color: 'var(--text-muted)' }}>No history available.</p>}
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="card" role="tabpanel" id="tabpanel-versions" aria-labelledby="tab-versions">
            <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                <span aria-hidden="true">📝</span> {versions.length} text {versions.length === 1 ? 'version' : 'versions'} available
              </span>
              {versions.length >= 2 ? (
                <Link href={`/bills/${id}/diff`} className="btn btn-primary btn-sm">Compare Versions →</Link>
              ) : (
                <button className="btn btn-secondary btn-sm" disabled title="Need at least 2 text versions to compare documents">Compare Versions (Need 2+)</button>
              )}
            </div>

            {/* Markup Toolbar */}
            <div className="markup-toolbar" role="toolbar" aria-label="Markup tools">
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginRight: 'var(--space-2)' }}>Markup:</span>
              {[
                { type: 'highlight', icon: '🖊', label: 'Highlight' },
                { type: 'strikethrough', icon: '~~', label: 'Strikethrough' },
                { type: 'suggest', icon: '💬', label: 'Suggest' },
              ].map(tool => (
                <button
                  key={tool.type}
                  className={`markup-tool-btn ${activeMarkupTool === tool.type ? 'active' : ''}`}
                  onClick={() => setActiveMarkupTool(activeMarkupTool === tool.type ? null : tool.type)}
                  aria-pressed={activeMarkupTool === tool.type}
                  title={`${tool.label} — select text then click`}
                >
                  {tool.icon} {tool.label}
                </button>
              ))}
              {activeMarkupTool && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary-hover)', marginLeft: 'var(--space-2)' }}>
                  Select text to apply {activeMarkupTool}
                </span>
              )}
            </div>

            {/* Suggest text input */}
            {showSuggestInput && (
              <div className="annotation-form" style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="annotation-selected-text">"{markupSelectedText.slice(0, 200)}"</div>
                <input
                  className="input"
                  placeholder="Enter suggested replacement text..."
                  value={suggestText}
                  onChange={e => setSuggestText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateMarkup('suggest'); }}
                  autoFocus
                  aria-label="Suggested replacement text"
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleCreateMarkup('suggest')}>✓ Apply Suggestion</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowSuggestInput(false); setSuggestText(''); setMarkupSelectedText(''); }}>Cancel</button>
                </div>
              </div>
            )}

            {versions.length > 0 ? (
              versions.map((v, i) => (
                <div key={v.docId || i} style={{ marginBottom: 'var(--space-6)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <strong>{v.type || `Version ${i + 1}`}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>{v.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      {v.url && <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">View on State Site →</a>}
                    </div>
                  </div>
                  {v.text ? (
                    <div
                      className={`bill-text-viewer ${activeMarkupTool ? 'markup-mode' : ''}`}
                      onMouseUp={handleTextSelect}
                      style={activeMarkupTool ? { cursor: 'text', borderColor: MARKUP_COLORS[activeMarkupTool] } : {}}
                    >
                      {v.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000)}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>{v.error || 'Text not available'} — <a href={v.url} target="_blank" rel="noopener noreferrer">view on state site</a>.</p>
                  )}
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No text versions available. Ingest this bill from the Dashboard first.</p>
            )}

            {/* Annotation creation form (appears when text is selected and no markup tool) */}
            {showAnnotationForm && selectedText && !activeMarkupTool && (
              <div className="annotation-form" style={{ marginTop: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                <div className="annotation-selected-text">"{selectedText.slice(0, 200)}{selectedText.length > 200 ? '...' : ''}"</div>
                <textarea
                  placeholder="Add a note about this selection..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <button className="btn btn-primary btn-sm" onClick={handleCreateAnnotation}>💬 Save Annotation</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowAnnotationForm(false); setSelectedText(''); setNewNote(''); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sponsors' && (
          <div className="card" role="tabpanel" id="tabpanel-sponsors" aria-labelledby="tab-sponsors">
            {bill.sponsors?.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <caption className="sr-only">Bill sponsors</caption>
              <thead>
                <tr><th scope="col">Name</th><th scope="col">Party</th><th scope="col">Role</th><th scope="col">District</th></tr>
              </thead>
              <tbody>
                {bill.sponsors.map((s, i) => (
                  <tr key={i}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.party || '—'}</td>
                    <td>{s.role === 1 ? 'Primary' : 'Co-Sponsor'}</td>
                    <td>{s.district || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            ) : <p style={{ color: 'var(--text-muted)' }}>No sponsor information available.</p>}
          </div>
        )}

        {activeTab === 'votes' && (
          <div className="card" role="tabpanel" id="tabpanel-votes" aria-labelledby="tab-votes">
            {bill.votes?.length > 0 ? (
              bill.votes.map((v, i) => (
                <div key={i} style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-primary)' }}>
                  <div><strong>{v.desc}</strong> <span style={{ color: 'var(--text-muted)' }}>— {v.date}</span></div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--color-support)' }}>✓ Yea: {v.yea}</span>
                    <span style={{ color: 'var(--color-oppose)' }}>✗ Nay: {v.nay}</span>
                    <span style={{ color: 'var(--text-muted)' }}>— Absent: {v.absent}</span>
                  </div>
                </div>
              ))
            ) : <p style={{ color: 'var(--text-muted)' }}>No votes recorded yet.</p>}
          </div>
        )}

        {activeTab === 'annotations' && (
          <div className="split-layout" role="tabpanel" id="tabpanel-annotations" aria-labelledby="tab-annotations">
            <div className="card">
              <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-md)', fontWeight: 600 }}><span aria-hidden="true">💬</span> Annotations</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                Select text on the "Text Versions" tab to create annotations. Click an annotation below to view its discussion thread.
              </p>
              {annotations.length > 0 ? annotations.map(anno => (
                <div
                  key={anno.id}
                  className={`annotation-card ${activeAnnotation?.id === anno.id ? 'active' : ''}`}
                  onClick={() => setActiveAnnotation(anno)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={activeAnnotation?.id === anno.id}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveAnnotation(anno); } }}
                >
                  <div className="annotation-selected-text">"{anno.selectedText?.slice(0, 150)}{(anno.selectedText?.length || 0) > 150 ? '...' : ''}"</div>
                  {anno.note && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{anno.note}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="comment-meta">{new Date(anno.createdAt).toLocaleString()}</span>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); handleDeleteAnnotation(anno.id); }} style={{ color: 'var(--color-oppose)', fontSize: 'var(--text-xs)' }} aria-label={`Delete annotation`}>Delete</button>
                  </div>
                </div>
              )) : (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                  <div className="empty-state-icon" style={{ fontSize: 36 }} aria-hidden="true">💬</div>
                  <h3>No annotations yet</h3>
                  <p>Select text in the Versions tab to start annotating.</p>
                </div>
              )}
            </div>

            {/* Comment Thread Panel */}
            <div className="annotation-panel">
              <div className="annotation-panel-header">
                <h3>{activeAnnotation ? 'Discussion' : 'Select an Annotation'}</h3>
              </div>
              {activeAnnotation ? (
                <>
                  <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
                    <div className="annotation-selected-text">"{activeAnnotation.selectedText?.slice(0, 200)}"</div>
                    {activeAnnotation.note && <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>{activeAnnotation.note}</p>}
                  </div>
                  <div className="comment-thread" style={{ padding: '0 var(--space-5) var(--space-3)' }}>
                    {comments.length > 0 ? comments.map(c => (
                      <div key={c.id} className={`comment-item ${c.parentCommentId ? 'reply' : ''}`}>
                        <div className="comment-meta">{new Date(c.createdAt).toLocaleString()}</div>
                        <div className="comment-body">{c.body}</div>
                      </div>
                    )) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', padding: 'var(--space-2)' }}>No comments yet. Start the discussion below.</p>
                    )}
                  </div>
                  <div className="annotation-form">
                    <textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    />
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={handleAddComment} disabled={!newComment.trim()}>
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p>Click an annotation to view its discussion thread.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'markups' && (
          <div className="card" role="tabpanel" id="tabpanel-markups" aria-labelledby="tab-markups">
            <h2 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-md)', fontWeight: 600 }}>
              <span aria-hidden="true">🖊</span> Markups & Redlines
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
              Use the markup toolbar on the "Text Versions" tab to highlight, strikethrough, or suggest changes to bill text.
            </p>
            {markups.length > 0 ? markups.map(m => (
              <div key={m.id} className="markup-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <span className={`markup-type-badge ${m.type}`}>
                    {m.type === 'highlight' ? '🖊 Highlight' : m.type === 'strikethrough' ? '~~ Strikethrough' : '💬 Suggestion'}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div className="annotation-selected-text">"{m.selectedText?.slice(0, 200)}"</div>
                {m.type === 'suggest' && m.suggestedText && (
                  <div className="markup-suggestion">
                    <span style={{ fontWeight: 600, color: 'var(--color-support)' }}>Suggested: </span>
                    "{m.suggestedText}"
                  </div>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDeleteMarkup(m.id)}
                  style={{ color: 'var(--color-oppose)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}
                  aria-label="Delete markup"
                >
                  Delete
                </button>
              </div>
            )) : (
              <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                <div className="empty-state-icon" style={{ fontSize: 36 }} aria-hidden="true">🖊</div>
                <h3>No markups yet</h3>
                <p>Go to the Text Versions tab, activate a markup tool, and select text to start redlining.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'related' && (
          <div className="card" role="tabpanel" id="tabpanel-related" aria-labelledby="tab-related">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              Automatically Identified Relationships
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
              Our engine identifies potential companion bills and similar legislation across jurisdictions based on shared topics and sponsors.
            </p>
            {relatedBills.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {relatedBills.map((rel, idx) => (
                  <div key={idx} className="card" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Link href={`/bills/${rel.relatedBillId}`} style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)', textDecoration: 'none' }}>
                          {rel.billNumber}
                        </Link>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {rel.title.length > 120 ? rel.title.substring(0, 120) + '...' : rel.title}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--color-support)' }}>{rel.type}</span>
                          <span className="badge badge-info">{rel.jurisdiction}</span>
                        </div>
                        {rel.reason && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                            🖇 {rel.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-primary)' }}>
                      <Link 
                        href={`/compare?id1=${id}&id2=${rel.relatedBillId}`} 
                        className="btn btn-ghost btn-sm" 
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                      >
                        <span>⚖️</span> Compare Texts Side-by-Side
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div>🖇</div>
                <p>No relationships found yet. Sync related jurisdictions to improve discovery.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
