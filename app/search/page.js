'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

function statusLabel(statusCode) {
  const map = {
    1: 'Introduced',
    2: 'Engrossed',
    3: 'Enrolled',
    4: 'Passed',
    5: 'Vetoed',
    6: 'Failed',
  };
  return map[statusCode] || `Status ${statusCode}`;
}

function DeepSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search/deep?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(query)}`);
    performSearch(query);
  };

  const highlightSnippet = (snippet, term) => {
    if (!term) return snippet;
    // Escape special regex chars
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const parts = snippet.split(regex);
    return parts.map((part, i) => 
      regex.test(part) 
        ? <mark key={i} style={{ background: 'var(--accent)', color: '#fff', padding: '0 4px', borderRadius: 'var(--radius-sm)' }}>{part}</mark> 
        : part
    );
  };

  return (
    <>
      <div className="page-header fade-in">
        <h1>Deep Text Search</h1>
        <p>Sweep through the complete text of all ingested documents to find specific language.</p>
      </div>

      <div className="card fade-in" style={{ marginBottom: 'var(--space-6)' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <span className="search-icon" aria-hidden="true">🔎</span>
            <input
              type="text"
              className="input"
              placeholder="Enter exact phrases, terminology, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Deep search query"
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
            {loading ? 'Sweeping...' : 'Sweep Documents'}
          </button>
        </form>
      </div>

      {!searched && !loading ? (
        <div className="empty-state fade-in" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state-icon" aria-hidden="true">🗄️</div>
          <h3>Ready to investigate</h3>
          <p>
            This engine crawls the actual multi-hundred-page legislative texts <br />
            stored in your database. Enter a query above to begin.
          </p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)', animation: 'pulse 1.5s infinite' }} aria-hidden="true">⚙️</div>
          <p style={{ color: 'var(--text-secondary)' }}>Executing Deep Text sweep across all documents...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="fade-in">
          <p style={{ marginBottom: 'var(--space-4)', color: 'var(--text-muted)' }}>
            Found <strong>{results.length}</strong> {results.length === 1 ? 'document' : 'documents'} containing exact text matches.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {results.map((result) => (
              <div key={result.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <span className="badge badge-info">{result.jurisdiction}</span>
                      <Link href={`/bills/${result.id}`} className="bill-number" style={{ fontSize: '1rem', fontWeight: 600 }}>
                        {result.number}
                      </Link>
                      <span className="badge badge-status" style={{ fontSize: '0.7rem' }}>{statusLabel(result.status)}</span>
                    </div>
                    <Link href={`/bills/${result.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{result.title}</h3>
                    </Link>
                  </div>
                  <Link href={`/bills/${result.id}`} className="btn btn-secondary btn-sm">
                    View Bill
                  </Link>
                </div>
                
                <div style={{ 
                  background: 'var(--bg-tertiary)', 
                  padding: 'var(--space-3)', 
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid var(--accent)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6
                }}>
                  {highlightSnippet(result.snippet, initialQuery)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state fade-in" style={{ padding: 'var(--space-8)' }}>
          <div className="empty-state-icon" aria-hidden="true">❌</div>
          <h3>No matches found</h3>
          <p>We swept all saved document texts but couldn't find any exact matches for &quot;{query}&quot;.</p>
        </div>
      )}
    </>
  );
}

export default function DeepSearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>Loading...</div>}>
      <DeepSearchContent />
    </Suspense>
  );
}
