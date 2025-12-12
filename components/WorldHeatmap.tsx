'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface OSINTItem {
  id: string;
  title: string;
  threatScore: number;
  category: string;
  location?: {
    country: string;
    lat?: number;
    lng?: number;
  };
}

interface WorldHeatmapProps {
  osintData?: OSINTItem[];
}

// Major exchange locations
const EXCHANGES = [
  { name: 'NYSE', lat: 40.7069, lng: -74.0089, country: 'US', volume: 85 },
  { name: 'NASDAQ', lat: 40.7569, lng: -73.9897, country: 'US', volume: 78 },
  { name: 'LSE', lat: 51.5144, lng: -0.0893, country: 'UK', volume: 65 },
  { name: 'Tokyo SE', lat: 35.6813, lng: 139.7669, country: 'JP', volume: 72 },
  { name: 'Shanghai SE', lat: 31.2304, lng: 121.4737, country: 'CN', volume: 68 },
  { name: 'Hong Kong SE', lat: 22.2830, lng: 114.1594, country: 'HK', volume: 60 },
  { name: 'Euronext', lat: 48.8698, lng: 2.3411, country: 'FR', volume: 55 },
  { name: 'Frankfurt SE', lat: 50.1109, lng: 8.6821, country: 'DE', volume: 52 },
  { name: 'JSE', lat: -26.1496, lng: 28.0343, country: 'ZA', volume: 35 },
  { name: 'ASX', lat: -33.8688, lng: 151.2093, country: 'AU', volume: 45 },
  { name: 'BSE', lat: 18.9298, lng: 72.8354, country: 'IN', volume: 48 },
  { name: 'Toronto SE', lat: 43.6510, lng: -79.3470, country: 'CA', volume: 42 },
  { name: 'Singapore SE', lat: 1.2838, lng: 103.8591, country: 'SG', volume: 50 },
  { name: 'Swiss SE', lat: 47.3769, lng: 8.5417, country: 'CH', volume: 40 },
  { name: 'Binance', lat: 1.3521, lng: 103.8198, country: 'SG', volume: 90 },
  { name: 'Luno', lat: -33.9249, lng: 18.4241, country: 'ZA', volume: 30 },
];

