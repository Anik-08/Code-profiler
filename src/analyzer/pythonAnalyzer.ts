import { heuristicExtract } from './heuristics';
import { FeatureVector } from '../types';

export async function analyzePython(code: string): Promise<FeatureVector> {
  // Hackathon: use heuristic. Future: integrate tree-sitter-python.
  const base = heuristicExtract(code, 'python');
  return { ...base, version: '0.1.0' };
}
