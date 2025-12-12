'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [bootSequence, setBootSequence] = useState(true);
  const [bootLines, setBootLines] = useState<string[]>([]);

  const bootMessages = [
    '> INITIALIZING ORACLE TERMINAL v9.0...',
    '> ESTABLISHING SECURE CONNECTION...',
    '> LOADING ANOMALY DETECTION ENGINES...',
    '> Z-SCORE MODULE: ONLINE',
    '> MAHALANOBIS DISTANCE: ONLINE',
    '> LOCAL OUTLIER FACTOR: ONLINE',
    '> CONNECTING TO MARKET FEEDS...',
    '> BINANCE WSS: CONNECTED',
    '> FINNHUB STREAM: CONNECTED',
    '> OSINT PIPELINE: ACTIVE',
    '> SYSTEM READY.',
    '',
    '> AWAITING AUTHENTICATION...',
  ];

  useEffect(() => {
    if (bootSequence) {
      let index = 0;
      const interval = setInterval(() => {
        if (index < bootMessages.length) {
          setBootLines(prev => [...prev, bootMessages[index]]);
          index++;
        } else {
          clearInterval(interval);
          setTimeout(() => setBootSequence(false), 800);
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [bootSequence]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowInvite(false);
        setError('');
        // Auto-login after registration
        router.push('/dashboard');
      } else {
        setError(data.error || 'Invalid invite code');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (bootSequence) {
    return (
      <div style={styles.bootContainer}>
        <div style={styles.bootScreen}>
          <div style={styles.bootLogo}>CHAPMAN'S PEEK</div>
          <div style={styles.bootSubtitle}>THE ORACLE</div>
          <div style={styles.bootTerminal}>
            {bootLines.map((line, i) => (
              <div 
                key={i} 
                style={{
                  ...styles.bootLine,
                  color: line.includes('ONLINE') || line.includes('CONNECTED') || line.includes('ACTIVE') || line.includes('READY') 
                    ? '#00ff88' 
                    : line.includes('AWAITING') 
                      ? '#ffd700' 
                      : '#00d4ff',
                }}
              >
                {line}
              </div>
            ))}
            <span style={styles.cursor}>_</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Animated Background Grid */}
      <div style={styles.gridOverlay} />
      
      {/* Main Content */}
      <div style={styles.loginWrapper}>
        {/* Logo Section */}
        <div style={styles.logoSection}>
          <h1 style={styles.logo}>CHAPMAN'S PEEK</h1>
          <div style={styles.subtitle}>THE ORACLE</div>
          <div style={styles.tagline}>
            Real-Time Intelligence • Anomaly Detection • OSINT
          </div>
        </div>

        {/* Login Form */}
        <div style={styles.formCard}>
          <div style={styles.cardHeader}>
            <span style={styles.liveIndicator}>
              <span style={styles.liveDot} />
              SECURE TERMINAL
            </span>
          </div>

          {!showInvite ? (
            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@chapmans.co.za"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={styles.input}
                  required
                />
              </div>

              {error && <div style={styles.error}>{error}</div>}

              <button 
                type="submit" 
                style={styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span style={styles.loading}>AUTHENTICATING...</span>
                ) : (
                  'ENTER TERMINAL'
                )}
              </button>

              <div style={styles.divider}>
                <span style={styles.dividerLine} />
                <span style={styles.dividerText}>OR</span>
                <span style={styles.dividerLine} />
              </div>

              <button 
                type="button"
                onClick={() => setShowInvite(true)}
                style={styles.inviteBtn}
              >
                HAVE AN INVITE CODE?
              </button>
            </form>
          ) : (
            <form onSubmit={handleInviteSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>INVITE CODE</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>CREATE PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  style={styles.input}
                  required
                  minLength={8}
                />
              </div>

              {error && <div style={styles.error}>{error}</div>}

              <button 
                type="submit" 
                style={styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading ? 'REGISTERING...' : 'ACTIVATE ACCESS'}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setShowInvite(false);
                  setError('');
                }}
                style={styles.backBtn}
              >
                ← BACK TO LOGIN
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <div style={styles.footerText}>
            © 2025 Chapman's Capital • Institutional Intelligence
          </div>
          <div style={styles.footerLinks}>
            <span>Invite Only Access</span>
            <span style={styles.footerDot}>•</span>
            <span>Powered by Security360</span>
          </div>
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
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(0, 255, 136, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 255, 136, 0.02) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
    pointerEvents: 'none',
  },
  loginWrapper: {
    width: '100%',
    maxWidth: '420px',
    zIndex: 10,
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '32px',
    fontWeight: 800,
    color: '#00ff88',
    letterSpacing: '4px',
    marginBottom: '8px',
    textShadow: '0 0 30px rgba(0, 255, 136, 0.5)',
  },
  subtitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    color: '#00d4ff',
    letterSpacing: '8px',
    marginBottom: '16px',
  },
  tagline: {
    fontSize: '11px',
    color: '#8892a0',
    letterSpacing: '2px',
  },
  formCard: {
    background: 'rgba(15, 20, 30, 0.95)',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: '16px',
    padding: '32px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 0 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '28px',
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#00ff88',
    letterSpacing: '2px',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    background: '#00ff88',
    borderRadius: '50%',
    animation: 'pulse 1.5s ease-in-out infinite',
    boxShadow: '0 0 10px #00ff88',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#8892a0',
    letterSpacing: '2px',
  },
  input: {
    fontFamily: "'JetBrains Mono', monospace",
    background: 'rgba(10, 10, 15, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '14px 16px',
    color: '#e0e6ed',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  error: {
    background: 'rgba(255, 59, 92, 0.1)',
    border: '1px solid rgba(255, 59, 92, 0.3)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#ff3b5c',
    fontSize: '12px',
    textAlign: 'center',
  },
  submitBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    background: '#00ff88',
    border: 'none',
    borderRadius: '8px',
    padding: '16px',
    color: '#0a0a0f',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px',
  },
  loading: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '8px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: '11px',
    color: '#4a5568',
    letterSpacing: '2px',
  },
  inviteBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    background: 'transparent',
    border: '1px solid rgba(0, 212, 255, 0.3)',
    borderRadius: '8px',
    padding: '14px',
    color: '#00d4ff',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  backBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    background: 'transparent',
    border: 'none',
    padding: '12px',
    color: '#8892a0',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  footer: {
    textAlign: 'center',
    marginTop: '32px',
  },
  footerText: {
    fontSize: '11px',
    color: '#4a5568',
    marginBottom: '8px',
  },
  footerLinks: {
    fontSize: '10px',
    color: '#4a5568',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
  },
  footerDot: {
    color: '#00ff88',
  },
  // Boot sequence styles
  bootContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0f',
  },
  bootScreen: {
    textAlign: 'center',
    padding: '40px',
  },
  bootLogo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '36px',
    fontWeight: 800,
    color: '#00ff88',
    letterSpacing: '6px',
    marginBottom: '8px',
    textShadow: '0 0 30px rgba(0, 255, 136, 0.5)',
  },
  bootSubtitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '16px',
    color: '#00d4ff',
    letterSpacing: '10px',
    marginBottom: '40px',
  },
  bootTerminal: {
    textAlign: 'left',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    lineHeight: '1.8',
    maxWidth: '500px',
    margin: '0 auto',
  },
  bootLine: {
    animation: 'slideIn 0.1s ease',
  },
  cursor: {
    color: '#00ff88',
    animation: 'pulse 0.8s ease-in-out infinite',
  },
};
