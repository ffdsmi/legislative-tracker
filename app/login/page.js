'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        router.push('/');
        router.refresh(); // Force reload server components with new auth context
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
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
        <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Login to Tracker</h1>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Password</label>
            <input 
              type="password" 
              required
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
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--accent)' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
}
