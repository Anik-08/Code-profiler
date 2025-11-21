import { FeatureVector, Range } from '../types';

export function heuristicExtract(code: string, languageId: string): Omit<FeatureVector, 'version'> {
  const lines = code.split(/\r?\n/);
  let loopCount = 0;
  let nestedLoopDepth = 0;
  let currentDepth = 0;
  const hotspotsSeeds: Range[] = [];
  const loopStack: number[] = [];
  
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const loopMatch = /\b(for|while)\b/.exec(line);
    
    if (loopMatch) {
      loopCount++;
      currentDepth++;
      loopStack.push(idx);
      nestedLoopDepth = Math.max(nestedLoopDepth, currentDepth);
      hotspotsSeeds.push({
        start: { line: idx, character: 0 },
        end: {
          line: Math.min(idx + 5, lines.length - 1),
          character: lines[Math.min(idx + 5, lines.length - 1)].length,
        },
      });
    }
    
    // Better depth tracking by checking indentation
    if (languageId === 'python' && currentDepth > 0) {
      const indent = line.search(/\S/);
      if (indent >= 0 && loopStack.length > 0) {
        const lastLoopLine = lines[loopStack[loopStack.length - 1]];
        const lastIndent = lastLoopLine.search(/\S/);
        if (indent <= lastIndent && trimmed.length > 0 && !loopMatch) {
          currentDepth = Math.max(0, currentDepth - 1);
          loopStack.pop();
        }
      }
    } else if (currentDepth > 0 && trimmed.startsWith('}')) {
      currentDepth = Math.max(0, currentDepth - 1);
      loopStack.pop();
    }
  });
  
  const stringConcatOps = (code.match(/\+=\s*["'`]/g) || []).length;
  const listScanOps = (code.match(/\b(in)\s+[A-Za-z_][A-Za-z0-9_]*\b/g) || []).length;
  const functionDefs = (code.match(/\bdef\b|\bfunction\b|\b=>\s*\{/g) || []).length;
  
  // Better function length calculation
  const functionLengths: number[] = [];
  if (languageId === 'python') {
    const defMatches = [...code.matchAll(/^[ \t]*def\s+\w+/gm)];
    defMatches.forEach((match, i) => {
      const startIdx = match.index || 0;
      const endIdx = i < defMatches.length - 1 ? (defMatches[i + 1].index || code.length) : code.length;
      const fnCode = code.substring(startIdx, endIdx);
      functionLengths.push(fnCode.split('\n').length);
    });
  }
  
  const avgFunctionLength = functionLengths.length > 0
    ? functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length
    : (functionDefs > 0 ? lines.length / functionDefs : 0);
  
  // Additional complexity metrics
  const conditionalCount = (code.match(/\b(if|else|elif|switch|case)\b/g) || []).length;
  const recursionPotential = detectRecursion(code, languageId);
  const memoryOps = (code.match(/\b(append|extend|new\s+\w+|malloc|allocate)\b/g) || []).length;
  
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
    conditionalCount,
    recursionPotential,
    memoryOps,
  };
}

function detectRecursion(code: string, languageId: string): number {
  let recursionCount = 0;
  
  if (languageId === 'python') {
    const defMatches = [...code.matchAll(/def\s+(\w+)\s*\(/g)];
    defMatches.forEach((match) => {
      const funcName = match[1];
      const funcStart = match.index || 0;
      // Look for function calls to itself within the function body
      const nextDefIdx = code.indexOf('def ', funcStart + 1);
      const funcEnd = nextDefIdx > 0 ? nextDefIdx : code.length;
      const funcBody = code.substring(funcStart, funcEnd);
      const callPattern = new RegExp(`\\b${funcName}\\s*\\(`, 'g');
      const calls = [...funcBody.matchAll(callPattern)];
      if (calls.length > 1) recursionCount++; // One for definition, more for recursive calls
    });
  }
  
  return recursionCount;
}