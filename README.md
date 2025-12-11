# Chapman's Peek - The Oracle 🔮

**Real-Time Financial Intelligence Terminal**

Live market data • Anomaly detection • OSINT intelligence • PWA installable

![Version](https://img.shields.io/badge/version-1.0.0-00ff88)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

---

## 🚀 Quick Deploy to Vercel

### Step 1: Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit: Chapman's Peek Oracle"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/chapmans-peek-oracle.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Add Environment Variables:
   - `JWT_SECRET` - Your secure secret key (32+ chars)
   - `NEWS_API_KEY` - From [newsapi.org](https://newsapi.org)
   - `FINNHUB_API_KEY` - From [finnhub.io](https://finnhub.io) (optional)
5. Click **Deploy**

### Step 3: Connect Your Domain (cPanel)

In your cPanel DNS Zone Editor, add:

```
Type: CNAME
Name: oracle
Value: cname.vercel-dns.com
TTL: 300
```

Then in Vercel:
1. Go to Project Settings → Domains
2. Add `oracle.security360.co.za`
3. Vercel will auto-provision SSL

---

## 🔐 Default Login Credentials

| Email | Password | Role |
|-------|----------|------|
| warren@chapmans.co.za | oracle2025 | Admin |
| mike@security360.co.za | guardian360 | Admin |

**Invite Codes for New Users:**
- `ORACLE-2025-ALPHA`
- `SECURITY-360-VIP`
- `CHAPMANS-BETA-001`

---

## ✨ Features

### Live Market Data
- Real-time WebSocket from Binance (BTC, ETH)
- Auto-reconnect on disconnect
- 24h high/low/volume stats

### Anomaly Detection Engine
- **Z-Score Analysis** - Statistical deviation detection
- **Volume Spike Detection** - Unusual trading activity
- **Price Deviation** - Moving average divergence
- **Local Outlier Factor (LOF)** - Multi-dimensional anomaly detection

### OSINT Intelligence
- NewsAPI integration for financial news
- Sentiment analysis (positive/negative/neutral)
- Threat scoring algorithm
- Ticker extraction and correlation

### Global Heatmap
- Interactive world map (Leaflet)
- Major exchange locations
- OSINT threat pins with geolocation
- Real-time activity indicators

### PWA Support
- Install to home screen (iOS/Android)
- Offline capability (coming soon)
- Native app feel

---

## 📁 Project Structure

```
chapmans-peek-oracle/
├── app/
│   ├── layout.tsx          # Root layout + PWA meta
│   ├── page.tsx            # Login page with boot sequence
│   ├── dashboard/
│   │   └── page.tsx        # Main dashboard
│   └── api/
│       ├── auth/
│       │   ├── login/      # JWT authentication
│       │   ├── logout/     # Session termination
│       │   └── invite/     # Invite code system
│       ├── anomaly/        # Detection algorithms
│       └── osint/          # News + threat scoring
├── components/
│   └── WorldHeatmap.tsx    # Interactive map
├── styles/
│   └── globals.css         # Terminal theme
├── public/
│   └── manifest.json       # PWA config
└── vercel.json             # Deployment config
```

---

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Create .env.local from example
cp .env.example .env.local

# Edit .env.local with your API keys
nano .env.local

# Start dev server
npm run dev

# Open http://localhost:3000
```

---

## 🔌 API Keys Required

| Service | Purpose | Get Key |
|---------|---------|---------|
| NewsAPI | OSINT news feed | [newsapi.org](https://newsapi.org) |
| Finnhub | Stock data (optional) | [finnhub.io](https://finnhub.io) |
| Alpha Vantage | Technical analysis | [alphavantage.co](https://www.alphavantage.co) |
| Luno | ZAR crypto markets | [luno.com/developers](https://www.luno.com/en/developers/api) |

---

## 🎨 Theme Colors

```css
--green: #00ff88      /* Primary accent */
--cyan: #00d4ff       /* Secondary accent */
--red: #ff3b5c        /* Alerts/danger */
--gold: #ffd700       /* Warnings */
--bg-primary: #0a0a0f /* Background */
```

---

## 📱 PWA Installation

### iOS
1. Open in Safari
2. Tap Share button
3. "Add to Home Screen"

### Android
1. Open in Chrome
2. Tap menu (⋮)
3. "Add to Home Screen"

---

## 🛣️ Roadmap

- [x] Live Binance WebSocket
- [x] Anomaly detection algorithms
- [x] OSINT news feed
- [x] World heatmap
- [x] PWA manifest
- [ ] 48h Prophet forecasting (ARIMA)
- [ ] Luno ZAR integration
- [ ] Trading platform portals
- [ ] Push notifications
- [ ] Offline mode

---

## 📄 License

Proprietary - Chapman's Capital / Security360

---

Built with 💚 by **Security360** | Powered by **Vercel**
