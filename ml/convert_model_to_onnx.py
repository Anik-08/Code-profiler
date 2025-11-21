"""
Convert a trained scikit-learn / LightGBM regressor (joblib) into ONNX.

Usage:
  python ml/convert_model_to_onnx.py ml/models/energy_regressor.joblib ml/model_artifacts/energy_model.onnx

Requirements:
  pip install skl2onnx onnxmltools lightgbm joblib numpy
"""
import sys
import joblib
import numpy as np
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import os

FEATURE_ORDER = [
    "tokenCount",
    "loopCount",
    "nestedLoopDepth",
    "stringConcatOps",
    "listScanOps",
    "functionCount",
    "avgFunctionLength",
]

def main():
    if len(sys.argv) < 3:
        print("Usage: convert_model_to_onnx.py <input_joblib> <output_onnx>")
        return
    in_path = sys.argv[1]
    out_path = sys.argv[2]
    model = joblib.load(in_path)
    # Create a dummy input with shape (1, n_features)
    n_features = len(FEATURE_ORDER)
    initial_type = [("input", FloatTensorType([None, n_features]))]
    onnx_model = convert_sklearn(model["model"] if isinstance(model, dict) and "model" in model else model, initial_types=initial_type)
    # Save
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print("Saved ONNX to", out_path)
    print("Feature order used:", FEATURE_ORDER)

if __name__ == "__main__":
    main()