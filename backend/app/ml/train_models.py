"""
AutoPredict AI - Machine Learning Training and Evaluation Pipeline.

Trains scikit-learn models for:
1. Overall Vehicle Health Score (RandomForestRegressor)
2. Engine Failure Risk (RandomForestClassifier)
3. Battery Failure Risk (RandomForestClassifier)
4. Brake Failure Risk (RandomForestClassifier)
5. Tyre Failure Risk (RandomForestClassifier)
6. Predictive Maintenance Distance (RandomForestRegressor)

Saves evaluation metrics to backend/data/model_metrics.json
Saves serialized model artifacts to backend/app/ml/saved_models/
"""

import json
import os
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_FILE = DATA_DIR / "vehicle_data.csv"
METRICS_FILE = DATA_DIR / "model_metrics.json"
MODELS_DIR = BASE_DIR / "app" / "ml" / "saved_models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Feature definitions
CATEGORICAL_FEATURES = ["vehicle_type", "engine_type"]
NUMERICAL_FEATURES = [
    "vehicle_age",
    "mileage",
    "engine_temperature",
    "rpm",
    "engine_load",
    "battery_voltage",
    "oil_condition",
    "brake_wear",
    "tyre_pressure",
    "service_count",
    "distance_since_service",
    "average_speed",
    "hard_braking_events",
    "hard_acceleration_events",
    "driving_hours",
]
ALL_INPUT_FEATURES = CATEGORICAL_FEATURES + NUMERICAL_FEATURES

TARGETS = {
    "overall_health_score": "regression",
    "engine_failure": "classification",
    "battery_failure": "classification",
    "brake_failure": "classification",
    "tyre_failure": "classification",
    "maintenance_distance": "regression",
}


def train_and_evaluate():
    print(f"[ML Training] Loading dataset from {DATA_FILE}...")
    if not DATA_FILE.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_FILE}. Run generate_data.py first.")

    df = pd.read_csv(DATA_FILE)
    print(f"[ML Training] Loaded {len(df):,} samples with {len(df.columns)} columns.")

    X = df[ALL_INPUT_FEATURES]
    
    # Preprocessor definition
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
            ("num", StandardScaler(), NUMERICAL_FEATURES),
        ]
    )

    # Split dataset into 80% train, 20% test with fixed seed
    train_indices, test_indices = train_test_split(
        df.index, test_size=0.20, random_state=42
    )

    X_train_raw = X.loc[train_indices]
    X_test_raw = X.loc[test_indices]

    print("[ML Training] Fitting preprocessor on training data...")
    X_train = preprocessor.fit_transform(X_train_raw)
    X_test = preprocessor.transform(X_test_raw)

    # Save preprocessor artifact
    preprocessor_path = MODELS_DIR / "preprocessor.joblib"
    joblib.dump(preprocessor, preprocessor_path)
    print(f"[ML Training] Saved preprocessor to {preprocessor_path}")

    # Track metrics
    metrics_report = {
        "dataset": {
            "total_samples": len(df),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "features_count": X_train.shape[1],
            "random_state": 42,
        },
        "models": {},
    }

    # Train each model
    for target_name, task_type in TARGETS.items():
        print(f"\n[ML Training] ---> Training model for: {target_name} ({task_type})")
        y_train = df.loc[train_indices, target_name]
        y_test = df.loc[test_indices, target_name]

        if task_type == "regression":
            model = RandomForestRegressor(
                n_estimators=120,
                max_depth=12,
                min_samples_split=4,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            )
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)

            mae = float(mean_absolute_error(y_test, y_pred))
            r2 = float(r2_score(y_test, y_pred))

            print(f"  [Evaluation] MAE: {mae:.2f} | R²: {r2:.4f}")
            metrics_report["models"][target_name] = {
                "task_type": "regression",
                "algorithm": "RandomForestRegressor",
                "metrics": {
                    "mae": round(mae, 3),
                    "r2": round(r2, 4),
                },
            }

        else:  # Classification
            model = RandomForestClassifier(
                n_estimators=120,
                max_depth=10,
                min_samples_split=4,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            )
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)

            acc = float(accuracy_score(y_test, y_pred))
            prec = float(precision_score(y_test, y_pred, zero_division=0))
            rec = float(recall_score(y_test, y_pred, zero_division=0))
            f1 = float(f1_score(y_test, y_pred, zero_division=0))

            print(f"  [Evaluation] Accuracy: {acc:.3f} | Precision: {prec:.3f} | Recall: {rec:.3f} | F1: {f1:.3f}")
            metrics_report["models"][target_name] = {
                "task_type": "classification",
                "algorithm": "RandomForestClassifier",
                "metrics": {
                    "accuracy": round(acc, 4),
                    "precision": round(prec, 4),
                    "recall": round(rec, 4),
                    "f1_score": round(f1, 4),
                },
            }

        # Save model
        model_filename = f"{target_name}_model.joblib"
        model_path = MODELS_DIR / model_filename
        joblib.dump(model, model_path)
        print(f"  [Saved] {model_path.name}")

    # Save feature columns metadata for fast validation
    metadata = {
        "all_input_features": ALL_INPUT_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "targets": list(TARGETS.keys()),
    }
    with open(MODELS_DIR / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Save metrics JSON
    with open(METRICS_FILE, "w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)
    print(f"\n[ML Training] Successfully saved model metrics to {METRICS_FILE}")
    print("[ML Training] Training pipeline completed successfully!")

    return metrics_report


if __name__ == "__main__":
    train_and_evaluate()
