import { FeatureVector, Hotspot } from '../types';

export function scoreFeatures(f: FeatureVector): { fileScore: number; hotspots: Hotspot[] } {
  const loopFactor = normalize(f.loopCount, 0, 20);
  const depthFactor = normalize(f.nestedLoopDepth, 0, 6);
  const concatFactor = normalize(f.stringConcatOps, 0, 15);
  const scanFactor = normalize(f.listScanOps, 0, 25);
  const lengthFactor = normalize(f.avgFunctionLength, 0, 300);

  let score =
    0.4 * depthFactor +
    0.25 * loopFactor +
    0.15 * concatFactor +
    0.1 * scanFactor +
    0.1 * lengthFactor;
  score = Math.min(1, score);

  const hotspots: Hotspot[] = f.hotspotsSeeds.map((r, i) => {
    const base = score * (1 - i * 0.15);
    return {
      start: r.start,
      end: r.end,
      score: Math.max(0, Math.min(1, base)),
      estimate_mJ: 200 + 120 * i,
      confidence: 0.7 - 0.05 * i,
    };
  });

  return { fileScore: score, hotspots };
}

function normalize(x: number, min: number, max: number) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (x - min) / (max - min)));
}
