export interface Position {
  line: number;
  character: number;
}
export interface Range {
  start: Position;
  end: Position;
}
export interface Hotspot extends Range {
  score: number; // 0..1
  estimate_mJ?: number;
  confidence?: number;
  ruleId?: string;
  suggestion?: string;
  deltaScore?: number;
}
export interface FeatureVector {
  languageId: string;
  tokenCount: number;
  loopCount: number;
  nestedLoopDepth: number;
  stringConcatOps: number;
  listScanOps: number;
  functionCount: number;
  avgFunctionLength: number;
  hotspotsSeeds: Range[];
  version: string;
}
export interface PredictionResult {
  fileScore: number;
  hotspots: Hotspot[];
  modelVersion: string;
}