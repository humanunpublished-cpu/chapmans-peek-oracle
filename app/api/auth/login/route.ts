'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootSequence, setBootSequence] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setBootSequence(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      setError('Connection failed');
      setLoading(false);
    }
  };

  if (bootSequence) {
    return (
      <div style={styles.bootScreen}>
        <div style={styles.bootLogo}>CHAPMAN&apos;S PEEK</div>
        <div style={styles.bootSubtitle}>THE ORACLE</div>
        <div style={styles.bootSequence}>
          <div style={styles.bootLine}>Initializing secure connection...</div>
          <div style={styles.bootLine}>Loading market feeds...</div>
          <div style={styles.bootLine}>Activating anomaly detection...</div>
          <div style={styles.bootLine}>System ready.</div>
        </div>
        <div style={styles.bootLoader} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <h1 style={styles.logo}>CHAPMAN&apos;S PEEK</h1>
          <div style={styles.subtitle}>THE ORACLE</div>
          <div style={styles.tagline}>Real-Time Financial Intelligence Terminal</div>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="operator@chapmans.co.za"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>ACCESS CODE</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE TERMINAL'}
          </button>
        </form>

        <div style={styles.footer}>
          <div style={styles.footerText}>Powered by Security360</div>
          <div style={styles.footerText}>© 2025 Chapman&apos;s Capital</div>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)',
    padding: '20px',
  },
  loginBox: {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(15, 17, 23, 0.95)',
    borderRadius: '16px',
    padding: '40px',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    boxShadow: '0 0 60px rgba(0, 255, 136, 0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '28px',
    fontWeight: 800,
    color: '#00ff88',
    letterSpacing: '3px',
    marginBottom: '8px',
  },
  subtitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '12px',
    color: '#00d4ff',
    letterSpacing: '6px',
    marginBottom: '16px',
  },
  tagline: {
    fontSize: '12px',
    color: '#8892a0',
    letterSpacing: '1px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#8892a0',
    letterSpacing: '2px',
  },
  input: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '14px 16px',
    fontSize: '14px',
    color: '#e0e6ed',
    fontFamily: "'JetBrains Mono', monospace",
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  error: {
    background: 'rgba(255, 59, 92, 0.1)',
    border: '1px solid rgba(255, 59, 92, 0.3)',
    borderRadius: '8px',
    padding: '12px',
    color: '#ff3b5c',
    fontSize: '12px',
    textAlign: 'center',
  },
  button: {
    background: 'linear-gradient(135deg, #00ff88 0%, #00d4ff 100%)',
    border: 'none',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#0a0a0f',
    letterSpacing: '2px',
    cursor: 'pointer',
    fontFamily: "'Orbitron', sans-serif",
    marginTop: '16px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '10px',
    color: '#4a5568',
    marginBottom: '4px',
  },
  bootScreen: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
  },
  bootLogo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '32px',
    fontWeight: 800,
    color: '#00ff88',
    letterSpacing: '4px',
    marginBottom: '8px',
  },
  bootSubtitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '14px',
    color: '#00d4ff',
    letterSpacing: '8px',
    marginBottom: '40px',
  },
  bootSequence: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '32px',
  },
  bootLine: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    color: '#00ff88',
    opacity: 0.8,
  },
  bootLoader: {
    width: '200px',
    height: '2px',
    background: 'rgba(0, 255, 136, 0.2)',
    borderRadius: '2px',
    overflow: 'hidden',
    position: 'relative',
  },
};
