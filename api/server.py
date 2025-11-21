from fastapi import FastAPI
from .schemas import PredictionRequest, PredictionResponse, Hotspot
import math
import time

app = FastAPI(title="Energy Prediction API")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/v1/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    f = req.features
    loop_factor = min(1, f.loopCount / 20)
    depth_factor = min(1, f.nestedLoopDepth / 6)
    concat_factor = min(1, f.stringConcatOps / 15)
    list_factor = min(1, f.listScanOps / 25)
    length_factor = min(1, f.avgFunctionLength / 300)
    score = 0.4 * depth_factor + 0.25 * loop_factor + 0.15 * concat_factor + 0.1 * list_factor + 0.1 * length_factor
    score = min(1, max(0, score))
    hotspots = []
    for i, r in enumerate(f.hotspotsSeeds[:8]):
        base = score * (1 - i * 0.15)
        hotspots.append(Hotspot(
            start_line=r.start_line,
            start_char=r.start_char,
            end_line=r.end_line,
            end_char=r.end_char,
            score=max(0, min(1, base)),
            estimate_mJ=180 + 100 * i,
            confidence=0.75 - 0.05 * i,
            suggestion="Consider loop optimization or data structure change." if base > 0.3 else None
        ))
    return PredictionResponse(fileScore=score, hotspots=hotspots, modelVersion="api-heuristic-v1")