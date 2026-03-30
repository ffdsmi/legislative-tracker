'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function DiffPage() {
  const { id } = useParams();
  const [versions, setVersions] = useState([]);
  const [oldIdx, setOldIdx] = useState(0);
  const [newIdx, setNewIdx] = useState(1);
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diffLoading, setDiffLoading] = useState(false);
  const [error, setError] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [changePositions, setChangePositions] = useState([]);
  const [currentChangeIdx, setCurrentChangeIdx] = useState(-1);
  const diffBodyRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/diff?billId=${id}`);
        const data = await res.json();
        setVersions(data.versions || []);
        if (data.versions?.length >= 2) {
          setOldIdx(0);
          setNewIdx(1);
        }
        // Fetch bill number
        try {
          const billRes = await fetch(`/api/bills/${id}`);
          const billData = await billRes.json();
          setBillNumber(billData.bill?.number || `Bill ${id}`);
        } catch { setBillNumber(`Bill ${id}`); }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const fetchDiff = useCallback(async () => {
    if (versions.length < 2) return;
    const oldVersion = versions[oldIdx];
    const newVersion = versions[newIdx];
    if (!oldVersion || !newVersion || oldVersion.docId === newVersion.docId) return;

    setDiffLoading(true);
    try {
      const res = await fetch(`/api/diff?billId=${id}&oldDocId=${oldVersion.docId}&newDocId=${newVersion.docId}`);
      const data = await res.json();
      setDiff(data.diff);
    } catch (err) {
      setError(err.message);
    } finally {
      setDiffLoading(false);
    }
  }, [id, versions, oldIdx, newIdx]);

  useEffect(() => {
    if (versions.length >= 2) fetchDiff();
  }, [fetchDiff, versions.length]);

  // Track change positions for navigation
  useEffect(() => {
    if (!diff?.lines) return;
    const positions = [];
    diff.lines.forEach((line, i) => {
      if (line.type === 'added' || line.type === 'removed') {
        if (positions.length === 0 || i - positions[positions.length - 1] > 1) {
          positions.push(i);
        }
      }
    });
    setChangePositions(positions);
    setCurrentChangeIdx(positions.length > 0 ? 0 : -1);
  }, [diff]);

  const navigateToChange = (direction) => {
    if (changePositions.length === 0) return;
    let next = currentChangeIdx + direction;
    if (next < 0) next = changePositions.length - 1;
    if (next >= changePositions.length) next = 0;
    setCurrentChangeIdx(next);
    // Scroll to the change
    const el = document.getElementById(`diff-line-${changePositions[next]}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Collapse unchanged lines into groups
  const renderDiffLines = () => {
    if (!diff?.lines) return null;
    const result = [];
    let unchangedBuffer = [];

    const flushUnchanged = () => {
      if (unchangedBuffer.length === 0) return;
      if (showUnchanged || unchangedBuffer.length <= 6) {
        unchangedBuffer.forEach(item => result.push(item));
      } else {
        // Show first 3, collapsed button, last 3
        unchangedBuffer.slice(0, 3).forEach(item => result.push(item));
        result.push({
          type: 'collapsed',
          count: unchangedBuffer.length - 6,
          key: `collapsed-${unchangedBuffer[0].key}`,
        });
        unchangedBuffer.slice(-3).forEach(item => result.push(item));
      }
      unchangedBuffer = [];
    };

    diff.lines.forEach((line, i) => {
      const item = { ...line, key: `line-${i}`, index: i };
      if (line.type === 'unchanged') {
        unchangedBuffer.push(item);
      } else {
        flushUnchanged();
        result.push(item);
      }
    });
    flushUnchanged();
    return result;
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <div style={{ fontSize: 32, animation: 'pulse 1.5s infinite' }} aria-hidden="true">📝</div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-4)' }} role="status">Loading versions...</p>
      </div>
    );
  }

  return (
    <>
      <Link href={`/bills/${id}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-3)' }}>← Back to {billNumber}</Link>

      <div className="page-header fade-in">
        <h1><span aria-hidden="true">📝</span> Compare Versions — {billNumber}</h1>
        <p>Side-by-side diff of bill text between versions</p>
      </div>

      {error && (
        <div className="setup-banner fade-in">
          <span aria-hidden="true">⚠️</span><span>{error}</span>
        </div>
      )}

      {versions.length < 2 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">📄</div>
            <h3>Not enough versions</h3>
            <p>At least two text versions are needed to compare. Ingest the bill from the Dashboard first.</p>
          </div>
        </div>
      ) : (
        <div className="diff-container fade-in">
          {/* Toolbar */}
          <div className="diff-toolbar">
            <div className="diff-toolbar-group">
              <div className="diff-version-selector">
                <label htmlFor="diff-old-version">Old:</label>
                <select
                  id="diff-old-version"
                  className="filter-select"
                  value={oldIdx}
                  onChange={e => setOldIdx(Number(e.target.value))}
                >
                  {versions.map((v, i) => (
                    <option key={v.docId} value={i} disabled={i === newIdx}>
                      {v.type || `Version ${i + 1}`} ({v.date || 'unknown'})
                    </option>
                  ))}
                </select>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <div className="diff-version-selector">
                <label htmlFor="diff-new-version">New:</label>
                <select
                  id="diff-new-version"
                  className="filter-select"
                  value={newIdx}
                  onChange={e => setNewIdx(Number(e.target.value))}
                >
                  {versions.map((v, i) => (
                    <option key={v.docId} value={i} disabled={i === oldIdx}>
                      {v.type || `Version ${i + 1}`} ({v.date || 'unknown'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="diff-toolbar-group">
              <button
                className="diff-nav-btn"
                onClick={() => navigateToChange(-1)}
                disabled={changePositions.length === 0}
              >
                ↑ Prev
              </button>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }} aria-live="polite">
                {changePositions.length > 0
                  ? `${currentChangeIdx + 1} / ${changePositions.length} changes`
                  : 'No changes'}
              </span>
              <button
                className="diff-nav-btn"
                onClick={() => navigateToChange(1)}
                disabled={changePositions.length === 0}
              >
                ↓ Next
              </button>
              <button
                className={`diff-nav-btn ${showUnchanged ? 'active' : ''}`}
                onClick={() => setShowUnchanged(!showUnchanged)}
                style={showUnchanged ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary-hover)' } : {}}
              >
                {showUnchanged ? '👁 Hide Context' : '👁 Show All'}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          {diff?.stats && (
            <div className="diff-stats-bar">
              <div className="diff-stat additions">
                <span>+{diff.stats.additions}</span>
                <span style={{ fontWeight: 400, fontSize: 'var(--text-xs)' }}>added</span>
              </div>
              <div className="diff-stat removals">
                <span>−{diff.stats.removals}</span>
                <span style={{ fontWeight: 400, fontSize: 'var(--text-xs)' }}>removed</span>
              </div>
              <div className="diff-stat unchanged">
                <span>{diff.stats.unchanged}</span>
                <span style={{ fontWeight: 400, fontSize: 'var(--text-xs)' }}>unchanged</span>
              </div>
            </div>
          )}

          {/* Diff Body */}
          <div className="diff-body" ref={diffBodyRef}>
            {diffLoading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Computing diff...</p>
              </div>
            ) : diff ? (
              renderDiffLines()?.map(item => {
                if (item.type === 'collapsed') {
                  return (
                    <div
                      key={item.key}
                      className="diff-line collapsed"
                      onClick={() => setShowUnchanged(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowUnchanged(true); } }}
                      aria-label={`${item.count} unchanged lines, click to expand`}
                    >
                      ⋯ {item.count} unchanged lines (click to expand)
                    </div>
                  );
                }
                return (
                  <div
                    key={item.key}
                    id={`diff-line-${item.index}`}
                    className={`diff-line ${item.type}`}
                  >
                    <div className="diff-gutter">
                      {item.type === 'removed' ? item.oldLineNumber : item.type === 'added' ? '' : item.oldLineNumber}
                    </div>
                    <div className="diff-gutter">
                      {item.type === 'added' ? item.newLineNumber : item.type === 'removed' ? '' : item.newLineNumber}
                    </div>
                    <div className="diff-content">
                      {item.type === 'added' && <span className="diff-marker">+</span>}
                      {item.type === 'removed' && <span className="diff-marker">−</span>}
                      {item.content}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select two versions to compare
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
