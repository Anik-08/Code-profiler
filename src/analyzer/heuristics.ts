import { FeatureVector, Range } from '../types';

function stripComments(code: string, languageId: string) {
  if (languageId === 'python') {
    // remove '#' comments (rough)
    return code.replace(/#.*/g, '');
  } else {
    // JS/TS/Java style: remove // ... and /* ... */ blocks
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
      .replace(/\/\/.*/g, ''); // line comments
  }
}

function isCommentOrBlankLine(line: string, languageId: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true; // blank line
  
  if (languageId === 'python') {
    // Python: line starting with #
    return /^\s*#/.test(line);
  } else {
    // JS/TS/Java: line starting with //, /*, or * (in block comment)
    return /^\s*(\/\/|\/\*|\*)/.test(line);
  }
}

export function heuristicExtract(code: string, languageId: string): Omit<FeatureVector, 'version'> {
  const rawLines = code.split(/\r?\n/);
  const codeNoComments = stripComments(code, languageId);
  const lines = codeNoComments.split(/\r?\n/);

  let loopCount = 0;
  let nestedLoopDepth = 0;
  const hotspotsSeeds: Range[] = [];

  const usesBraces = languageId === 'javascript' || languageId === 'typescript' || languageId === 'java';
  let braceDepth = 0;
  let pyCurrentDepth = 0;

  const loopRegex = /\b(for|while)\b/;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx] ?? '';
    const trimmed = line.trim();
    // Skip blank or comment-only origin line
    const orig = rawLines[idx] ?? '';
    if (!trimmed || /^\s*(#|\/\/|\/\*)/.test(orig.trim())) {
      if (!usesBraces && pyCurrentDepth > 0) {
        // naive python dedent on blank lines
        pyCurrentDepth = Math.max(0, pyCurrentDepth - 1);
      }
      continue;
    }

    // For brace-based languages adjust braceDepth for leading closing braces
    if (usesBraces) {
      if (/^\s*}/.test(line)) {
        // decrease prior to counting loop on same line
        const closings = (line.match(/}/g) || []).length;
        braceDepth = Math.max(0, braceDepth - closings);
      }
    }

    const isLoop = loopRegex.test(line);
    if (isLoop) {
      loopCount++;
      const level = usesBraces ? braceDepth + 1 : pyCurrentDepth + 1;
      nestedLoopDepth = Math.max(nestedLoopDepth, level);
      
      // Seed region around loop header, but avoid comment-only lines
      let endIdx = idx;
      let nonCommentLines = 0;
      const maxScan = Math.min(idx + 6, rawLines.length - 1);
      
      // Scan forward to find meaningful code lines (not just comments)
      for (let scanIdx = idx; scanIdx <= maxScan && nonCommentLines < 5; scanIdx++) {
        if (!isCommentOrBlankLine(rawLines[scanIdx] ?? '', languageId)) {
          endIdx = scanIdx;
          nonCommentLines++;
        }
      }
      
      // Only create hotspot if we found non-comment code
      if (nonCommentLines > 0) {
        hotspotsSeeds.push({
          start: { line: idx, character: 0 },
          end: { line: endIdx, character: (rawLines[endIdx] ?? '').length },
        });
      }
    }

    // update depth trackers after processing header
    if (usesBraces) {
      const openings = (line.match(/{/g) || []).length;
      const closings = (line.match(/}/g) || []).length;
      braceDepth = Math.max(0, braceDepth + openings - closings);
    } else {
      if (isLoop) pyCurrentDepth++;
    }
  }

  // Basic operation counts (on comment-stripped code)
  const stringConcatOps = (codeNoComments.match(/\+=\s*["'`]/g) || []).length;

  // Membership scans: python 'in', js .includes(), java .contains()
  const pythonInOps = (codeNoComments.match(/\b(in)\s+[A-Za-z_][A-Za-z0-9_]*\b/g) || []).length;
  const jsIncludesOps = (languageId === 'javascript' || languageId === 'typescript') ? (codeNoComments.match(/\.includes\s*\(/g) || []).length : 0;
  const javaContainsOps = (languageId === 'java') ? (codeNoComments.match(/\.contains\s*\(/g) || []).length : 0;
  const listScanOps = pythonInOps + jsIncludesOps + javaContainsOps;

  // Function approximations
  const functionDefs = (codeNoComments.match(/\bdef\b|\bfunction\b|\b=>\s*\{|(\bclass\b|\bstatic\b).+\{/g) || []).length;
  const functionLengths: number[] = [];
  if (functionDefs > 0) functionLengths.push(lines.length / Math.max(1, functionDefs));
  const avgFunctionLength = functionLengths.length ? functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length : 0;

  return {
    languageId,
    tokenCount: codeNoComments.length,
    loopCount,
    nestedLoopDepth,
    stringConcatOps,
    listScanOps,
    functionCount: functionDefs,
    avgFunctionLength,
    hotspotsSeeds,
  };
}