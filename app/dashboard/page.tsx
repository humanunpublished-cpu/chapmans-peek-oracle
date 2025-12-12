'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const WorldHeatmap = dynamic(() => import('@/components/WorldHeatmap'), { ssr: false });

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

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('live');
  // Removed user state for now as it wasn't used in render
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // UI State for Mobile/Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
   
  // Market data state
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
   
  // Anomaly state
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [anomalyCount, setAnomalyCount] = useState(0);
   
  // OSINT state
  const [osintData, setOsintData] = useState<OSINTItem[]>([]);
   
  // WebSocket refs
  const binanceWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clock update
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Responsive Check
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse sidebar on mobile, open on desktop
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize WebSocket connections
  const connectBinanceWS = useCallback(() => {
    if (binanceWsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker/ethusdt@ticker');
    
    ws.onopen = () => {
      console.log('Binance WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const symbol = data.s; // BTCUSDT or ETHUSDT
        
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
        
        // Update price history for anomaly detection
        setPriceHistory(prev => {
          const history = prev[symbol] || [];
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

  // Fetch OSINT data
  const fetchOSINT = useCallback(async () => {
    try {
      const response = await fetch('/api/osint');
      if (response.ok) {
        const data = await response