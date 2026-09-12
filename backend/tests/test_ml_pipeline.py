"""
AutoPredict AI - ML Pipeline & Prediction Validation Test Suite.

Validates:
1. Model artifacts existence & loading.
2. Metrics serialization.
3. Healthy vehicle vs Risky vehicle inference comparison.
4. Health score consistency: health = 100 - failure_probability.
"""

import json
from pathlib import Path
import sys

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.ml.predict import predictor, predict_vehicle_health
from app.schemas.vehicle import VehicleTelemetryInput


def test_models_exist():
    saved_dir = BASE_DIR / "app" / "ml" / "saved_models"
    expected_files = [
        "preprocessor.joblib",
        "overall_health_score_model.joblib",
        "engine_failure_model.joblib",
        "battery_failure_model.joblib",
        "brake_failure_model.joblib",
        "tyre_failure_model.joblib",
        "maintenance_distance_model.joblib",
        "metadata.json",
    ]
    print("[Test 1/4] Verifying saved model artifacts...")
    for f in expected_files:
        p = saved_dir / f
        assert p.exists(), f"Missing model artifact: {p}"
        assert p.stat().st_size > 0, f"Empty model artifact: {p}"
    print("  -> All 8 model and preprocessor artifacts verified on disk.")


def test_metrics_json():
    print("[Test 2/4] Verifying model_metrics.json...")
    metrics_path = BASE_DIR / "data" / "model_metrics.json"
    assert metrics_path.exists(), f"Missing metrics file: {metrics_path}"
    with open(metrics_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "models" in data, "No 'models' section in metrics"
    models = data["models"]
    assert "overall_health_score" in models
    assert "engine_failure" in models
    assert "battery_failure" in models
    assert "brake_failure" in models
    assert "tyre_failure" in models
    assert "maintenance_distance" in models

    print(f"  -> Metrics confirmed:")
    print(f"     - Overall Health R²:      {models['overall_health_score']['metrics']['r2']:.4f} (MAE: {models['overall_health_score']['metrics']['mae']:.2f})")
    print(f"     - Engine Failure F1:      {models['engine_failure']['metrics']['f1_score']:.4f} (Acc: {models['engine_failure']['metrics']['accuracy']:.3f})")
    print(f"     - Battery Failure F1:     {models['battery_failure']['metrics']['f1_score']:.4f} (Acc: {models['battery_failure']['metrics']['accuracy']:.3f})")
    print(f"     - Brake Failure F1:       {models['brake_failure']['metrics']['f1_score']:.4f} (Acc: {models['brake_failure']['metrics']['accuracy']:.3f})")
    print(f"     - Tyre Failure F1:        {models['tyre_failure']['metrics']['f1_score']:.4f} (Acc: {models['tyre_failure']['metrics']['accuracy']:.3f})")
    print(f"     - Maintenance Dist R²:    {models['maintenance_distance']['metrics']['r2']:.4f} (MAE: {models['maintenance_distance']['metrics']['mae']:.1f} km)")


def test_healthy_vs_risky():
    print("[Test 3/4] Evaluating Healthy vs. Risky vehicle profiles...")

    healthy_vehicle = {
        "vehicle_id": "VH-HEALTHY-01",
        "vehicle_type": "Sedan",
        "engine_type": "Petrol",
        "vehicle_age": 1.5,
        "mileage": 18000.0,
        "engine_temperature": 91.0,
        "rpm": 1950.0,
        "engine_load": 28.0,
        "battery_voltage": 12.65,
        "oil_condition": 92.0,
        "brake_wear": 18.0,
        "tyre_pressure": 33.2,
        "service_count": 2,
        "distance_since_service": 2100.0,
        "average_speed": 54.0,
        "hard_braking_events": 1,
        "hard_acceleration_events": 1,
        "driving_hours": 2.5,
    }

    risky_vehicle = {
        "vehicle_id": "VH-RISKY-02",
        "vehicle_type": "SUV",
        "engine_type": "Diesel",
        "vehicle_age": 7.2,
        "mileage": 165000.0,
        "engine_temperature": 109.5,  # High overheat
        "rpm": 3400.0,
        "engine_load": 84.0,          # High load
        "battery_voltage": 11.60,     # Degraded battery
        "oil_condition": 22.0,        # Depleted oil
        "brake_wear": 88.0,           # Critical brake wear
        "tyre_pressure": 23.5,        # Underinflated
        "service_count": 8,
        "distance_since_service": 16500.0,  # Overdue service
        "average_speed": 42.0,
        "hard_braking_events": 16,    # Severe braking
        "hard_acceleration_events": 12,
        "driving_hours": 8.0,
    }

    pred_healthy = predict_vehicle_health(healthy_vehicle)
    pred_risky = predict_vehicle_health(risky_vehicle)

    # Health comparisons
    print("\n  ===============================================================")
    print("  COMPARISON MATRIX: HEALTHY vs. RISKY VEHICLE")
    print("  ===============================================================")
    print(f"  {'Metric':<32} | {'Healthy Vehicle':<16} | {'Risky Vehicle':<16}")
    print("  " + "-" * 70)
    print(f"  {'Overall Health Score (0-100)':<32} | {pred_healthy['overall_health_score']:<16.1f} | {pred_risky['overall_health_score']:<16.1f}")
    print(f"  {'Engine Failure Prob (%)':<32} | {pred_healthy['engine_failure_probability']:<16.1f} | {pred_risky['engine_failure_probability']:<16.1f}")
    print(f"  {'Battery Failure Prob (%)':<32} | {pred_healthy['battery_failure_probability']:<16.1f} | {pred_risky['battery_failure_probability']:<16.1f}")
    print(f"  {'Brake Failure Prob (%)':<32} | {pred_healthy['brake_failure_probability']:<16.1f} | {pred_risky['brake_failure_probability']:<16.1f}")
    print(f"  {'Tyre Failure Prob (%)':<32} | {pred_healthy['tyre_failure_probability']:<16.1f} | {pred_risky['tyre_failure_probability']:<16.1f}")
    print(f"  {'Maint. Distance (km)':<32} | ~{pred_healthy['estimated_maintenance_distance']:<15.0f} | ~{pred_risky['estimated_maintenance_distance']:<15.0f}")
    print(f"  {'Brake Risk Category':<32} | {pred_healthy['failure_risks']['brakes']:<16} | {pred_risky['failure_risks']['brakes']:<16}")
    print("  " + "-" * 70)

    # Assertions
    assert pred_healthy["overall_health_score"] > pred_risky["overall_health_score"], "Healthy vehicle must have higher score than risky vehicle!"
    assert pred_risky["overall_health_score"] < 50.0, f"Risky vehicle score should be depressed, got {pred_risky['overall_health_score']}"
    assert pred_healthy["brake_failure_probability"] < pred_risky["brake_failure_probability"], "Risky vehicle must have higher brake risk!"
    assert pred_risky["brake_failure_probability"] > 40.0, f"Risky vehicle brake prob should be elevated, got {pred_risky['brake_failure_probability']}%"
    assert pred_healthy["estimated_maintenance_distance"] > pred_risky["estimated_maintenance_distance"], "Healthy vehicle must have longer service distance!"

    # Check recommendations
    print(f"\n  [Healthy Recommendations] ({len(pred_healthy['recommendations'])}):")
    for r in pred_healthy["recommendations"]:
        print(f"    - [{r['urgency']}] {r['component']}: {r['action']}")

    print(f"\n  [Risky Recommendations] ({len(pred_risky['recommendations'])}):")
    for r in pred_risky["recommendations"]:
        print(f"    - [{r['urgency']}] {r['component']}: {r['action']}")

    has_urgent = any(r["urgency"] in ["Urgent", "Critical"] for r in pred_risky["recommendations"])
    assert has_urgent, "Risky vehicle must trigger Urgent or Critical recommendations!"
    print("\n  -> Healthy vs. Risky validations PASSED.")


def test_consistency_rules():
    print("[Test 4/4] Verifying health and failure probability consistency...")
    sample = {
        "vehicle_id": "VH-TEST-CONSISTENCY",
        "vehicle_type": "Hatchback",
        "engine_type": "Hybrid",
        "vehicle_age": 4.0,
        "mileage": 55000.0,
        "engine_temperature": 93.0,
        "rpm": 2100.0,
        "engine_load": 40.0,
        "battery_voltage": 12.3,
        "oil_condition": 65.0,
        "brake_wear": 45.0,
        "tyre_pressure": 32.0,
        "service_count": 4,
        "distance_since_service": 6000.0,
        "average_speed": 45.0,
        "hard_braking_events": 3,
        "hard_acceleration_events": 2,
        "driving_hours": 3.0,
    }

    res = predict_vehicle_health(sample)

    for comp in ["engine", "battery", "brake", "tyre"]:
        h = res[f"{comp}_health"]
        p = res[f"{comp}_failure_probability"]
        total = round(h + p, 1)
        assert abs(total - 100.0) <= 0.2, f"Inconsistent {comp}: health({h}) + prob({p}) = {total} != 100.0"

    print("  -> Component health strictly matches 100 - failure_probability (sum = 100.0%).")
    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")


if __name__ == "__main__":
    test_models_exist()
    test_metrics_json()
    test_healthy_vs_risky()
    test_consistency_rules()
