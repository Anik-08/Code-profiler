import fetch from 'node-fetch';
import { FeatureVector, PredictionResult } from '../types';

interface RemoteHotspot {
  start_line: number;
  start_char: number;
  end_line: number;
  end_char: number;
  score: number;
  estimate_mJ?: number;
  confidence?: number;
}

interface RemoteResponse {
  fileScore: number;
  hotspots: RemoteHotspot[];
  modelVersion: string;
}

export async function predictRemote(
  features: FeatureVector,
  endpoint: string,
): Promise<PredictionResult> {
  const response = await fetch(`${endpoint}/v1/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ features }),
  });

  if (!response.ok) {
    throw new Error(`Remote API error: ${response.status}`);
  }

  const data = (await response.json()) as RemoteResponse;
  
  // Transform API response to match our internal format
  return {
    fileScore: data.fileScore,
    hotspots: data.hotspots.map((h) => ({
      start: { line: h.start_line, character: h.start_char },
      end: { line: h.end_line, character: h.end_char },
      score: h.score,
      estimate_mJ: h.estimate_mJ,
      confidence: h.confidence,
    })),
    modelVersion: data.modelVersion,
  };
}
