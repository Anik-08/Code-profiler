import pandas as pd
import joblib
import numpy as np
from onnxmltools import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

model = joblib.load("energy_model.pkl")
n_features = 6  # match training features
initial_type = [("input", FloatTensorType([None, n_features]))]
onnx_model = convert_sklearn(model, initial_types=initial_type)
with open("../model_artifacts/energy_model.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())
print("Exported ONNX model to model_artifacts/energy_model.onnx")