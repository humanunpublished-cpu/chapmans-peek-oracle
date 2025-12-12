import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: "Chapman's Peek - The Oracle",
  description: 'Real-time financial intelligence terminal with anomaly detection and OSINT capabilities',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "The Oracle",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: "Chapman's Peek",
    title: "Chapman's Peek - The Oracle",
    description: 'Real-time financial intelligence terminal',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Chapman's Peek - The Oracle",
    description: 'Real-time financial intelligence terminal',
  },
};

export const viewport: Viewport = {
  themeColor: '#00ff88',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="terminal-bg grid-bg">
        {children}
      </body>
    </html>
  );
}
