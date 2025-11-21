from fastapi import FastAPI
from .schemas import PredictionRequest, PredictionResponse, Hotspot
import joblib
import numpy as np
import os

app = FastAPI(title="Energy Prediction API")

# Load the trained model
model = None
model_path = os.path.join(os.path.dirname(__file__), "..", "ml", "energy_model.pkl")
try:
    if os.path.exists(model_path):
        model = joblib.load(model_path)
        print(f"Loaded model from {model_path}")
    else:
        print(f"Model not found at {model_path}, using heuristic fallback")
except Exception as e:
    print(f"Error loading model: {e}, using heuristic fallback")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_version": "lightgbm-v1" if model else "heuristic-v1"
    }

@app.post("/v1/predict", response_model=PredictionResponse)
def predict(req: PredictionRequest):
    f = req.features
    
    # Use trained model if available
    if model is not None:
        try:
            # Prepare features for model
            features = np.array([[
                f.loopCount,
                f.nestedLoopDepth,
                f.stringConcatOps,
                f.listScanOps,
                f.functionCount,
                f.avgFunctionLength
            ]])
            
            # Predict energy score
            score = float(model.predict(features)[0])
            score = min(1, max(0, score / 10))  # Normalize to 0-1 range
            model_version = "lightgbm-v1"
        except Exception as e:
            print(f"Model prediction error: {e}, falling back to heuristic")
            score = calculate_heuristic_score(f)
            model_version = "heuristic-v1"
    else:
        score = calculate_heuristic_score(f)
        model_version = "heuristic-v1"
    
    # Generate hotspots
    hotspots = []
    for i, r in enumerate(f.hotspotsSeeds[:8]):
        base = score * (1 - i * 0.12)
        hotspots.append(Hotspot(
            start_line=r.start_line,
            start_char=r.start_char,
            end_line=r.end_line,
            end_char=r.end_char,
            score=max(0, min(1, base)),
            estimate_mJ=int(200 + 120 * i * score),
            confidence=0.8 - 0.04 * i,
            suggestion=generate_suggestion(f, base)
        ))
    
    return PredictionResponse(fileScore=score, hotspots=hotspots, modelVersion=model_version)

def calculate_heuristic_score(f):
    """Fallback heuristic scoring"""
    loop_factor = min(1, f.loopCount / 20)
    depth_factor = min(1, f.nestedLoopDepth / 6)
    concat_factor = min(1, f.stringConcatOps / 15)
    list_factor = min(1, f.listScanOps / 25)
    length_factor = min(1, f.avgFunctionLength / 300)
    score = 0.4 * depth_factor + 0.25 * loop_factor + 0.15 * concat_factor + 0.1 * list_factor + 0.1 * length_factor
    return min(1, max(0, score))

def generate_suggestion(f, score):
    """Generate contextual suggestions based on features"""
    if score < 0.25:
        return None
    
    suggestions = []
    if f.nestedLoopDepth >= 2:
        suggestions.append("Reduce nested loops or use optimized data structures (sets/dicts)")
    if f.stringConcatOps > 3:
        suggestions.append("Use string join() instead of concatenation in loops")
    if f.listScanOps > 5:
        suggestions.append("Convert list membership tests to set lookups")
    
    return suggestions[0] if suggestions else "Consider optimizing this code section"