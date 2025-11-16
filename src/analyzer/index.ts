import * as vscode from 'vscode';
import { analyzePython } from './pythonAnalyzer';
import { analyzeJS } from './jsAnalyzer';
import { FeatureVector } from '../types';

export async function analyzeDocumentFeatures(doc: vscode.TextDocument): Promise<FeatureVector> {
  const code = doc.getText();
  if (doc.languageId === 'python') return analyzePython(code);
  if (doc.languageId === 'javascript' || doc.languageId === 'typescript') return analyzeJS(code);
  // Fallback
  return {
    languageId: doc.languageId,
    tokenCount: code.length,
    loopCount: 0,
    nestedLoopDepth: 0,
    stringConcatOps: 0,
    listScanOps: 0,
    functionCount: 0,
    avgFunctionLength: 0,
    hotspotsSeeds: [],
    version: '0.1.0',
  };
}
