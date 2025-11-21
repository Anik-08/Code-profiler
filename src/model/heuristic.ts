import { FeatureVector, Hotspot } from '../types';

interface HeuristicResult {
  fileScore: number;
  estimated_mJ?: number;
  hotspots: Hotspot[];
  modelVersion?: string;
}

/**
 * Local heuristic fallback model.
 *
 * - Uses simple static metrics from FeatureVector.
 * - Produces a fileScore in [0,1].
 * - Produces a rough total energy estimate in mJ.
 * - Seeds hotspots from fv.hotspotsSeeds with proportional scores.
 */
export function scoreFeatures(fv: FeatureVector): HeuristicResult {
  // Basic "complexity" score from features
  const complexity =
    0.4 * fv.loopCount +
    0.6 * fv.nestedLoopDepth +
    0.3 * fv.stringConcatOps +
    0.2 * fv.listScanOps;

  const sizePenalty = 0.0005 * fv.tokenCount;
  const rawScore = complexity + sizePenalty;

  // Squash to [0,1]
  const fileScore = rawScore > 0 ? 1 - 1 / (1 + rawScore) : 0;

  // Rough total energy: scale fileScore to 0..1000 mJ
  const estimated_mJ = fileScore * 1000;

  const seeds = fv.hotspotsSeeds ?? [];
  const hotspots: Hotspot[] = [];

  if (seeds.length > 0) {
    // distribute fileScore and energy across seeds
    const perScore = fileScore / seeds.length;
    const perEnergy = estimated_mJ / seeds.length;

    for (const seed of seeds) {
      hotspots.push({
        start: { ...seed.start },
        end: { ...seed.end },
        score: perScore,
        estimate_mJ: perEnergy,
        confidence: 0.4,
      });
    }
  }

  return {
    fileScore,
    estimated_mJ,
    hotspots,
    modelVersion: 'heuristic-local-v1',
  };
}