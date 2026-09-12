"""
AutoPredict AI - Prediction Service.

Loads trained scikit-learn models from disk and exposes clean inference functions.
Derived component health is strictly consistent with failure probabilities:
health = 100.0 - failure_probability (%)
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Union
import joblib
import numpy as np
import pandas as pd

# Directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "app" / "ml" / "saved_models"

FEATURE_COLUMNS = [
    "vehicle_age",
    "mileage",
    "vehicle_type",
    "engine_type",
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


class VehiclePredictor:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(VehiclePredictor, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, models_dir: Path = MODELS_DIR):
        if self._initialized:
            return
        self.models_dir = Path(models_dir)
        self.preprocessor = None
        self.models: Dict[str, Any] = {}
        self.is_loaded = False
        self.load_models()
        self._initialized = True

    def load_models(self):
        """Loads all serialized scikit-learn model artifacts and preprocessor from disk."""
        try:
            preprocessor_path = self.models_dir / "preprocessor.joblib"
            if not preprocessor_path.exists():
                print(f"[Predictor Warning] Preprocessor not found at {preprocessor_path}. Models not loaded.")
                return

            self.preprocessor = joblib.load(preprocessor_path)

            model_names = [
                "overall_health_score",
                "engine_failure",
                "battery_failure",
                "brake_failure",
                "tyre_failure",
                "maintenance_distance",
            ]

            for name in model_names:
                model_file = self.models_dir / f"{name}_model.joblib"
                if model_file.exists():
                    self.models[name] = joblib.load(model_file)
                else:
                    print(f"[Predictor Warning] Model file {model_file.name} missing.")

            self.is_loaded = (len(self.models) == len(model_names))
            if self.is_loaded:
                print(f"[Predictor] Successfully loaded all {len(self.models)} trained models & preprocessor.")
        except Exception as e:
            print(f"[Predictor Error] Failed loading models: {e}")
            self.is_loaded = False

    @staticmethod
    def _to_dataframe(data: Union[dict, Any]) -> pd.DataFrame:
        """Converts incoming Pydantic model or dict to single-row DataFrame with exact columns."""
        if hasattr(data, "model_dump"):
            d = data.model_dump()
        elif hasattr(data, "dict"):
            d = data.dict()
        elif isinstance(data, dict):
            d = data
        else:
            d = dict(data)

        # Extract only expected feature columns
        row = {col: d.get(col, 0) for col in FEATURE_COLUMNS}
        return pd.DataFrame([row])

    @staticmethod
    def get_risk_category(prob_percent: float) -> str:
        """
        Maps failure probability percentage (0-100%) to categorical risk level:
        0–15% = Low
        15–35% = Medium
        35–60% = High
        60–100% = Critical
        """
        if prob_percent >= 60.0:
            return "Critical"
        elif prob_percent >= 35.0:
            return "High"
        elif prob_percent >= 15.0:
            return "Medium"
        return "Low"

    def generate_recommendations(
        self,
        prediction_results: dict,
        telemetry: dict
    ) -> List[dict]:
        """Dynamically generates prioritized maintenance recommendations from model outputs."""
        recommendations = []
        rec_id = 1
        maint_dist = prediction_results["estimated_maintenance_distance"]

        # 1. Brake System recommendation
        brake_prob = prediction_results["brake_failure_probability"]
        brake_wear = telemetry.get("brake_wear", 30.0)
        if brake_prob >= 35.0 or brake_wear >= 65.0:
            urgency = "Critical" if (brake_prob >= 65.0 or brake_wear >= 80.0) else "Urgent" if (brake_prob >= 40.0 or brake_wear >= 65.0) else "Recommended"
            recommendations.append({
                "id": f"REC-{rec_id:03d}",
                "component": "Brake System",
                "action": "Inspect brake pads, rotors, and caliper hydraulics",
                "urgency": urgency,
                "explanation": f"Model detected {brake_prob:.1f}% brake failure risk with pad wear at {brake_wear:.0f}%.",
                "estimated_distance_remaining_km": round(min(maint_dist, max(150.0, (100.0 - brake_wear) * 70.0)), 0),
            })
            rec_id += 1

        # 2. Battery & Electrical recommendation
        battery_prob = prediction_results["battery_failure_probability"]
        voltage = telemetry.get("battery_voltage", 12.5)
        age = telemetry.get("vehicle_age", 3.0)
        if battery_prob >= 30.0 or voltage < 12.1:
            urgency = "Critical" if voltage < 11.8 else "Urgent" if battery_prob >= 45.0 else "Recommended"
            recommendations.append({
                "id": f"REC-{rec_id:03d}",
                "component": "Battery & Starting",
                "action": "Perform battery conductance test and charging circuit check",
                "urgency": urgency,
                "explanation": f"Battery failure risk is {battery_prob:.1f}% (terminal voltage measured at {voltage:.2f}V, age {age:.1f} yrs).",
                "estimated_distance_remaining_km": round(maint_dist * 0.9, 0),
            })
            rec_id += 1

        # 3. Engine & Lubrication recommendation
        engine_prob = prediction_results["engine_failure_probability"]
        temp = telemetry.get("engine_temperature", 90.0)
        oil = telemetry.get("oil_condition", 75.0)
        dist_service = telemetry.get("distance_since_service", 5000.0)
        if engine_prob >= 25.0 or temp > 102.0 or oil < 45.0 or dist_service > 9500.0:
            urgency = "Critical" if temp > 108.0 else "Urgent" if (engine_prob >= 40.0 or oil < 30.0) else "Recommended"
            recommendations.append({
                "id": f"REC-{rec_id:03d}",
                "component": "Engine & Lubrication",
                "action": "Engine diagnostic scan, oil change, and cooling system flush",
                "urgency": urgency,
                "explanation": f"Engine risk index is {engine_prob:.1f}% (coolant temp {temp:.1f}°C, oil condition {oil:.0f}%).",
                "estimated_distance_remaining_km": round(max(200.0, 10000.0 - dist_service), 0),
            })
            rec_id += 1

        # 4. Tyres & Alignment recommendation
        tyre_prob = prediction_results["tyre_failure_probability"]
        psi = telemetry.get("tyre_pressure", 33.0)
        if tyre_prob >= 28.0 or psi < 29.0 or psi > 38.0:
            urgency = "Urgent" if (psi < 26.0 or psi > 40.0 or tyre_prob >= 50.0) else "Recommended"
            recommendations.append({
                "id": f"REC-{rec_id:03d}",
                "component": "Tyres & Alignment",
                "action": f"Adjust cold tyre pressure to 33 PSI and check tread wear uniformity",
                "urgency": urgency,
                "explanation": f"Tyre failure risk is {tyre_prob:.1f}% (current average pressure: {psi:.1f} PSI).",
                "estimated_distance_remaining_km": round(maint_dist, 0),
            })
            rec_id += 1

        # 5. Overall health comprehensive check if score is low
        overall = prediction_results["overall_health_score"]
        if overall < 60.0:
            recommendations.append({
                "id": f"REC-{rec_id:03d}",
                "component": "Comprehensive Vehicle Inspection",
                "action": "Schedule comprehensive multipoint service inspection",
                "urgency": "Urgent" if overall < 45.0 else "Recommended",
                "explanation": f"Overall vehicle health score is {overall:.1f}/100 with multiple sub-system degradation indicators.",
                "estimated_distance_remaining_km": round(maint_dist * 0.75, 0),
            })
            rec_id += 1

        # Default routine recommendation if vehicle is in good shape
        if not recommendations:
            recommendations.append({
                "id": "REC-001",
                "component": "Routine Maintenance",
                "action": "Standard scheduled inspection according to OEM interval",
                "urgency": "Routine",
                "explanation": "All monitored subsystems operating within standard design margins.",
                "estimated_distance_remaining_km": round(maint_dist, 0),
            })

        return recommendations

    def predict_vehicle_health(self, telemetry_data: Union[dict, Any]) -> dict:
        """
        Main prediction function.
        Accepts vehicle input data and returns full prediction payload:
        - overall_health_score (0-100)
        - component health scores (0-100)
        - failure probabilities (0-100%)
        - estimated_maintenance_distance (km)
        - dynamic recommendations
        """
        if not self.is_loaded:
            # Attempt reloading in case models were trained after server boot
            self.load_models()

        if not self.is_loaded:
            raise RuntimeError("ML models not loaded. Ensure train_models.py has completed successfully.")

        df_input = self._to_dataframe(telemetry_data)
        X_trans = self.preprocessor.transform(df_input)

        # 1. Regress overall health score (0-100)
        overall_health = float(self.models["overall_health_score"].predict(X_trans)[0])
        overall_health = round(max(5.0, min(99.0, overall_health)), 1)

        # 2. Classify component failure probabilities (0-100%)
        eng_prob = float(self.models["engine_failure"].predict_proba(X_trans)[0][1]) * 100.0
        bat_prob = float(self.models["battery_failure"].predict_proba(X_trans)[0][1]) * 100.0
        brk_prob = float(self.models["brake_failure"].predict_proba(X_trans)[0][1]) * 100.0
        tyr_prob = float(self.models["tyre_failure"].predict_proba(X_trans)[0][1]) * 100.0

        eng_prob = round(max(0.5, min(99.0, eng_prob)), 1)
        bat_prob = round(max(0.5, min(99.0, bat_prob)), 1)
        brk_prob = round(max(0.5, min(99.0, brk_prob)), 1)
        tyr_prob = round(max(0.5, min(99.0, tyr_prob)), 1)

        # 3. Derive component health consistently: health = 100 - failure_probability
        eng_health = round(max(1.0, min(99.5, 100.0 - eng_prob)), 1)
        bat_health = round(max(1.0, min(99.5, 100.0 - bat_prob)), 1)
        brk_health = round(max(1.0, min(99.5, 100.0 - brk_prob)), 1)
        tyr_health = round(max(1.0, min(99.5, 100.0 - tyr_prob)), 1)

        # 4. Regress maintenance distance (km)
        maint_distance = float(self.models["maintenance_distance"].predict(X_trans)[0])
        maint_distance = max(150.0, round(maint_distance, -1))

        raw_telemetry = (
            telemetry_data.model_dump()
            if hasattr(telemetry_data, "model_dump")
            else dict(telemetry_data)
        )

        intermediate = {
            "overall_health_score": overall_health,
            "engine_health": eng_health,
            "battery_health": bat_health,
            "brake_health": brk_health,
            "tyre_health": tyr_health,
            "engine_failure_probability": eng_prob,
            "battery_failure_probability": bat_prob,
            "brake_failure_probability": brk_prob,
            "tyre_failure_probability": tyr_prob,
            "estimated_maintenance_distance": maint_distance,
        }

        # Dynamic recommendations
        recommendations = self.generate_recommendations(intermediate, raw_telemetry)

        # Risk categories
        failure_risks = {
            "engine": self.get_risk_category(eng_prob),
            "battery": self.get_risk_category(bat_prob),
            "brakes": self.get_risk_category(brk_prob),
            "tyres": self.get_risk_category(tyr_prob),
        }

        return {
            **intermediate,
            "failure_risks": failure_risks,
            "recommendations": recommendations,
            "vehicle_id": raw_telemetry.get("vehicle_id", "VH-CUSTOM"),
        }


# Singleton predictor
predictor = VehiclePredictor()


def predict_vehicle_health(data: Union[dict, Any]) -> dict:
    """Convenience function matching specification in project prompt."""
    return predictor.predict_vehicle_health(data)
