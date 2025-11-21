import { FeatureVector, Hotspot } from '../types';

export function scoreFeatures(f: FeatureVector): { fileScore: number; hotspots: Hotspot[] } {
  const loopFactor = normalize(f.loopCount, 0, 20);
  const depthFactor = normalize(f.nestedLoopDepth, 0, 6);
  const concatFactor = normalize(f.stringConcatOps, 0, 15);
  const scanFactor = normalize(f.listScanOps, 0, 25);
  const lengthFactor = normalize(f.avgFunctionLength, 0, 300);

  // Higher weight on nested depth — nested loops are expensive.
  let score =
    0.55 * depthFactor +
    0.18 * loopFactor +
    0.12 * concatFactor +
    0.1 * scanFactor +
    0.05 * lengthFactor;

  // Non-linear boosts for severe nesting
  if (f.nestedLoopDepth >= 4) score += 0.30;
  else if (f.nestedLoopDepth >= 3) score += 0.18;
  else if (f.nestedLoopDepth === 2) score += 0.06;

  // Boost if many list-scan ops (.contains/.includes/in)
  if (f.listScanOps > 8) score += 0.08;

  score = Math.min(1, Math.max(0, score));

  const hotspots: Hotspot[] = f.hotspotsSeeds.map((r, i) => {
    const perHotspot = Math.min(1, score * (1 - i * 0.08) + (f.nestedLoopDepth >= 3 ? 0.08 : 0));
    return {
      start: r.start,
      end: r.end,
      score: perHotspot,
      estimate_mJ: 200 + 80 * i,
      confidence: Math.max(0, 0.8 - 0.05 * i),
    };
  });

  return { fileScore: score, hotspots };
}

function normalize(x: number, min: number, max: number) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (x - min) / (max - min)));
}