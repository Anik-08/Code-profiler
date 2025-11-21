"""
train.py

- Loads dataset.jsonl (multiple runs per sample_id at different input_size)
- Aggregates runs per sample_id to compute scaling exponent (slope of log(time) vs log(N))
- Derives complexity_label from slope
- Prepares a feature matrix from static features (and optional dynamic aggregated features)
- Trains:
  - LightGBM classifier for complexity_label
  - LightGBM regressor for energy_mJ (if available) or time_s
- Performs k-fold CV and prints performance.
- Saves models to ml/models/
"""
import json
import math
import os
from collections import defaultdict
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import accuracy_score, classification_report, mean_squared_error
import lightgbm as lgb

DATASET_JSONL = "dataset.jsonl"


def load_jsonl(path):
    rows = []
    with open(path) as f:
        for line in f:
            rows.append(json.loads(line))
    return rows


def aggregate_runs(rows):
    """
    Groups rows by sample_id and computes:
    - slope of log(time) vs log(input_size) if >= 2 points (exponent)
    - labels.complexity_label inferred from slope
    Returns a list of aggregated sample dicts.
    """
    groups = defaultdict(list)
    for r in rows:
        groups[r["sample_id"]].append(r)

    aggregated = []
    for sample_id, runs in groups.items():
        # sort by input_size
        runs_sorted = sorted([rr for rr in runs if rr["input_size"] is not None and rr["dynamic"]["time_s"] is not None], key=lambda x: x["input_size"])
        xs = [float(rr["input_size"]) for rr in runs_sorted]
        ys = [float(rr["dynamic"]["time_s"]) for rr in runs_sorted]
        slope = None
        if len(xs) >= 2 and all(y > 0 for y in ys):
            logx = np.log(xs)
            logy = np.log(ys)
            A = np.vstack([logx, np.ones_like(logx)]).T
            m, c = np.linalg.lstsq(A, logy, rcond=None)[0]
            slope = float(m)
        else:
            # fallback: use single-run time scaling heuristics
            slope = None

        # infer complexity label from slope (tunable thresholds)
        label = "other"
        if slope is None:
            label = "other"
        else:
            if slope < 0.4:
                label = "O(1)"
            elif slope < 0.8:
                label = "O(log n)"
            elif slope < 1.25:
                label = "O(n)"
            elif slope < 1.7:
                label = "O(n log n)"
            elif slope < 2.5:
                label = "O(n^2)"
            else:
                label = "O(n^3)"

        # static features from first run (they should be same across runs)
        static = runs[0]["static_features"]
        # dynamic aggregated (median time)
        median_time = np.median([rr["dynamic"]["time_s"] for rr in runs if rr["dynamic"]["time_s"] is not None]) if runs else None
        median_energy = None
        energies = [rr["dynamic"].get("energy_mJ") for rr in runs if rr["dynamic"].get("energy_mJ") is not None]
        if energies:
            median_energy = float(np.median(energies))

        aggregated.append({
            "sample_id": sample_id,
            "language": runs[0]["language"],
            "slope": slope,
            "complexity_label": label,
            "static_features": static,
            "median_time_s": median_time,
            "median_energy_mJ": median_energy,
        })
    return aggregated


def flatten_features(agg):
    """
    Convert aggregated records into tabular DataFrame.
    - Flattens static_features dict into columns.
    - Adds slope as a numeric feature optionally.
    """
    rows = []
    for a in agg:
        row = {"sample_id": a["sample_id"], "language": a["language"], "slope": a["slope"],
               "median_time_s": a["median_time_s"], "median_energy_mJ": a["median_energy_mJ"], "label": a["complexity_label"]}
        static = a["static_features"]
        # Flatten known fields (tolerant to missing)
        for k in ["tokenCount", "lineCount", "loopCount", "nestedLoopDepth", "stringConcatOps",
                  "listScanOps", "sortOps", "newOps", "arrayLiterals", "mapLike", "recursionDetected",
                  "cyclomaticTokens", "functionCount", "avgFunctionLength", "hasRepeatedBuildsInLoop",
                  "commentRatio", "containsOpsJava"]:
            row[k] = static.get(k)
        # flatten apiCallCounts
        api = static.get("apiCallCounts", {})
        row["api_regex"] = api.get("regex", 0)
        row["api_io"] = api.get("io", 0)
        row["api_sort"] = api.get("sort", 0)
        rows.append(row)
    return pd.DataFrame(rows)


