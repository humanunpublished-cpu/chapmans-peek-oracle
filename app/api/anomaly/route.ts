import { NextRequest, NextResponse } from 'next/server';

interface PriceData {
  timestamp: number;
  price: number;
  volume: number;
  change24h?: number;
}

interface AnomalyResult {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  threshold: number;
  message: string;
  timestamp: number;
  ticker: string;
  details: Record<string, unknown>;
}

// Statistical helper functions
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr: number[]): number {
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

// Z-Score Anomaly Detection
function detectZScoreAnomaly(
  currentPrice: number,
  historicalPrices: number[],
  ticker: string,
  threshold: number = 2.5
): AnomalyResult | null {
  if (historicalPrices.length < 10) return null;

  const avg = mean(historicalPrices);
  const std = standardDeviation(historicalPrices);
  
  if (std === 0) return null;

  const zScore = (currentPrice - avg) / std;
  const absZScore = Math.abs(zScore);

  if (absZScore > threshold) {
    const severity = absZScore > 4 ? 'critical' : absZScore > 3 ? 'high' : absZScore > 2.5 ? 'medium' : 'low';
    const direction = zScore > 0 ? 'above' : 'below';
    
    return {
      type: 'zscore',
      severity,
      score: absZScore,
      threshold,
      message: `Price ${absZScore.toFixed(2)}σ ${direction} mean - Unusual ${direction === 'above' ? 'spike' : 'drop'} detected`,
      timestamp: Date.now(),
      ticker,
      details: {
        currentPrice,
        mean: avg,
        standardDeviation: std,
        zScore,
        direction,
        percentDeviation: ((currentPrice - avg) / avg * 100).toFixed(2) + '%',
      },
    };
  }

  return null;
}

// Volume Spike Detection
function detectVolumeSpikeAnomaly(
  currentVolume: number,
  historicalVolumes: number[],
  ticker: string,
  threshold: number = 3
): AnomalyResult | null {
  if (historicalVolumes.length < 10) return null;

  const avgVolume = mean(historicalVolumes);
  const volumeRatio = currentVolume / avgVolume;

  if (volumeRatio > threshold) {
    const severity = volumeRatio > 10 ? 'critical' : volumeRatio > 5 ? 'high' : volumeRatio > 3 ? 'medium' : 'low';
    
    return {
      type: 'volume_spike',
      severity,
      score: volumeRatio,
      threshold,
      message: `Volume ${volumeRatio.toFixed(1)}x average - Major trading activity detected`,
      timestamp: Date.now(),
      ticker,
      details: {
        currentVolume,
        averageVolume: avgVolume,
        volumeRatio,
        percentIncrease: ((volumeRatio - 1) * 100).toFixed(1) + '%',
      },
    };
  }

  return null;
}

// Price Deviation from Moving Average
function detectPriceDeviation(
  currentPrice: number,
  prices: number[],
  ticker: string,
  maWindow: number = 20,
  threshold: number = 5
): AnomalyResult | null {
  if (prices.length < maWindow) return null;

  const recentPrices = prices.slice(-maWindow);
  const movingAverage = mean(recentPrices);
  const deviation = ((currentPrice - movingAverage) / movingAverage) * 100;
  const absDeviation = Math.abs(deviation);

  if (absDeviation > threshold) {
    const severity = absDeviation > 15 ? 'critical' : absDeviation > 10 ? 'high' : absDeviation > 5 ? 'medium' : 'low';
    const direction = deviation > 0 ? 'above' : 'below';
    
    return {
      type: 'price_deviation',
      severity,
      score: absDeviation,
      threshold,
      message: `Price ${absDeviation.toFixed(1)}% ${direction} ${maWindow}-period MA - Trend deviation alert`,
      timestamp: Date.now(),
      ticker,
      details: {
        currentPrice,
        movingAverage,
        deviation: deviation.toFixed(2) + '%',
        direction,
        maWindow,
      },
    };
  }

  return null;
}

// Simplified Local Outlier Factor (LOF) approximation
function detectLOFAnomaly(
  currentPrice: number,
  currentVolume: number,
  historicalData: { price: number; volume: number }[],
  ticker: string,
  threshold: number = 1.5
): AnomalyResult | null {
  if (historicalData.length < 20) return null;

  const prices = historicalData.map(d => d.price);
  const volumes = historicalData.map(d => d.volume);
  
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);
  const volumeMin = Math.min(...volumes);
  const volumeMax = Math.max(...volumes);

  const normalizedCurrent = {
    price: (currentPrice - priceMin) / (priceMax - priceMin || 1),
    volume: (currentVolume - volumeMin) / (volumeMax - volumeMin || 1),
  };

  const normalizedHistorical = historicalData.map(d => ({
    price: (d.price - priceMin) / (priceMax - priceMin || 1),
    volume: (d.volume - volumeMin) / (volumeMax - volumeMin || 1),
  }));

  const k = Math.min(5, historicalData.length - 1);
  const distances = normalizedHistorical.map(h => 
    Math.sqrt(
      Math.pow(normalizedCurrent.price - h.price, 2) +
      Math.pow(normalizedCurrent.volume - h.volume, 2)
    )
  );

  distances.sort((a, b) => a - b);
  const kDistance = distances.slice(0, k);
  const avgKDistance = mean(kDistance);

  const historicalKDistances = normalizedHistorical.map((_, i) => {
    const pointDistances = normalizedHistorical
      .filter((__, j) => j !== i)
      .map(h => Math.sqrt(
        Math.pow(normalizedHistorical[i].price - h.price, 2) +
        Math.pow(normalizedHistorical[i].volume - h.volume, 2)
      ))
      .sort((a, b) => a - b)
      .slice(0, k);
    return mean(pointDistances);
  });

  const avgHistoricalKDistance = mean(historicalKDistances);
  const lofScore = avgKDistance / (avgHistoricalKDistance || 1);

  if (lofScore > threshold) {
    const severity = lofScore > 3 ? 'critical' : lofScore > 2 ? 'high' : lofScore > 1.5 ? 'medium' : 'low';
    
    return {
      type: 'lof',
      severity,
      score: lofScore,
      threshold,
      message: `Local Outlier Factor ${lofScore.toFixed(2)} - Multi-dimensional anomaly detected`,
      timestamp: Date.now(),
      ticker,
      details: {
        lofScore,
        avgKDistance,
        avgHistoricalKDistance,
        interpretation: 'Point is significantly different from local neighborhood',
      },
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { ticker, currentData, historicalData } = await request.json();

    if (!ticker || !currentData || !historicalData) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    const anomalies: AnomalyResult[] = [];

    const historicalPrices = historicalData.map((d: PriceData) => d.price);
    const historicalVolumes = historicalData.map((d: PriceData) => d.volume);

    const zScoreAnomaly = detectZScoreAnomaly(
      currentData.price,
      historicalPrices,
      ticker
    );
    if (zScoreAnomaly) anomalies.push(zScoreAnomaly);

    const volumeAnomaly = detectVolumeSpikeAnomaly(
      currentData.volume,
      historicalVolumes,
      ticker
    );
    if (volumeAnomaly) anomalies.push(volumeAnomaly);

    const priceDeviation = detectPriceDeviation(
      currentData.price,
      historicalPrices,
      ticker
    );
    if (priceDeviation) anomalies.push(priceDeviation);

    const lofAnomaly = detectLOFAnomaly(
      currentData.price,
      currentData.volume,
      historicalData,
      ticker
    );
    if (lofAnomaly) anomalies.push(lofAnomaly);

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const typesList: string[] = [];
    anomalies.forEach(a => {
      if (!typesList.includes(a.type)) {
        typesList.push(a.type);
      }
    });

    return NextResponse.json({
      ticker,
      timestamp: Date.now(),
      anomalyCount: anomalies.length,
      anomalies,
      summary: {
        hasAnomalies: anomalies.length > 0,
        highestSeverity: anomalies[0]?.severity || 'none',
        types: typesList
      },
    });
  } catch (error) {
    console.error('Anomaly detection error:', error);
    return NextResponse.json(
      { error: 'Anomaly detection failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    algorithms: [
      { name: 'Z-Score', description: 'Statistical deviation from mean', threshold: '2.5σ' },
      { name: 'Volume Spike', description: 'Trading volume anomaly', threshold: '3x average' },
      { name: 'Price Deviation', description: 'Deviation from moving average', threshold: '5%' },
      { name: 'Local Outlier Factor', description: 'Multi-dimensional density-based detection', threshold: '1.5' },
    ],
    version: '1.0.0',
  });
}

