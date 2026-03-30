'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fuse, setFuse] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  // Handle Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Fetch data on first open
  useEffect(() => {
    if (isOpen && !fuse && !loading) {
      setLoading(true);
      fetch('/api/search/index')
        .then((res) => res.json())
        .then((data) => {
          const fuseInstance = new Fuse(data, {
            keys: ['title', 'id', 'key1', 'badge'],
            threshold: 0.4,
            includeScore: true,
          });
          setFuse(fuseInstance);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
    
    if (isOpen && inputRef.current) {
      // Small timeout to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, fuse, loading]);

  useEffect(() => {
    if (!fuse) return;
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchResults = fuse.search(query).map(r => r.item).slice(0, 10);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [query, fuse]);

  const handleNavigate = (url) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  const onKeyDown = (e) => {
    // Results length + 1 (the final "Deep search" option)
    const totalItems = results.length + 1;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === results.length) {
        // Run deep search
        handleNavigate(`/search?q=${encodeURIComponent(query)}`);
      } else if (results[selectedIndex]) {
        handleNavigate(results[selectedIndex].url);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-modal-backdrop" onClick={() => setIsOpen(false)}>
      <div 
        className="search-modal fade-in-up" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Global Search"
      >
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search bills, regulations, or legislators..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search input"
          />
          {loading && <span className="search-spinner" aria-hidden="true">⏳</span>}
        </div>

        <div className="search-results">
          {results.length > 0 && (
            <div className="search-results-list" role="listbox">
              {results.map((item, index) => (
                <div 
                  key={item.id}
                  className={`search-result-item ${selectedIndex === index ? 'selected' : ''}`}
                  onClick={() => handleNavigate(item.url)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <div className="search-result-icon">
                    {item.type === 'Bill' ? '📄' : item.type === 'Regulation' ? '⚖️' : '👤'}
                  </div>
                  <div className="search-result-content">
                    <div className="search-result-title">{item.title}</div>
                    <div className="search-result-meta">
                      <span className={`badge badge-${item.type === 'Bill' ? 'info' : 'secondary'}`}>
                        {item.type}
                      </span>
                      <span>{item.badge}</span>
                      {item.type === 'Bill' && <span>{item.id}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.trim() && (
            <div 
              className={`search-deep-action ${selectedIndex === results.length ? 'selected' : ''}`}
              onClick={() => handleNavigate(`/search?q=${encodeURIComponent(query)}`)}
              onMouseEnter={() => setSelectedIndex(results.length)}
              role="option"
              aria-selected={selectedIndex === results.length}
            >
              <span className="search-result-icon">🔎</span>
              <div className="search-result-content">
                <span style={{ fontWeight: 600 }}>Deep Search inside documents</span>
                <span className="search-result-meta">Press Enter to search entire text for &quot;{query}&quot;</span>
              </div>
            </div>
          )}

          {!query.trim() && !loading && (
            <div className="search-empty-state">
              Start typing to search your workspace.
            </div>
          )}
          {query.trim() && results.length === 0 && !loading && (
            <div className="search-empty-state" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              No immediate matches. Try Deep Search below.
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .search-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 15vh;
        }
        .search-modal {
          background: var(--bg-surface);
          width: 90%;
          max-width: 650px;
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
        }
        .search-input-wrapper {
          display: flex;
          align-items: center;
          padding: 0 var(--space-4);
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-surface);
        }
        .search-icon, .search-spinner {
          font-size: 1.25rem;
          color: var(--text-muted);
          margin-right: var(--space-3);
        }
        .search-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: var(--text-lg);
          color: var(--text-primary);
          padding: var(--space-4) 0;
          outline: none;
        }
        .search-results {
          max-height: 50vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .search-empty-state {
          padding: var(--space-5);
          text-align: center;
          color: var(--text-muted);
          font-size: var(--text-sm);
        }
        .search-result-item, .search-deep-action {
          display: flex;
          align-items: center;
          padding: var(--space-3) var(--space-4);
          gap: var(--space-3);
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
          transition: background 0.1s ease;
        }
        .search-result-item:last-child, .search-deep-action {
          border-bottom: none;
        }
        .search-result-item.selected, .search-deep-action.selected {
          background: var(--bg-surface-hover);
        }
        .search-result-icon {
          font-size: 1.25rem;
          opacity: 0.8;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: var(--bg-background);
        }
        .search-result-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          overflow: hidden;
        }
        .search-result-title {
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .search-result-meta {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .fade-in-up {
          animation: fadeInUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
