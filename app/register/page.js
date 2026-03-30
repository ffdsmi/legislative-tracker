'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, workspaceName })
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
      <div style={{ backgroundColor: 'var(--bg-panel)', padding: '2rem', borderRadius: '8px', border: '1px solid var(--border)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Create Account</h1>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Full Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Workspace / Team Name</label>
            <input 
              type="text" 
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Policy Team"
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              backgroundColor: 'var(--accent)', 
              color: 'var(--bg-main)', 
              border: 'none', 
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
