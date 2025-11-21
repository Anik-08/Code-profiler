"""
evaluate.py

Load saved models and run predictions on new aggregated dataset (produced by train.py aggregation).
Produces:
- confusion matrix & classification report for complexity
- regression metrics for energy/time
"""
import joblib
import json
import numpy as np
import pandas as pd
from ml.train import load_jsonl, aggregate_runs, flatten_features
import os
from sklearn.metrics import classification_report, mean_squared_error, confusion_matrix

def load_models(model_dir="ml/models"):
    clf_pack = joblib.load(os.path.join(model_dir, "complexity_clf.joblib"))
    reg_path = os.path.join(model_dir, "energy_regressor.joblib")
    reg = None
    if os.path.exists(reg_path):
        reg = joblib.load(reg_path)
    return clf_pack, reg

def main(dataset_jsonl="dataset.jsonl", model_dir="ml/models"):
    rows = load_jsonl(dataset_jsonl)
    agg = aggregate_runs(rows)
    df = flatten_features(agg)
    clf_pack, reg_pack = load_models(model_dir)
    clf = clf_pack["model"]
    label_map = clf_pack["label_map"]
    inverse_map = {v:k for k,v in label_map.items()}
    X = df[clf_pack["features"]].fillna(0).astype(float)
    pred = clf.predict(X)
    pred_labels = [inverse_map[p] for p in pred]
    print("Classification report:")
    print(classification_report(df["label"], pred_labels))
    if reg_pack is not None:
        reg_model = reg_pack["model"] if "model" in reg_pack else reg_pack
        y_true = df["median_energy_mJ"].values
        y_pred = reg_model.predict(X)
        print("Regressor RMSE:", mean_squared_error(y_true, y_pred, squared=False))

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("dataset", nargs="?", default="dataset.jsonl")
    p.add_argument("--models", default="ml/models")
    args = p.parse_args()
    main(args.dataset, args.models)