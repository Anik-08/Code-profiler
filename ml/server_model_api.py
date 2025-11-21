"""
Simple FastAPI model server that loads a joblib LightGBM regressor/classifier and exposes /predict_features.

Usage:
  pip install fastapi uvicorn pydantic joblib numpy
  python ml/server_model_api.py

Endpoint:
  POST /predict_features
  Body: { "features": { "<featureName>": value, ... } }
  Returns: { "fileScore": float, "estimated_mJ": float }

Note: keep FEATURE_ORDER identical to extension.
"""
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import joblib
import numpy as np
import os

app = FastAPI(title="CEP Model API")

MODEL_PATH = "ml/models/energy_regressor.joblib"
FEATURE_ORDER = [
    "tokenCount",
    "loopCount",
    "nestedLoopDepth",
    "stringConcatOps",
    "listScanOps",
    "functionCount",
    "avgFunctionLength",
]

model = None
if os.path.exists(MODEL_PATH):
    loaded = joblib.load(MODEL_PATH)
    # If we stored as dict like {"model": model, "features": feature_cols}
    if isinstance(loaded, dict) and "model" in loaded:
        model = loaded["model"]
    else:
        model = loaded
    print("Loaded model from", MODEL_PATH)
else:
    print("Model not found at", MODEL_PATH)


class PredictRequest(BaseModel):
    features: Dict[str, float]


class PredictResponse(BaseModel):
    fileScore: float
    estimated_mJ: Optional[float]


@app.post("/predict_features", response_model=PredictResponse)
async def predict_features(req: PredictRequest):
    if model is None:
        return {"fileScore": 0.0, "estimated_mJ": None}
    # Build feature vector in FEATURE_ORDER
    try:
        x = np.array([[float(req.features.get(k, 0.0)) for k in FEATURE_ORDER]], dtype=float)
        pred = model.predict(x)
        # model may return array or scalar
        predicted_mJ = float(pred[0] if isinstance(pred, (list, np.ndarray)) else pred)
        # convert to a normalized fileScore between 0..1 for display
        # naive scaling: map predicted_mJ to [0,1] using an ad-hoc scale (tune later)
        fileScore = min(1.0, predicted_mJ / 2000.0)
        return {"fileScore": fileScore, "estimated_mJ": predicted_mJ}
    except Exception as e:
        return {"fileScore": 0.0, "estimated_mJ": None}