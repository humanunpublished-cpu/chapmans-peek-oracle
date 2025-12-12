import { NextRequest, NextResponse } from 'next/server';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  threatScore: number;
  category: string;
  tickers: string[];
  location?: {
    country: string;
    lat?: number;
    lng?: number;
  };
}

// Sentiment analysis keywords
const NEGATIVE_KEYWORDS = [
  'crash', 'plunge', 'collapse', 'scandal', 'fraud', 'investigation',
  'lawsuit', 'hack', 'breach', 'ransomware', 'layoff', 'bankruptcy',
  'default', 'warning', 'crisis', 'failure', 'decline', 'loss',
  'sanctions', 'war', 'conflict', 'attack', 'threat', 'risk',
];

const POSITIVE_KEYWORDS = [
  'surge', 'rally', 'breakthrough', 'partnership', 'acquisition',
  'profit', 'growth', 'expansion', 'innovation', 'approval',
  'launch', 'success', 'record', 'upgrade', 'bullish',
];

// Ticker extraction patterns
const TICKER_PATTERNS: Record<string, string[]> = {
  'bitcoin': ['BTC', 'BTCUSDT'],
  'ethereum': ['ETH', 'ETHUSDT'],
  'tesla': ['TSLA'],
  'apple': ['AAPL'],
  'nvidia': ['NVDA'],
  'microsoft': ['MSFT'],
  'amazon': ['AMZN'],
  'google': ['GOOGL'],
  'meta': ['META'],
  'south africa': ['JSE', 'ZAR'],
};

function analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
  const lowerText = text.toLowerCase();
  
  let negativeCount = 0;
  let positiveCount = 0;
  
  NEGATIVE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) negativeCount++;
  });
  
  POSITIVE_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) positiveCount++;
  });
  
  const totalKeywords = negativeCount + positiveCount;
  
  if (totalKeywords === 0) {
    return { sentiment: 'neutral', score: 0 };
  }
  
  const netScore = (positiveCount - negativeCount) / totalKeywords;
  
  if (netScore > 0.2) return { sentiment: 'positive', score: netScore };
  if (netScore < -0.2) return { sentiment: 'negative', score: Math.abs(netScore) };
  return { sentiment: 'neutral', score: 0 };
}

function extractTickers(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundTickers: string[] = [];
  
  Object.entries(TICKER_PATTERNS).forEach(([keyword, tickers]) => {
    if (lowerText.includes(keyword)) {
      foundTickers.push(...tickers);
    }
  });
  
  // Also look for explicit ticker mentions like $BTC or (NVDA)
  const tickerRegex = /\$([A-Z]{2,5})|\(([A-Z]{2,5})\)/g;
  let match;
  while ((match = tickerRegex.exec(text)) !== null) {
    const ticker = match[1] || match[2];
    if (!foundTickers.includes(ticker)) {
      foundTickers.push(ticker);
    }
  }
  
return Array.from(new Set(foundTickers));
}

function calculateThreatScore(
  sentiment: 'positive' | 'negative' | 'neutral',
  sentimentScore: number,
  text: string
): number {
  let baseScore = 0;
  
  if (sentiment === 'negative') {
    baseScore = 30 + (sentimentScore * 40);
  } else if (sentiment === 'neutral') {
    baseScore = 10;
  }
  
  // Boost for critical keywords
  const criticalKeywords = ['hack', 'breach', 'ransomware', 'crash', 'fraud', 'bankruptcy'];
  const lowerText = text.toLowerCase();
  
  criticalKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      baseScore += 15;
    }
  });
  
  return Math.min(100, Math.round(baseScore));
}

