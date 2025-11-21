import pandas as pd
import joblib
import numpy as np
from onnxmltools.convert import convert_lightgbm
from onnxmltools.convert.common.data_types import FloatTensorType

model = joblib.load("energy_model.pkl")
n_features = 6  # match training features
initial_type = [("input", FloatTensorType([None, n_features]))]
onnx_model = convert_lightgbm(model, initial_types=initial_type, target_opset=12)
with open("../model_artifacts/energy_model.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())
print("Exported ONNX model to model_artifacts/energy_model.onnx")