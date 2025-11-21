import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as ort from 'onnxruntime-node';
import { FeatureVector, Hotspot } from '../types';
import { getExtensionConfig } from '../config';

// Keep this order identical to training & conversion
const FEATURE_ORDER = [
  'tokenCount',
  'loopCount',
  'nestedLoopDepth',
  'stringConcatOps',
  'listScanOps',
  'functionCount',
  'avgFunctionLength',
];

export interface ModelPrediction {
  fileScore: number;
  estimated_mJ?: number | null;
  hotspots?: Hotspot[]; // optional, extension will map model score to hotspots
}

function fvToFeatureArray(fv: FeatureVector): number[] {
  const map: any = { ...fv } as any;
  return FEATURE_ORDER.map((k) => Number(map[k] ?? 0));
}

let onnxSession: ort.InferenceSession | null = null;

export async function predictWithModel(fv: FeatureVector): Promise<ModelPrediction | null> {
  const cfg = getExtensionConfig();
  // Remote inference first when allowed
  if (!cfg.localOnly) {
    try {
      const endpoint = cfg.endpoint || 'http://localhost:8080';
      const url = new URL('/predict_features', endpoint).toString();
      const body = { features: fvToFeatureObject(fv) };
      const abort = new AbortController();
      const timeoutId = setTimeout(() => abort.abort(), 5000);
      const r = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
      });
      clearTimeout(timeoutId);
      if (r.ok) {
        type RemotePredictResponse = { fileScore?: number; estimated_mJ?: number };
        const json = (await r.json()) as RemotePredictResponse;
        return { fileScore: Number(json.fileScore ?? 0), estimated_mJ: json.estimated_mJ ?? null };
      }
    } catch (e) {
      // remote failed or aborted; fall through to local
      console.warn('Model remote predict failed', e);
    }
  }

  // Try local ONNX model
  try {
    const modelPath = path.join(__dirname, '..', '..', 'model_artifacts', 'energy_model.onnx');
    if (!fs.existsSync(modelPath)) return null;
    if (!onnxSession) {
      onnxSession = await ort.InferenceSession.create(modelPath);
    }
    const session = onnxSession;
    const feat = fvToFeatureArray(fv);
    const input = Float32Array.from(feat);
    const tensor = new ort.Tensor('float32', input, [1, feat.length]);
    const inputName = session.inputNames[0] || 'input';
    const feeds: Record<string, ort.Tensor> = { [inputName]: tensor };
    const out = await session.run(feeds);
    const outName = session.outputNames[0];
    const predArr = out[outName].data as Float32Array;
    const predicted_mJ = predArr[0];
    const fileScore = Math.min(1.0, predicted_mJ / 2000.0);
    return { fileScore, estimated_mJ: predicted_mJ };
  } catch (e) {
    console.warn('Local ONNX predict failed', e);
    return null;
  }
}

function fvToFeatureObject(fv: FeatureVector): Record<string, number> {
  const obj: any = {};
  const map: any = { ...fv } as any;
  FEATURE_ORDER.forEach((k) => {
    obj[k] = Number(map[k] ?? 0);
  });
  return obj;
}