'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { computeDiff } from '@/lib/diff-engine';

function BillSelector({ label, bills, selectedId, onChange }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedBill = bills?.find(b => b.id === (typeof selectedId === 'string' ? parseInt(selectedId) : selectedId) || b.id === selectedId);
  const displayValue = selectedBill ? `${selectedBill.jurisdiction} ${selectedBill.number}` : query;
  
  const filtered = bills?.filter(b => 
    b.number.toLowerCase().includes(query.toLowerCase()) || 
    b.title?.toLowerCase().includes(query.toLowerCase())
  );
  
  return (
    <div style={{ position: 'relative' }}>
      <label className="label">{label}</label>
      <input 
        className="input" 
        value={isOpen ? query : displayValue || ''} 
        onChange={e => { setQuery(e.target.value); setIsOpen(true); onChange(''); }}
        onFocus={() => { setQuery(''); setIsOpen(true); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder="Type bill number or title to search..."
        style={{ width: '100%', textOverflow: 'ellipsis' }}
      />
      {isOpen && (
        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '300px', overflowY: 'auto', padding: 0, marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
          {filtered?.map(b => (
            <div 
              key={b.id} 
              style={{ padding: 'var(--space-3)', cursor: 'pointer', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
              onClick={() => { onChange(b.id); setIsOpen(false); }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.jurisdiction} {b.number}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{b.title?.length > 80 ? b.title.substring(0, 80) + '...' : b.title}</div>
            </div>
          ))}
          {(!filtered || filtered.length === 0) && <div style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>No bills match your search.</div>}
        </div>
      )}
    </div>
  );
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const queryId1 = searchParams.get('id1') || '';
  const queryId2 = searchParams.get('id2') || '';

  const [id1, setId1] = useState(queryId1);
  const [id2, setId2] = useState(queryId2);

  const [bill1, setBill1] = useState(null);
  const [bill2, setBill2] = useState(null);
  
  const [diffResult, setDiffResult] = useState({ lines: [], stats: { additions: 0, removals: 0, unchanged: 0 } });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'unified'
  const [allBills, setAllBills] = useState([]);

  // Auto-detect mobile to default to unified view
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setViewMode('unified');
    }
    
    // Fetch locally tracked bills for the selector dropdowns
    fetch('/api/bills?source=local')
      .then(res => res.json())
      .then(data => {
        if (data.bills) setAllBills(data.bills);
      })
      .catch(err => console.error('Failed to load tracked bills:', err));
  }, []);

  // Fetch logic for standard text payloads
  useEffect(() => {
    if (!queryId1 || !queryId2) return;
    
    const fetchCompareData = async () => {
      setLoading(true);
      setError(null);
      setBill1(null);
      setBill2(null);

      try {
        const [res1, res2] = await Promise.all([
          fetch(`/api/bills/${queryId1}`),
          fetch(`/api/bills/${queryId2}`)
        ]);

        const data1 = await res1.json();
        const data2 = await res2.json();

        if (data1.error) throw new Error(`Bill 1: ${data1.error}`);
        if (data2.error) throw new Error(`Bill 2: ${data2.error}`);

        setBill1(data1);
        setBill2(data2);

        // Get the latest text payload from each bill
        const text1 = data1.versions?.[0]?.text || '';
        const text2 = data2.versions?.[0]?.text || '';

        if (!text1 && !text2) {
          setError('Neither bill has extractable text loaded in the system.');
        } else {
          // Compute the structural diff array
          const computed = computeDiff(text1, text2);
          setDiffResult(computed);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompareData();
  }, [queryId1, queryId2]);

  const handleCompareSubmit = (e) => {
    e.preventDefault();
    if (id1 && id2) {
      router.push(`/compare?id1=${encodeURIComponent(id1)}&id2=${encodeURIComponent(id2)}`);
    }
  };

  return (
    <div className="page-container fade-in" style={{ maxWidth: '1600px' }}>
      <header className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span aria-hidden="true">⚖️</span> Cross-Bill Comparison
            </h1>
            <p className="page-description">Analyze textual differences between two pieces of legislation side-by-side.</p>
          </div>
          
          {(bill1 && bill2) && (
            <div className="view-toggles" style={{ display: 'flex', backgroundColor: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              <button 
                className={`btn btn-sm ${viewMode === 'split' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('split')}
                style={{ margin: 0 }}
              >
                Split View
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'unified' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('unified')}
                style={{ margin: 0 }}
              >
                Unified View
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Selector Interface */}
      <form onSubmit={handleCompareSubmit} className="card form-grid-3" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', position: 'relative', zIndex: 10 }}>
        <BillSelector 
          label="Base Bill (Left Column)" 
          bills={allBills} 
          selectedId={id1} 
          onChange={(val) => setId1(val)} 
        />
        <BillSelector 
          label="Target Bill (Right Column)" 
          bills={allBills} 
          selectedId={id2} 
          onChange={(val) => setId2(val)} 
        />
        <div>
          <button type="submit" className="btn btn-primary" disabled={loading || !id1 || !id2}>
            {loading ? 'Analyzing...' : 'Compare Views'}
          </button>
        </div>
      </form>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
          {error}
        </div>
      )}

      {/* Diff Mapping Output */}
      {(!loading && bill1 && bill2) && (
        <div className="diff-container card" style={{ padding: 0, overflow: 'hidden' }}>
          
          {/* Header row summarizing stats */}
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
              <div>
                <strong style={{ display: 'block' }}>Base Version</strong>
                <Link href={`/bills/${bill1.bill.id}`} className="badge badge-info">{bill1.bill.number}</Link>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-muted)' }}>→</div>
              <div>
                <strong style={{ display: 'block' }}>Compared To</strong>
                <Link href={`/bills/${bill2.bill.id}`} className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--text-muted)' }}>{bill2.bill.number}</Link>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'rgb(21, 128, 61)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                +{diffResult.stats?.additions || 0} Additions
              </span>
              <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(185, 28, 28)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                -{diffResult.stats?.removals || 0} Redactions
              </span>
            </div>
          </div>

          <div className="diff-editor" style={{ 
            fontFamily: 'Consolas, Monaco, "Courier New", monospace', 
            fontSize: '14px',
            lineHeight: 1.6,
            backgroundColor: 'var(--bg-primary)',
            overflowX: 'auto',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            {/* Split View Map */}
            {viewMode === 'split' ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '50px' }} />
                  <col style={{ width: 'calc(50% - 50px)' }} />
                  <col style={{ width: '50px' }} />
                  <col style={{ width: 'calc(50% - 50px)' }} />
                </colgroup>
                <tbody>
                  {diffResult.lines?.map((line, idx) => {
                    // Split view aligns lines by synthesizing an empty block on the opposing side
                    if (line.type === 'unchanged') {
                      return (
                        <tr key={idx} className="diff-row unchanged">
                          <td style={{ textAlign: 'right', padding: '0 8px', color: 'var(--text-muted)', userSelect: 'none', borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-tertiary)' }}>{line.oldLineNumber}</td>
                          <td style={{ padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{line.content}</td>
                          <td style={{ textAlign: 'right', padding: '0 8px', color: 'var(--text-muted)', userSelect: 'none', borderRight: '1px solid var(--border-primary)', borderLeft: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-tertiary)' }}>{line.newLineNumber}</td>
                          <td style={{ padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{line.content}</td>
                        </tr>
                      );
                    } else if (line.type === 'removed') {
                      return (
                        <tr key={idx} className="diff-row removed" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                          <td style={{ textAlign: 'right', padding: '0 8px', color: 'rgba(239, 68, 68, 0.5)', userSelect: 'none', borderRight: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>{line.oldLineNumber}</td>
                          <td style={{ padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'rgb(153, 27, 27)' }}>-{line.content}</td>
                          <td style={{ textAlign: 'right', padding: '0 8px', borderRight: '1px solid var(--border-primary)', borderLeft: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-tertiary)' }}></td>
                          <td style={{ padding: '0 8px', backgroundColor: 'var(--bg-tertiary)' }}></td>
                        </tr>
                      );
                    } else if (line.type === 'added') {
                      return (
                        <tr key={idx} className="diff-row added" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)' }}>
                          <td style={{ textAlign: 'right', padding: '0 8px', borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-tertiary)' }}></td>
                          <td style={{ padding: '0 8px', backgroundColor: 'var(--bg-tertiary)' }}></td>
                          <td style={{ textAlign: 'right', padding: '0 8px', color: 'rgba(34, 197, 94, 0.5)', userSelect: 'none', borderRight: '1px solid rgba(34, 197, 94, 0.2)', borderLeft: '1px solid var(--border-primary)', backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>{line.newLineNumber}</td>
                          <td style={{ padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'rgb(22, 101, 52)' }}>+{line.content}</td>
                        </tr>
                      );
                    }
                    return null;
                  })}
                </tbody>
              </table>
            ) : (
              /* Unified View Map */
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                 <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: 'calc(100% - 80px)' }} />
                </colgroup>
                <tbody>
                  {diffResult.lines?.map((line, idx) => {
                    let bg = 'transparent';
                    let fg = 'inherit';
                    let prefix = ' ';
                    
                    if (line.type === 'added') {
                      bg = 'rgba(34, 197, 94, 0.08)';
                      fg = 'rgb(22, 101, 52)';
                      prefix = '+';
                    } else if (line.type === 'removed') {
                      bg = 'rgba(239, 68, 68, 0.08)';
                      fg = 'rgb(153, 27, 27)';
                      prefix = '-';
                    }
                    
                    return (
                      <tr key={idx} style={{ backgroundColor: bg, color: fg }}>
                        <td style={{ textAlign: 'right', padding: '0 4px', fontSize: '12px', userSelect: 'none', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)' }}>
                          {line.type !== 'added' ? line.oldLineNumber : ''}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0 4px', fontSize: '12px', userSelect: 'none', color: 'var(--text-muted)', borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-tertiary)' }}>
                          {line.type !== 'removed' ? line.newLineNumber : ''}
                        </td>
                        <td style={{ padding: '0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'flex' }}>
                          <span style={{ userSelect: 'none', width: '20px', display: 'inline-block', color: 'var(--text-muted)' }}>{prefix}</span>
                          <span style={line.type === 'removed' ? { textDecoration: 'line-through' } : {}}>{line.content}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {!loading && !bill1 && !bill2 && (!queryId1 || !queryId2) && (
        <div className="empty-state card" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state-icon" style={{ fontSize: 48 }} aria-hidden="true">⚖️</div>
          <h3>Differential Engine</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto' }}>Select two bills from the dropdowns above to analyze their textual similarities and differences. Useful for mapping companion bills or examining sequential revisions.</p>
        </div>
      )}

    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="page-container"><div className="loading-spinner"></div> Loading comparison engine...</div>}>
      <CompareContent />
    </Suspense>
  );
}
