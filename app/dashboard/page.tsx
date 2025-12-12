'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const WorldHeatmap = dynamic(() => import('@/components/WorldHeatmap'), { ssr: false });

// --- TYPES ---
interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  lastUpdate: number;
}

interface Anomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  ticker: string;
  timestamp: number;
  score: number;
}

interface OSINTItem {
  id: string;
  title: string;
  source: string;
  threatScore: number;
  category: string;
  sentiment: string;
  publishedAt: string;
  tickers: string[];
}

type TabType = 'live' | 'map' | 'anomaly' | 'osint' | 'prophet';

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const router = useRouter();
  
  // -- UI State --
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // -- Data State --
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyCount, setAnomalyCount] = useState(0);
  const [osintData, setOsintData] = useState<OSINTItem[]>([]);
  
  // -- Refs --
  const binanceWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Clock & Mobile Check
  useEffect(() => {
    // Clock
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Responsive Handler
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false); // Default closed on mobile
      else setIsSidebarOpen(true); // Default open on desktop
    };
    
    // Run once on mount
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 2. WebSocket Connection (CRITICAL FIXES APPLIED HERE)
  const connectBinanceWS = useCallback(() => {
    if (binanceWsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker/ethusdt@ticker');
    
    ws.onopen = () => {
      console.log('Binance WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // --- FIX: STOP THE CRASH ---
        // Binance sends events that are NOT tickers (like subscriptions).
        // If data.s (symbol) is missing, ignore this message.
        if (!data || !data.s) return;
        // ---------------------------

        const symbol = data.s; 
        
        const marketInfo: MarketData = {
          symbol,
          name: symbol === 'BTCUSDT' ? 'Bitcoin' : 'Ethereum',
          price: parseFloat(data.c),
          change: parseFloat(data.p),
          changePercent: parseFloat(data.P),
          volume: parseFloat(data.v),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          lastUpdate: Date.now(),
        };

        setMarketData(prev => ({ ...prev, [symbol]: marketInfo }));
        
        // Update history for anomaly detection
        setPriceHistory(prev => {
          const history = prev[symbol] || [];
          // Keep last 100 points
          const newHistory = [...history, marketInfo.price].slice(-100);
          return { ...prev, [symbol]: newHistory };
        });

      } catch (e) {
        console.error('Error parsing Binance data:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('Binance WebSocket closed, reconnecting...');
      reconnectTimeoutRef.current = setTimeout(connectBinanceWS, 3000);
    };

    binanceWsRef.current = ws;
  }, []);

  // 3. Data Fetching (OSINT & Anomaly)
  const fetchOSINT = useCallback(async () => {
    try {
      const response = await fetch('/api/osint');
      if (response.ok) {
        const data = await response.json();
        setOsintData(data.articles || []);
      }
    } catch (error) {
      console.error('OSINT fetch error:', error);
    }
  }, []);

  const runAnomalyDetection = useCallback(async () => {
    // Only run if we have enough history
    for (const [symbol, data] of Object.entries(marketData)) {
      const history = priceHistory[symbol];
      if (!history || history.length < 20) continue;

      try {
        const response = await fetch('/api/anomaly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: symbol,
            currentData: { price: data.price, volume: data.volume },
            historicalData: history.map((price, i) => ({
              price,
              volume: data.volume * (0.8 + Math.random() * 0.4), // Simulated historical volume
              timestamp: Date.now() - (history.length - i) * 60000,
            })),
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.anomalies?.length > 0) {
            setAnomalies(prev => {
              const newAnomalies = result.anomalies.map((a: any) => ({
                ...a,
                id: `${symbol}-${a.type}-${Date.now()}`,
              }));
              // Keep most recent 50
              return [...newAnomalies, ...prev].slice(0, 50);
            });
            setAnomalyCount(prev => prev + result.anomalies.length);
          }
        }
      } catch (error) {
        console.error('Anomaly detection error:', error);
      }
    }
  }, [marketData, priceHistory]);

  // 4. Initialize Intervals
  useEffect(() => {
    connectBinanceWS();
    fetchOSINT();

    const osintInterval = setInterval(fetchOSINT, 300000); // 5 minutes
    const anomalyInterval = setInterval(runAnomalyDetection, 30000); // 30 seconds

    return () => {
      binanceWsRef.current?.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(osintInterval);
      clearInterval(anomalyInterval);
    };
  }, [connectBinanceWS, fetchOSINT, runAnomalyDetection]);

  // 5. Helpers
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const formatPrice = (price: number, symbol: string | undefined) => {
    // FIX: Guard against undefined symbols
    if (!symbol) return '---';

    if (symbol.includes('ZAR') || symbol === 'USDZAR') {
      return `R ${price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
    }
    const digits = price > 1000 ? 0 : 2;
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: digits })}`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ff3b5c';
      case 'high': return '#ff6b35';
      case 'medium': return '#ffd700';
      case 'low': return '#00d4ff';
      default: return '#8892a0';
    }
  };

  // --- RENDER ---
  return (
    <div style={{
      ...styles.container,
      // Dynamic grid handles the sidebar collapsing/overlay
      gridTemplateColumns: isMobile 
        ? '1fr' 
        : isSidebarOpen ? '260px 1fr' : '0px 1fr',
    }}>
      
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          {/* Hamburger Menu Toggle */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            style={styles.menuBtn}
            aria-label="Toggle Menu"
          >
            {isSidebarOpen ? '✕' : '☰'}
          </button>
          
          <h1 style={styles.logo}>CHAPMAN'S PEEK</h1>
          {!isMobile && <span style={styles.subtitle}>THE ORACLE</span>}
        </div>
        
        {!isMobile && (
          <div style={styles.headerCenter}>
            <div style={styles.liveIndicator}>
              <span style={styles.liveDot} />
              LIVE
            </div>
          </div>
        )}

        <div style={styles.headerRight}>
          <div style={styles.clock}>
            {currentTime.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })}
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            LOGOUT
          </button>
        </div>
      </header>

      {/* SIDEBAR */}
      <nav style={{
        ...styles.sidebar,
        // Mobile Logic: Sidebar becomes a full-width overlay when open
        width: isSidebarOpen ? (isMobile ? '100vw' : '100%') : '0',
        padding: isSidebarOpen ? '20px 0' : '0',
        opacity: isSidebarOpen ? 1 : 0,
        position: isMobile && isSidebarOpen ? 'absolute' : 'relative',
        top: isMobile ? '70px' : 'auto',
        bottom: 0,
        zIndex: 100,
        height: isMobile ? 'calc(100vh - 70px)' : 'auto',
      }}>
        <div style={styles.sidebarSection}>
          <div style={styles.sidebarLabel}>TERMINAL</div>
          {[
            { id: 'live', label: 'Live Markets', icon: '📈' },
            { id: 'map', label: 'Global Map', icon: '🌍' },
            { id: 'anomaly', label: 'Anomaly Detection', icon: '⚠️', count: anomalyCount },
            { id: 'osint', label: 'OSINT Feed', icon: '🔍' },
            { id: 'prophet', label: '48h Prophet', icon: '🔮' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as TabType);
                if (isMobile) setIsSidebarOpen(false); // Close menu on selection on mobile
              }}
              style={{
                ...styles.sidebarItem,
                ...(activeTab === item.id ? styles.sidebarItemActive : {}),
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span style={styles.badge}>{item.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main style={styles.main}>
        
        {/* TAB: Live Markets */}
        {activeTab === 'live' && (
          <div style={styles.tabContent}>
            <h2 style={styles.tabTitle}>REAL-TIME MARKET DATA</h2>
            <div style={styles.cardGrid}>
              {Object.entries(marketData).map(([symbol, data]) => (
                <div key={symbol} style={styles.priceCard}>
                  <div style={styles.priceCardHeader}>
                    <span style={styles.priceCardSymbol}>{data.name}</span>
                    <span style={styles.priceCardTicker}>{symbol}</span>
                  </div>
                  <div style={styles.priceCardPrice}>
                    {formatPrice(data.price, symbol)}
                  </div>
                  <div style={{
                    ...styles.priceCardChange,
                    color: data.changePercent >= 0 ? '#00ff88' : '#ff3b5c',
                  }}>
                    {data.changePercent >= 0 ? '▲' : '▼'} {Math.abs(data.changePercent).toFixed(2)}%
                  </div>
                  <div style={styles.priceCardMeta}>
                    <span>H: {formatPrice(data.high24h, symbol)}</span>
                    <span>L: {formatPrice(data.low24h, symbol)}</span>
                  </div>
                  <div style={styles.priceCardVolume}>
                    Vol: {(data.volume / 1000).toFixed(2)}K
                  </div>
                </div>
              ))}
              
              {Object.keys(marketData).length === 0 && (
                <div style={styles.emptyState}>
                  <div style={styles.loadingText}>Initializing Feed...</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Global Map */}
        {activeTab === 'map' && (
          <div style={styles.tabContent}>
            <h2 style={styles.tabTitle}>GLOBAL MARKET HEATMAP</h2>
            <WorldHeatmap osintData={osintData} />
          </div>
        )}

        {/* TAB: Anomaly */}
        {activeTab === 'anomaly' && (
          <div style={styles.tabContent}>
            <h2 style={styles.tabTitle}>ANOMALY DETECTION ENGINE</h2>
            <div style={styles.anomalyHeader}>
              <div style={styles.anomalyStats}>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{anomalies.length}</div>
                  <div style={styles.statLabel}>Alerts</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statValue, color: '#ff3b5c' }}>
                    {anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length}
                  </div>
                  <div style={styles.statLabel}>Critical</div>
                </div>
              </div>
            </div>
            
            <div style={styles.anomalyList}>
              {anomalies.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🔍</div>
                  <div style={styles.emptyText}>Scanning for anomalies...</div>
                </div>
              ) : (
                anomalies.map((anomaly) => (
                  <div key={anomaly.id} style={{
                    ...styles.anomalyItem,
                    borderLeftColor: getSeverityColor(anomaly.severity),
                  }}>
                    <div style={styles.anomalyItemHeader}>
                      <span style={{
                        ...styles.severityBadge,
                        background: getSeverityColor(anomaly.severity) + '20',
                        color: getSeverityColor(anomaly.severity),
                        borderColor: getSeverityColor(anomaly.severity),
                      }}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      <span style={styles.anomalyTicker}>{anomaly.ticker}</span>
                    </div>
                    <div style={styles.anomalyMessage}>{anomaly.message}</div>
                    <div style={styles.anomalyTime}>
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: OSINT */}
        {activeTab === 'osint' && (
          <div style={styles.tabContent}>
            <h2 style={styles.tabTitle}>OSINT INTELLIGENCE FEED</h2>
            <div style={styles.osintList}>
              {osintData.map((item) => (
                <div key={item.id} style={{
                  ...styles.osintItem,
                  borderLeftColor: item.threatScore > 70 ? '#ff3b5c' : item.threatScore > 40 ? '#ffd700' : '#00ff88',
                }}>
                  <div style={styles.osintHeader}>
                    <span style={styles.osintCategory}>{item.category}</span>
                    <span style={{
                      ...styles.threatScore,
                      color: item.threatScore > 70 ? '#ff3b5c' : item.threatScore > 40 ? '#ffd700' : '#00ff88',
                    }}>
                      THREAT: {item.threatScore}
                    </span>
                  </div>
                  <h3 style={styles.osintTitle}>{item.title}</h3>
                  <div style={styles.osintMeta}>
                    <span>{item.source}</span>
                    <span>•</span>
                    <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Prophet */}
        {activeTab === 'prophet' && (
          <div style={styles.tabContent}>
            <h2 style={styles.tabTitle}>48-HOUR PROPHET FORECAST</h2>
            <div style={styles.prophetContainer}>
              <div style={styles.comingSoon}>
                <div style={styles.comingSoonIcon}>🔮</div>
                <div style={styles.comingSoonText}>ARIMA Forecasting Engine</div>
                <div style={styles.comingSoonSubtext}>Connecting Alpha Vantage API...</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <span>© 2025 Chapman's</span>
        <span style={styles.footerDot}>•</span>
        <span>Security360</span>
      </footer>
    </div>
  );
}

// --- STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateRows: '70px 1fr 40px',
    gridTemplateAreas: `
      "header header"
      "sidebar main"
      "footer footer"
    `,
    transition: 'grid-template-columns 0.3s ease',
    overflow: 'hidden',
  },
  header: {
    gridArea: 'header',
    background: 'rgba(15, 17, 23, 0.98)',
    borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    backdropFilter: 'blur(10px)',
    zIndex: 101,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  menuBtn: {
    background: 'transparent',
    border: 'none',
    color: '#00ff88',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    marginRight: '8px',
  },
  logo: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '22px',
    fontWeight: 800,
    color: '#00ff88',
    letterSpacing: '2px',
    margin: 0,
  },
  subtitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '10px',
    color: '#00d4ff',
    letterSpacing: '4px',
    marginTop: '4px',
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
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
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  clock: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '14px',
    fontWeight: 600,
    color: '#00ff88',
    background: 'rgba(0, 255, 136, 0.1)',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(0, 255, 136, 0.3)',
  },
  logoutBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    fontWeight: 600,
    color: '#ff3b5c',
    background: 'transparent',
    border: '1px solid rgba(255, 59, 92, 0.3)',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  sidebar: {
    gridArea: 'sidebar',
    background: 'rgba(15, 17, 23, 0.98)',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    overflowY: 'auto',
    overflowX: 'hidden',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  },
  sidebarSection: {
    marginBottom: '24px',
  },
  sidebarLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#4a5568',
    letterSpacing: '2px',
    padding: '0 20px',
    marginBottom: '12px',
  },
  sidebarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 20px',
    background: 'transparent',
    border: 'none',
    color: '#8892a0',
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', monospace",
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  sidebarItemActive: {
    background: 'rgba(0, 255, 136, 0.1)',
    color: '#00ff88',
    borderLeft: '3px solid #00ff88',
  },
  badge: {
    marginLeft: 'auto',
    background: '#ff3b5c',
    color: 'white',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
  },
  main: {
    gridArea: 'main',
    padding: '24px',
    overflowY: 'auto',
    background: 'rgba(10, 10, 15, 0.5)',
  },
  tabContent: {
    animation: 'slideIn 0.3s ease',
  },
  tabTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '16px',
    fontWeight: 600,
    color: '#00d4ff',
    letterSpacing: '3px',
    marginBottom: '24px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  priceCard: {
    background: 'rgba(20, 25, 35, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '24px',
    transition: 'all 0.3s ease',
  },
  priceCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  priceCardSymbol: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e6ed',
  },
  priceCardTicker: {
    fontSize: '12px',
    color: '#8892a0',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  priceCardPrice: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#00d4ff',
    marginBottom: '8px',
  },
  priceCardChange: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  priceCardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#8892a0',
    marginBottom: '8px',
  },
  priceCardVolume: {
    fontSize: '11px',
    color: '#4a5568',
  },
  anomalyHeader: {
    marginBottom: '24px',
  },
  anomalyStats: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  statBox: {
    background: 'rgba(20, 25, 35, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '20px 24px',
    textAlign: 'center',
    minWidth: '140px',
    flex: '1 1 auto',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#00ff88',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#8892a0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  anomalyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  anomalyItem: {
    background: 'rgba(20, 25, 35, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderLeft: '4px solid',
    borderRadius: '8px',
    padding: '16px 20px',
  },
  anomalyItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  severityBadge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid',
    letterSpacing: '0.5px',
  },
  anomalyTicker: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#00d4ff',
  },
  anomalyMessage: {
    fontSize: '13px',
    color: '#e0e6ed',
    lineHeight: 1.5,
    marginBottom: '8px',
  },
  anomalyTime: {
    fontSize: '11px',
    color: '#4a5568',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#8892a0',
    marginBottom: '8px',
  },
  loadingText: {
    color: '#4a5568',
    fontSize: '13px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  osintList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  osintItem: {
    background: 'rgba(20, 25, 35, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderLeft: '4px solid',
    borderRadius: '8px',
    padding: '16px 20px',
  },
  osintHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  osintCategory: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#00d4ff',
    background: 'rgba(0, 212, 255, 0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  threatScore: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1px',
  },
  osintTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#e0e6ed',
    lineHeight: 1.4,
    marginBottom: '12px',
  },
  osintMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: '#8892a0',
    flexWrap: 'wrap',
  },
  prophetContainer: {
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoon: {
    textAlign: 'center',
    padding: '40px',
  },
  comingSoonIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  comingSoonText: {
    fontSize: '18px',
    color: '#8892a0',
    marginBottom: '8px',
  },
  comingSoonSubtext: {
    fontSize: '13px',
    color: '#4a5568',
  },
  footer: {
    gridArea: 'footer',
    background: 'rgba(15, 17, 23, 0.98)',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    fontSize: '11px',
    color: '#4a5568',
  },
  footerDot: {
    color: '#00ff88',
  },
};