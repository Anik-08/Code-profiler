import { Hotspot, FeatureVector } from '../types';

export interface SuggestionRule {
  id: string;
  description: string;
  matches: (fv: FeatureVector, hs: Hotspot) => boolean;
  rewrite: (original: string) => string;
  estimatedDelta: (hs: Hotspot, fv: FeatureVector) => number;
  exampleBefore: string;
  exampleAfter: string;
}

export const rules: SuggestionRule[] = [
  {
    id: 'nested-loop-set-lookup',
    description: 'Replace nested loops / repeated membership with set/dict lookups.',
    matches: (fv, hs) => fv.nestedLoopDepth >= 2 && hs.score >= 0.4,
    rewrite: (original) =>
      original.replace(
        /\bfor\s+(\w+)\s+in\s+(\w+)/,
        (m, a, b) =>
          `# Precompute set for faster lookup\n${b}_set = set(${b})\nfor ${a} in ${b}_set`,
      ),
    estimatedDelta: (hs, _) => hs.score * 0.35,
    exampleBefore: `for x in items:\n  for y in items:\n    if y == target:\n      process(x, y)`,
    exampleAfter: `items_set = set(items)\nfor x in items_set:\n  if target in items_set:\n    process(x, target)`,
  },
  {
    id: 'string-concat-join',
    description: 'Accumulate strings in list and join once instead of += in loop.',
    matches: (fv, hs) => fv.stringConcatOps > 2 && hs.score >= 0.3,
    rewrite: (original) =>
      original.replace(/\w+\s*\+=\s*["'`]/g, (m) => {
        const varName = m.split('+=')[0].trim();
        return `# Convert to list accumulation\n${varName}_parts = []  # collect and join later\n${varName}_parts.append(`;
      }),
    estimatedDelta: (hs, fv) => (fv.stringConcatOps / 10) * 0.4,
    exampleBefore: `result = ""\nfor s in data:\n  result += s + ","`,
    exampleAfter: `parts = []\nfor s in data:\n  parts.append(s + ",")\nresult = "".join(parts)`,
  },
  {
    id: 'list-scan-to-set',
    description: 'Replace repeated membership tests in list with a set.',
    matches: (fv, hs) => fv.listScanOps > 5 && hs.score >= 0.25,
    rewrite: (original) =>
      original.replace(
        /\b(in)\s+([A-Za-z_][A-Za-z0-9_]*)/g,
        (m, _kw, listName) => `in ${listName}_set  # ${listName}_set = set(${listName}) above`,
      ),
    estimatedDelta: (hs, fv) => Math.min(0.3, fv.listScanOps / 50),
    exampleBefore: `for q in queries:\n  if q in items:\n    handle(q)`,
    exampleAfter: `items_set = set(items)\nfor q in queries:\n  if q in items_set:\n    handle(q)`,
  },
];
