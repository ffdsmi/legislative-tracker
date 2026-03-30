'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      setCollections(data.collections || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      fetchCollections();
    } catch { /* ignore */ }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: editName.trim(), description: editDesc.trim() }),
      });
      setEditingId(null);
      fetchCollections();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this collection? Bills won\'t be deleted.')) return;
    try {
      await fetch(`/api/collections?id=${id}`, { method: 'DELETE' });
      fetchCollections();
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="page-header fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1><span aria-hidden="true">📁</span> Collections</h1>
            <p>Organize bills into custom folders</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ New Collection'}
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card fade-in" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="input-group">
            <label>Collection Name</label>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g., Education Reform Bills"
              autoFocus
            />
          </div>
          <div className="input-group">
            <label>Description (optional)</label>
            <input
              className="input"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Brief description..."
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>Create Collection</button>
        </form>
      )}

      {/* Edit Modal */}
      {mounted && editingId && createPortal(
        <div className="modal-overlay" onMouseDown={() => setEditingId(null)} role="presentation">
          <form className="modal" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onSubmit={handleEdit} role="dialog" aria-modal="true" aria-labelledby="edit-collection-title" style={{ position: 'relative' }}>
            <button 
              type="button" 
              onClick={() => setEditingId(null)} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }} 
              aria-label="Close modal"
            >
              ✕
            </button>
            <h2 id="edit-collection-title">Edit Collection</h2>
            <div className="input-group">
              <label>Name</label>
              <input className="input" value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
            </div>
            <div className="input-group">
              <label>Description</label>
              <input className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Collections Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      ) : collections.length > 0 ? (
        <div className="collections-grid fade-in">
          {collections.map(c => (
            <div key={c.id} className="collection-card">
              <Link href={`/collections/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3><span aria-hidden="true">📁</span> {c.name}</h3>
                {c.description && <p>{c.description}</p>}
                <div className="collection-card-meta">
                  <span><span aria-hidden="true">📜</span> {c.billCount || 0} bills</span>
                  <span>·</span>
                  <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(c.id);
                    setEditName(c.name);
                    setEditDesc(c.description);
                  }}
                >
                  <span aria-hidden="true">✏️</span> Edit
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  style={{ color: 'var(--color-oppose)' }}
                  aria-label={`Delete collection ${c.name}`}
                >
                  <span aria-hidden="true">🗑</span> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">📁</div>
            <h3>No collections yet</h3>
            <p>Create a collection to organize related bills together.</p>
          </div>
        </div>
      )}
    </>
  );
}
