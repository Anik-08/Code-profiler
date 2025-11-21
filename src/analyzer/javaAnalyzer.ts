import { heuristicExtract } from './heuristics';
import { FeatureVector } from '../types';

export async function analyzeJava(code: string): Promise<FeatureVector> {
  // Reuse generic heuristic with Java-specific signals baked into heuristicExtract
  const base = heuristicExtract(code, 'java');
  return { ...base, version: '0.1.0' };
}