'use client';

import { useEffect, useRef } from 'react';

interface OSINTItem {
  id: string;
  title: string;
  source: string;
  threatScore: number;
  category: string;
  sentiment: string;
  publishedAt: string;
  tickers?: string[];
  location?: {
    country: string;
    lat?: number;
    lng?: number;
  };
}

interface WorldHeatmapProps {
  osintData?: OSINTItem[];
}

interface Exchange {
  name: string;
  lat: number;
  lng: number;
  volume: number;
  type: string;
}

const EXCHANGES: Exchange[] = [
  { name: 'NYSE', lat: 40.7128, lng: -74.0060, volume: 95, type: 'stock' },
  { name: 'NASDAQ', lat: 40.7589, lng: -73.9851, volume: 90, type: 'stock' },
  { name: 'LSE', lat: 51.5074, lng: -0.1278, volume: 75, type: 'stock' },
  { name: 'Tokyo SE', lat: 35.6762, lng: 139.6503, volume: 70, type: 'stock' },
  { name: 'Shanghai SE', lat: 31.2304, lng: 121.4737, volume: 80, type: 'stock' },
  { name: 'Hong Kong SE', lat: 22.3193, lng: 114.1694, volume: 72, type: 'stock' },
  { name: 'Euronext', lat: 48.8566, lng: 2.3522, volume: 65, type: 'stock' },
  { name: 'Frankfurt SE', lat: 50.1109, lng: 8.6821, volume: 60, type: 'stock' },
  { name: 'Toronto SE', lat: 43.6532, lng: -79.3832, volume: 55, type: 'stock' },
  { name: 'Sydney ASX', lat: -33.8688, lng: 151.2093, volume: 50, type: 'stock' },
  { name: 'JSE', lat: -26.2041, lng: 28.0473, volume: 45, type: 'stock' },
  { name: 'Mumbai BSE', lat: 19.0760, lng: 72.8777, volume: 58, type: 'stock' },
  { name: 'Singapore SGX', lat: 1.3521, lng: 103.8198, volume: 52, type: 'stock' },
  { name: 'Binance', lat: 1.3521, lng: 103.8198, volume: 98, type: 'crypto' },
  { name: 'Coinbase', lat: 37.7749, lng: -122.4194, volume: 85, type: 'crypto' },
  { name: 'Luno', lat: -26.2041, lng: 28.0473, volume: 40, type: 'crypto' },
];

export default function WorldHeatmap({ osintData = [] }: WorldHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Load Leaflet CSS via link tag
    const linkId = 'leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Wait a bit for CSS to load
      await new Promise(resolve => setTimeout(resolve, 100));

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Add exchange markers
      EXCHANGES.forEach((exchange) => {
        const color = exchange.volume > 70 ? '#00ff88' : exchange.volume > 40 ? '#ffd700' : '#00d4ff';
        const size = Math.max(8, exchange.volume / 10);

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              background: ${color};
              border-radius: 50%;
              box-shadow: 0 0 ${size}px ${color};
              opacity: 0.8;
            "></div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([exchange.lat, exchange.lng], { icon }).addTo(map);

        marker.bindPopup(`
          <div style="
            background: #1a1a2e;
            color: #e0e6ed;
            padding: 12px;
            border-radius: 8px;
            font-family: monospace;
            min-width: 150px;
          ">
            <div style="font-weight: 600; color: ${color}; margin-bottom: 8px;">
              ${exchange.name}
            </div>
            <div style="font-size: 11px; color: #8892a0;">
              Type: ${exchange.type.toUpperCase()}
            </div>
            <div style="font-size: 11px; color: #8892a0;">
              Activity: ${exchange.volume}%
            </div>
          </div>
        `);
      });

      // Add OSINT threat markers
      if (osintData && Array.isArray(osintData)) {
        osintData.forEach((item) => {
          if (item && item.location && item.location.lat && item.location.lng) {
            const threatColor = item.threatScore > 70 ? '#ff3b5c' : item.threatScore > 40 ? '#ffd700' : '#00d4ff';

            const threatIcon = L.divIcon({
              className: 'threat-marker',
              html: `
                <div style="
                  width: 12px;
                  height: 12px;
                  background: ${threatColor};
                  border: 2px solid white;
                  border-radius: 50%;
                  box-shadow: 0 0 10px ${threatColor};
                "></div>
              `,
              iconSize: [12, 12],
              iconAnchor: [6, 6],
            });

            const threatMarker = L.marker([item.location.lat, item.location.lng], { icon: threatIcon }).addTo(map);

            const tickersText = item.tickers && item.tickers.length > 0 ? item.tickers.join(', ') : 'N/A';

            threatMarker.bindPopup(`
              <div style="
                background: #1a1a2e;
                color: #e0e6ed;
                padding: 12px;
                border-radius: 8px;
                font-family: monospace;
                max-width: 250px;
              ">
                <div style="font-weight: 600; color: ${threatColor}; margin-bottom: 8px; font-size: 12px;">
                  THREAT SCORE: ${item.threatScore}
                </div>
                <div style="font-size: 11px; margin-bottom: 8px;">
                  ${item.title || 'Unknown'}
                </div>
                <div style="font-size: 10px; color: #8892a0;">
                  Category: ${item.category || 'Unknown'}
                </div>
                <div style="font-size: 10px; color: #ffd700;">
                  Tickers: ${tickersText}
                </div>
              </div>
            `);
          }
        });
      }

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [osintData]);

  return (
    <div style={styles.container}>
      <div ref={mapRef} style={styles.map} />
      <div style={styles.legend}>
        <div style={styles.legendTitle}>ACTIVITY LEVEL</div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#00ff88' }} />
          <span>High (70%+)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#ffd700' }} />
          <span>Medium (40-70%)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#00d4ff' }} />
          <span>Low (&lt;40%)</span>
        </div>
        <div style={{ ...styles.legendTitle, marginTop: '16px' }}>THREAT INDICATORS</div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#ff3b5c', border: '2px solid white' }} />
          <span>Critical</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#ffd700', border: '2px solid white' }} />
          <span>Warning</span>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    height: '500px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  map: {
    width: '100%',
    height: '100%',
    background: '#0a0a0f',
  },
  legend: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    background: 'rgba(15, 17, 23, 0.95)',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1000,
  },
  legendTitle: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#8892a0',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: '#e0e6ed',
    marginBottom: '4px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
};
