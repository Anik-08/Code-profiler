import * as vscode from 'vscode';
import { FeatureVector, Range } from '../types';

export function buildFeatureVectorForDocument(doc: vscode.TextDocument): FeatureVector {
  const languageId = doc.languageId;
  const lineCount = doc.lineCount;

  let tokenCount = 0;
  let loopCount = 0;
  let nestedLoopDepth = 0;
  let stringConcatOps = 0;
  let listScanOps = 0;
  let functionCount = 0;
  let avgFunctionLength = 0;

  const commentLines: number[] = [];
  const blankLines: number[] = [];
  const hotspotsSeeds: Range[] = [];

  const loopStack: number[] = []; // track nesting

  for (let i = 0; i < lineCount; i++) {
    const lineNum = i + 1;
    const text = doc.lineAt(i).text;
    const trimmed = text.trim();

    if (!trimmed) {
      blankLines.push(lineNum);
      continue;
    }

    if (isCommentLine(trimmed, languageId)) {
      commentLines.push(lineNum);
      continue;
    }

    tokenCount += trimmed.split(/\s+/).length;

    // Simple language-agnostic loop detection
    if (/\b(for|while)\b/.test(trimmed)) {
      loopCount++;
      loopStack.push(lineNum);
      nestedLoopDepth = Math.max(nestedLoopDepth, loopStack.length);
      hotspotsSeeds.push({
        start: { line: lineNum, character: 0 },
        end: { line: lineNum, character: text.length },
      });
    }

    // crude stack pop for end of block (indent-based/brace-based)
    if (languageId === 'python') {
      if (!/^\s*(for|while)\b/.test(text) && loopStack.length > 0 && getIndentLevel(text) <= getIndentLevel(doc.lineAt(loopStack[loopStack.length - 1] - 1).text)) {
        loopStack.pop();
      }
    } else {
      if (text.includes('}')) {
        if (loopStack.length > 0) loopStack.pop();
      }
    }

    // string concatenation heuristic
    if (/\+?=/.test(trimmed) && /["']/.test(trimmed)) {
      stringConcatOps++;
    }

    // list membership scan heuristic
    if (languageId === 'python' && /\bif\b.+\bin\b.+:/.test(trimmed)) {
      listScanOps++;
    }
    if (languageId !== 'python' && /\bindexOf\(|includes\(/.test(trimmed)) {
      listScanOps++;
    }

    // function detection
    if (languageId === 'python' && /^\s*def\s+\w+\s*\(/.test(text)) {
      functionCount++;
    }
    if (languageId !== 'python' && /\bfunction\b|\b=>\s*\(/.test(text)) {
      functionCount++;
    }
  }

  // naive avg function length (lines / functions)
  avgFunctionLength = functionCount > 0 ? lineCount / functionCount : 0;

  return {
    languageId,
    tokenCount,
    loopCount,
    nestedLoopDepth,
    stringConcatOps,
    listScanOps,
    functionCount,
    avgFunctionLength,
    hotspotsSeeds,
    version: 'fv-ast-lite-v1',
    totalNonCommentLines: lineCount - commentLines.length - blankLines.length,
    commentLines,
    blankLines,
  };
}

function isCommentLine(trimmed: string, languageId: string): boolean {
  if (languageId === 'python') {
    return trimmed.startsWith('#');
  }
  if (trimmed.startsWith('//')) return true;
  if (trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('*/')) return true;
  return false;
}

function getIndentLevel(text: string): number {
  const m = text.match(/^(\s*)/);
  return m ? m[1].length : 0;
}