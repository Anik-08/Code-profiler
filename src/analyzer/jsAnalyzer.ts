import { heuristicExtract } from './heuristics';
import { FeatureVector } from '../types';

export async function analyzeJS(code: string): Promise<FeatureVector> {
  // Hackathon: heuristic. Advanced: use @babel/parser or tree-sitter-javascript.
  const base = heuristicExtract(code, 'javascript');
  return { ...base, version: '0.1.0' };
}
