export function applyRuleToText(ruleId: string, original: string): { updated: string } {
  switch (ruleId) {
    case 'string-concat-in-loop':
      return { updated: rewriteStringConcatInLoop(original) };
    case 'nested-loop-lookup':
      return { updated: rewriteNestedLoopLookup(original) };
    case 'list-membership-scan':
      return { updated: rewriteListMembershipScan(original) };
    default:
      return { updated: original };
  }
}

export function buildPatchPreview(ruleId: string, original: string): string {
  const { updated } = applyRuleToText(ruleId, original);
  const oldLines = original.split('\n');
  const newLines = updated.split('\n');

  const diff: string[] = [];
  diff.push('--- original');
  diff.push('+++ optimized');
  const max = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    const a = oldLines[i] ?? '';
    const b = newLines[i] ?? '';
    if (a === b) {
      diff.push(` ${a}`);
    } else {
      if (a) diff.push(`-${a}`);
      if (b) diff.push(`+${b}`);
    }
  }
  return diff.join('\n');
}

// simplistic rewrites; can be replaced by ML/LLM-based generator later
function rewriteStringConcatInLoop(src: string): string {
  // example: turn += inside loop into array.push + join
  return src.replace(/(\w+)\s*\+=\s*(.+)/g, (m, varName, rhs) => {
    return `__buf = (${varName} || []);\n__buf.push(${rhs});\n${varName} = __buf.join("");`;
  });
}

function rewriteNestedLoopLookup(src: string): string {
  // placeholder: user should manually refine these patterns for their languages
  return src;
}

function rewriteListMembershipScan(src: string): string {
  // placeholder: convert "if x in items:" to use a set (Python)
  return src.replace(/if\s+(.+)\s+in\s+(\w+):/g, (m, elem, coll) => {
    return `__set_${coll} = set(${coll})\nif ${elem} in __set_${coll}:`;
  });
}