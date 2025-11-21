import * as ort from 'onnxruntime-node';
import { FeatureVector, PredictionResult } from '../types';

let session: ort.InferenceSession | null = null;

export async function loadOnnxModel(path: string) {
  session = await ort.InferenceSession.create(path, { executionProviders: ['cpu'] });
}

export async function predictOnnx(features: FeatureVector): Promise<PredictionResult> {
  if (!session) throw new Error('ONNX model not loaded');
  const inputArray = new Float32Array([
    features.tokenCount,
    features.loopCount,
    features.nestedLoopDepth,
    features.stringConcatOps,
    features.listScanOps,
    features.functionCount,
    features.avgFunctionLength,
  ]);
  const tensor = new ort.Tensor('float32', inputArray, [1, inputArray.length]);
  const output = await session.run({ input: tensor });
  const fileScore = (output['score']?.data as Float32Array)[0];
  // Simplified: reuse heuristic hotspots but rescale
  return {
    fileScore,
    hotspots: features.hotspotsSeeds.map((r, i) => ({
      start: r.start,
      end: r.end,
      score: Math.min(1, fileScore * (1 - i * 0.1)),
      estimate_mJ: 150 + 100 * i,
      confidence: 0.8 - 0.05 * i,
    })),
    modelVersion: 'onnx-v1',
  };
}