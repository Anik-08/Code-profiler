import { FeatureVector, Hotspot } from '../types';
import { rules } from './rules';

export interface AppliedSuggestion {
  ruleId: string;
  suggestion: string;
  deltaScore: number;
}

export function evaluateSuggestions(fv: FeatureVector, hotspots: Hotspot[]) {
  const suggestions: Record<string, AppliedSuggestion> = {};
  hotspots.forEach((hs) => {
    rules.forEach((rule) => {
      if (rule.matches(fv, hs)) {
        const delta = rule.estimatedDelta(hs, fv);
        suggestions[rule.id] = {
          ruleId: rule.id,
          suggestion: rule.description,
          deltaScore: delta,
        };
      }
    });
  });
  return suggestions;
}