export default function WorldHeatmap({ osintData = [] }: WorldHeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Custom CSS for markers
    const style = document.createElement('style');
    style.textContent = `
      .exchange-marker {
        background: transparent;
        border: none;
      }
      .marker-inner {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        color: #0a0a0f;
        box-shadow: 0 0 20px currentColor;
        transition: transform 0.2s ease;
        cursor: pointer;
      }
      .marker-inner:hover {
        transform: scale(1.3);
      }
      .threat-marker {
        width: 16px;
        height: 16px;
        background: #ff3b5c;
        border-radius: 50%;
        box-shadow: 0 0 15px #ff3b5c;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.2); }
      }
      .leaflet-popup-content-wrapper {
        background: rgba(15, 20, 30, 0.95);
        color: #e0e6ed;
        border: 1px solid rgba(0, 255, 136, 0.3);
        border-radius: 8px;
        font-family: 'JetBrains Mono', monospace;
      }
      .leaflet-popup-tip {
        background: rgba(15, 20, 30, 0.95);
        border: 1px solid rgba(0, 255, 136, 0.3);
      }
      .popup-title {
        font-size: 14px;
        font-weight: 600;
        color: #00ff88;
        margin-bottom: 8px;
      }
      .popup-stat {
        font-size: 12px;
        color: #8892a0;
        margin: 4px 0;
      }
      .popup-value {
        color: #00d4ff;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);

    // Add exchange markers
    EXCHANGES.forEach((exchange) => {
      const intensity = exchange.volume / 100;
      const color = intensity > 0.7 ? '#00ff88' : intensity > 0.4 ? '#ffd700' : '#00d4ff';
      
      const icon = L.divIcon({
        className: 'exchange-marker',
        html: `<div class="marker-inner" style="background: ${color}; color: #0a0a0f;">${exchange.name.substring(0, 2)}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([exchange.lat, exchange.lng], { icon }).addTo(map);
      
      marker.bindPopup(`
        <div class="popup-title">${exchange.name}</div>
        <div class="popup-stat">Country: <span class="popup-value">${exchange.country}</span></div>
        <div class="popup-stat">Activity: <span class="popup-value">${exchange.volume}%</span></div>
        <div class="popup-stat">Status: <span class="popup-value" style="color: #00ff88;">LIVE</span></div>
      `);

      marker.on('click', () => {
        setSelectedExchange(exchange.name);
      });
    });

    // Add OSINT threat markers
    osintData.forEach((item) => {
      if (item.location?.lat && item.location?.lng) {
        const icon = L.divIcon({
          className: 'threat-marker-container',
          html: `<div class="threat-marker"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([item.location.lat, item.location.lng], { icon }).addTo(map);
        
        const threatColor = item.threatScore > 70 ? '#ff3b5c' : item.threatScore > 40 ? '#ffd700' : '#00d4ff';
        
        marker.bindPopup(`
          <div class="popup-title" style="color: ${threatColor};">⚠️ THREAT ALERT</div>
          <div class="popup-stat">${item.title}</div>
          <div class="popup-stat">Category: <span class="popup-value">${item.category}</span></div>
          <div class="popup-stat">Threat Score: <span class="popup-value" style="color: ${threatColor};">${item.threatScore}</span></div>
          <div class="popup-stat">Location: <span class="popup-value">${item.location.country}</span></div>
        `);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [osintData]);

  return (
    <div style={styles.container}>
      <div style={styles.mapContainer} ref={mapRef} />
      
      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>ACTIVITY LEGEND</div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#00ff88' }} />
          <span>High Volume (70%+)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#ffd700' }} />
          <span>Medium Volume (40-70%)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#00d4ff' }} />
          <span>Low Volume (&lt;40%)</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#ff3b5c', animation: 'pulse 1.5s ease infinite' }} />
          <span>OSINT Threat</span>
        </div>
      </div>

      {/* Exchange List */}
      <div style={styles.exchangePanel}>
        <div style={styles.exchangePanelTitle}>ACTIVE EXCHANGES</div>
        <div style={styles.exchangeList}>
          {EXCHANGES.slice(0, 8).map((exchange) => (
            <div
              key={exchange.name}
              style={{
                ...styles.exchangeItem,
                borderColor: selectedExchange === exchange.name ? '#00ff88' : 'transparent',
              }}
              onClick={() => {
                setSelectedExchange(exchange.name);
                mapInstanceRef.current?.setView([exchange.lat, exchange.lng], 6);
              }}
            >
              <span style={styles.exchangeName}>{exchange.name}</span>
              <span
                style={{
                  ...styles.exchangeVolume,
                  color: exchange.volume > 70 ? '#00ff88' : exchange.volume > 40 ? '#ffd700' : '#00d4ff',
                }}
              >
                {exchange.volume}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
    width: '100%',
    height: '600px',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  mapContainer: {
    width: '100%',
    height: '100%',
    background: '#0a0a0f',
  },
  legend: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    background: 'rgba(15, 20, 30, 0.95)',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: '8px',
    padding: '16px',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
  },
  legendTitle: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#00d4ff',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: '#8892a0',
    marginBottom: '8px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  exchangePanel: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(15, 20, 30, 0.95)',
    border: '1px solid rgba(0, 255, 136, 0.2)',
    borderRadius: '8px',
    padding: '16px',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  exchangePanelTitle: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#00d4ff',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  exchangeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  exchangeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'rgba(255, 255, 255, 0.02)',
  },
  exchangeName: {
    fontSize: '12px',
    color: '#e0e6ed',
    fontWeight: 500,
  },
  exchangeVolume: {
    fontSize: '11px',
    fontWeight: 600,
  },
};