def train_models(df, model_dir="ml/models"):
    os.makedirs(model_dir, exist_ok=True)
    # drop rows without label or features
    df = df.dropna(subset=["label"])
    # target for classification
    y = df["label"].values
    # choose features - simple numeric selection
    feature_cols = ["tokenCount", "lineCount", "loopCount", "nestedLoopDepth", "stringConcatOps",
                    "listScanOps", "sortOps", "newOps", "arrayLiterals", "mapLike",
                    "recursionDetected", "cyclomaticTokens", "functionCount", "avgFunctionLength",
                    "hasRepeatedBuildsInLoop", "commentRatio", "containsOpsJava", "slope",
                    "api_regex", "api_io", "api_sort"]
    X = df[feature_cols].fillna(0).astype(float)

    # Train complexity classifier (LightGBM multiclass)
    le_map = {c: i for i, c in enumerate(sorted(df["label"].unique()))}
    y_enc = np.array([le_map[v] for v in y])
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    accs = []
    for train_idx, test_idx in kf.split(X):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y_enc[train_idx], y_enc[test_idx]
        train_data = lgb.Dataset(X_train, label=y_train)
        valid_data = lgb.Dataset(X_test, label=y_test)
        params = {"objective": "multiclass", "num_class": len(le_map), "metric": "multi_logloss", "verbosity": -1}
        model = lgb.train(params, train_data, valid_sets=[valid_data], num_boost_round=200, early_stopping_rounds=20, verbose_eval=False)
        preds = model.predict(X_test)
        pred_labels = np.argmax(preds, axis=1)
        acc = accuracy_score(y_test, pred_labels)
        accs.append(acc)
    print("Complexity classifier CV accuracy:", np.mean(accs), "std:", np.std(accs))

    # Fit final classifier on full data
    final_clf = lgb.LGBMClassifier(objective="multiclass", num_class=len(le_map), n_estimators=500)
    final_clf.fit(X, y_enc)
    import joblib
    joblib.dump({"model": final_clf, "label_map": le_map, "features": feature_cols}, os.path.join(model_dir, "complexity_clf.joblib"))
    print("Saved classifier to", model_dir)

    # Train energy (or time) regressor if available
    if "median_energy_mJ" in df.columns and df["median_energy_mJ"].notnull().sum() >= 10:
        y_reg = df["median_energy_mJ"].fillna(df["median_energy_mJ"].median()).values
        X_reg = X
        X_train, X_test, y_train, y_test = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)
        train_data = lgb.Dataset(X_train, label=y_train)
        valid_data = lgb.Dataset(X_test, label=y_test)
        params = {"objective": "regression", "metric": "rmse", "verbosity": -1}
        model = lgb.train(params, train_data, valid_sets=[valid_data], num_boost_round=500, early_stopping_rounds=30, verbose_eval=50)
        preds = model.predict(X_test)
        rmse = mean_squared_error(y_test, preds, squared=False)
        print("Energy regressor RMSE:", rmse)
        joblib.dump({"model": model, "features": feature_cols}, os.path.join(model_dir, "energy_regressor.joblib"))
        print("Saved regressor to", model_dir)
    else:
        # fallback: train time regressor on median_time_s if energy not available
        if "median_time_s" in df.columns and df["median_time_s"].notnull().sum() >= 10:
            y_reg = df["median_time_s"].fillna(df["median_time_s"].median()).values
            X_reg = X
            X_train, X_test, y_train, y_test = train_test_split(X_reg, y_reg, test_size=0.2, random_state=42)
            train_data = lgb.Dataset(X_train, label=y_train)
            valid_data = lgb.Dataset(X_test, label=y_test)
            params = {"objective": "regression", "metric": "rmse", "verbosity": -1}
            model = lgb.train(params, train_data, valid_sets=[valid_data], num_boost_round=500, early_stopping_rounds=30, verbose_eval=50)
            preds = model.predict(X_test)
            rmse = mean_squared_error(y_test, preds, squared=False)
            print("Time regressor RMSE:", rmse)
            joblib.dump({"model": model, "features": feature_cols}, os.path.join(model_dir, "time_regressor.joblib"))
            print("Saved time regressor to", model_dir)
        else:
            print("Not enough energy/time labels to train regressor.")


def main(dataset_path="dataset.jsonl"):
    rows = load_jsonl(dataset_path)
    aggregated = aggregate_runs(rows)
    df = flatten_features(aggregated)
    print("Prepared dataframe with shape:", df.shape)
    train_models(df)


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("dataset", nargs="?", default=DATASET_JSONL)
    args = p.parse_args()
    main(args.dataset)