function categorizeNews(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('hack') || lowerText.includes('breach') || lowerText.includes('cyber') || lowerText.includes('ransomware')) {
    return 'Cybersecurity';
  }
  if (lowerText.includes('lawsuit') || lowerText.includes('investigation') || lowerText.includes('sec') || lowerText.includes('regulation')) {
    return 'Legal/Regulatory';
  }
  if (lowerText.includes('war') || lowerText.includes('conflict') || lowerText.includes('sanctions') || lowerText.includes('geopolitical')) {
    return 'Geopolitical';
  }
  if (lowerText.includes('earnings') || lowerText.includes('revenue') || lowerText.includes('profit') || lowerText.includes('quarterly')) {
    return 'Earnings';
  }
  if (lowerText.includes('bitcoin') || lowerText.includes('crypto') || lowerText.includes('ethereum') || lowerText.includes('blockchain')) {
    return 'Cryptocurrency';
  }
  if (lowerText.includes('merger') || lowerText.includes('acquisition') || lowerText.includes('buyout') || lowerText.includes('deal')) {
    return 'M&A';
  }
  
  return 'Market News';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || 'finance cryptocurrency stocks';
    const category = searchParams.get('category') || 'business';
    
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    
    let articles: NewsItem[] = [];
    
    if (NEWS_API_KEY) {
      // Fetch from NewsAPI
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`,
        { next: { revalidate: 300 } } // Cache for 5 minutes
      );
      
      if (response.ok) {
        const data = await response.json();
        
        articles = (data.articles || []).map((article: any, index: number) => {
          const fullText = `${article.title} ${article.description || ''}`;
          const { sentiment, score: sentimentScore } = analyzeSentiment(fullText);
          const tickers = extractTickers(fullText);
          const threatScore = calculateThreatScore(sentiment, sentimentScore, fullText);
          const articleCategory = categorizeNews(fullText);
          
          return {
            id: `news-${Date.now()}-${index}`,
            title: article.title,
            description: article.description || '',
            source: article.source?.name || 'Unknown',
            url: article.url,
            publishedAt: article.publishedAt,
            sentiment,
            threatScore,
            category: articleCategory,
            tickers,
          };
        });
      }
    }
    
    // Add mock data if no API key or no results
    if (articles.length === 0) {
      articles = generateMockOSINT();
    }
    
    // Sort by threat score (highest first)
    articles.sort((a, b) => b.threatScore - a.threatScore);
    
    // Filter by category if specified
    const filteredCategory = searchParams.get('filterCategory');
    if (filteredCategory && filteredCategory !== 'all') {
      articles = articles.filter(a => a.category === filteredCategory);
    }
    
    return NextResponse.json({
      success: true,
      count: articles.length,
      timestamp: Date.now(),
      articles,
      categories: [...new Set(articles.map(a => a.category))],
      stats: {
        totalThreats: articles.filter(a => a.threatScore > 50).length,
        highSeverity: articles.filter(a => a.threatScore > 70).length,
        affectedTickers: [...new Set(articles.flatMap(a => a.tickers))],
      },
    });
  } catch (error) {
    console.error('OSINT fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OSINT data' },
      { status: 500 }
    );
  }
}

function generateMockOSINT(): NewsItem[] {
  const now = Date.now();
  
  return [
    {
      id: 'mock-1',
      title: 'Major Exchange Reports Unusual Trading Volumes in BTC Markets',
      description: 'Trading volumes on major cryptocurrency exchanges have surged 300% in the past 24 hours, sparking speculation about institutional activity.',
      source: 'CryptoWatch',
      url: '#',
      publishedAt: new Date(now - 3600000).toISOString(),
      sentiment: 'neutral',
      threatScore: 45,
      category: 'Cryptocurrency',
      tickers: ['BTC', 'BTCUSDT'],
    },
    {
      id: 'mock-2',
      title: 'Cybersecurity Breach Affects Major Tech Infrastructure',
      description: 'A sophisticated ransomware attack has targeted cloud infrastructure providers, potentially affecting thousands of enterprise customers.',
      source: 'TechSecurity Today',
      url: '#',
      publishedAt: new Date(now - 7200000).toISOString(),
      sentiment: 'negative',
      threatScore: 85,
      category: 'Cybersecurity',
      tickers: ['MSFT', 'AMZN', 'GOOGL'],
    },
    {
      id: 'mock-3',
      title: 'NVIDIA Reports Record Quarterly Earnings',
      description: 'AI chip demand drives NVIDIA to unprecedented quarterly revenue, exceeding analyst expectations by 25%.',
      source: 'Financial Times',
      url: '#',
      publishedAt: new Date(now - 10800000).toISOString(),
      sentiment: 'positive',
      threatScore: 10,
      category: 'Earnings',
      tickers: ['NVDA'],
    },
    {
      id: 'mock-4',
      title: 'Geopolitical Tensions Escalate in Key Shipping Routes',
      description: 'New sanctions and military activity threaten major trade routes, potentially impacting global supply chains.',
      source: 'Reuters',
      url: '#',
      publishedAt: new Date(now - 14400000).toISOString(),
      sentiment: 'negative',
      threatScore: 72,
      category: 'Geopolitical',
      tickers: ['OIL', 'SHIPPING'],
      location: {
        country: 'Middle East',
        lat: 26.8206,
        lng: 30.8025,
      },
    },
    {
      id: 'mock-5',
      title: 'South African Rand Volatility Amid Economic Uncertainty',
      description: 'The ZAR faces pressure as markets react to policy announcements and global risk sentiment.',
      source: 'Business Day',
      url: '#',
      publishedAt: new Date(now - 18000000).toISOString(),
      sentiment: 'negative',
      threatScore: 55,
      category: 'Market News',
      tickers: ['ZAR', 'JSE'],
      location: {
        country: 'South Africa',
        lat: -26.2041,
        lng: 28.0473,
      },
    },
  ];
}

// POST endpoint for custom OSINT queries
export async function POST(request: NextRequest) {
  try {
    const { query, tickers, timeRange } = await request.json();
    
    // Build search query
    const searchQuery = [
      query,
      ...(tickers || []).map((t: string) => `$${t}`),
    ].filter(Boolean).join(' OR ');
    
    // Redirect to GET with params
    const url = new URL(request.url);
    url.searchParams.set('q', searchQuery);
    
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('OSINT search error:', error);
    return NextResponse.json(
      { error: 'Failed to process OSINT search' },
      { status: 500 }
    );
  }
}
