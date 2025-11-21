import { FeatureVector, Range } from '../types';

export function heuristicExtract(code: string, languageId: string): Omit<FeatureVector, 'version'> {
  const lines = code.split(/\r?\n/);
  let loopCount = 0;
  let nestedLoopDepth = 0;
  let currentDepth = 0;
  const hotspotsSeeds: Range[] = [];
  lines.forEach((line, idx) => {
    const loopMatch = /\b(for|while)\b/.exec(line);
    if (loopMatch) {
      loopCount++;
      currentDepth++;
      nestedLoopDepth = Math.max(nestedLoopDepth, currentDepth);
      hotspotsSeeds.push({
        start: { line: idx, character: 0 },
        end: {
          line: Math.min(idx + 5, lines.length - 1),
          character: lines[Math.min(idx + 5, lines.length - 1)].length,
        },
      });
    }
    if (!loopMatch && currentDepth > 0 && line.trim() === '') {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  });
  const stringConcatOps = (code.match(/\+=\s*["'`]/g) || []).length;
  const listScanOps = (code.match(/\b(in)\s+[A-Za-z_][A-Za-z0-9_]*\b/g) || []).length;
  const functionDefs = (code.match(/\bdef\b|\bfunction\b|\b=>\s*\{/g) || []).length;
  const functionLengths: number[] = [];
  // Naive: length = lines / function count
  if (functionDefs > 0) functionLengths.push(lines.length / functionDefs);
  const avgFunctionLength =
    functionLengths.reduce((a, b) => a + b, 0) / (functionLengths.length || 1);
  return {
    languageId,
    tokenCount: code.length,
    loopCount,
    nestedLoopDepth,
    stringConcatOps,
    listScanOps,
    functionCount: functionDefs,
    avgFunctionLength,
    hotspotsSeeds,
  };
}