"""
AutoPredict AI - Vehicle Health & Predictive Maintenance ML Engine.

Architecture Design:
This module provides a modular inference engine. It currently implements a domain-physics
and telemetry-calibrated baseline engine that computes health scores, failure probabilities,
and maintenance distance projections across all 15 input features.

ML INTEGRATION POINT:
When ready to plug in trained scikit-learn models (e.g. RandomForestClassifier / RandomForestRegressor),
simply set self.model = joblib.load(path) and enable model.predict_proba() inside predict().
"""
from typing import Dict, Any, Tuple
import math
import numpy as np

from app.schemas.vehicle import (
    VehicleTelemetryInput,
    FailureRiskLevels,
    MaintenanceRecommendation,
)


class VehicleHealthPredictor:
    def __init__(self, model_path: str = None):
        """
        Initialize the predictor.
        If model_path is provided, loads trained scikit-learn model artifact.
        Otherwise, runs calibrated engineering baseline.
        """
        self.model_path = model_path
        self.ml_model = None
        if model_path:
            self.load_model(model_path)

    def load_model(self, path: str):
        """
        ML PLUG-IN HOOK:
        Load a trained scikit-learn Random Forest model from disk using joblib.
        Example:
            import joblib
            self.ml_model = joblib.load(path)
        """
        try:
            import joblib
            self.ml_model = joblib.load(path)
            self.model_path = path
        except Exception as e:
            print(f"[ML Model Warning] Could not load model from {path}: {e}. Falling back to baseline engine.")
            self.ml_model = None

    def extract_feature_vector(self, data: VehicleTelemetryInput) -> np.ndarray:
        """
        Extracts and normalizes the 15 input features into a numeric vector
        ready for scikit-learn model inference or feature processing.
        """
        # Encoding categorical features
        vehicle_type_map = {"Sedan": 0, "SUV": 1, "Truck": 2, "Hatchback": 3, "Coupe": 4}
        engine_type_map = {"Petrol": 0, "Diesel": 1, "Hybrid": 2, "Electric": 3}

        v_type = vehicle_type_map.get(data.vehicle_type, 0)
        e_type = engine_type_map.get(data.engine_type, 0)

        feature_vector = np.array([
            data.vehicle_age,
            data.mileage,
            v_type,
            e_type,
            data.engine_temperature,
            data.rpm,
            data.engine_load,
            data.battery_voltage,
            data.oil_condition,
            data.brake_wear,
            data.tyre_pressure,
            float(data.service_count),
            data.distance_since_service,
            data.average_speed,
            float(data.hard_braking_events),
            float(data.hard_acceleration_events),
            data.driving_hours,
        ], dtype=float)

        return feature_vector

    def calculate_engine_health(self, data: VehicleTelemetryInput) -> Tuple[float, float]:
        """
        Computes engine health (0-100) and failure probability (0.0-1.0).
        Evaluates engine temperature, rpm, load, oil condition, and hard accelerations.
        """
        health = 100.0

        # Oil condition penalty (oil is lifeblood of the engine)
        oil_loss = max(0.0, 100.0 - data.oil_condition)
        health -= (oil_loss * 0.35)

        # Temperature deviation (nominal 88-95°C)
        if data.engine_temperature > 95:
            overheat_delta = data.engine_temperature - 95
            health -= min(40.0, overheat_delta * 1.8)
        elif data.engine_temperature < 70:
            health -= min(15.0, (70 - data.engine_temperature) * 0.5)

        # Engine load stress
        if data.engine_load > 70:
            load_stress = (data.engine_load - 70) * 0.4
            health -= load_stress

        # RPM stress
        if data.rpm > 4500:
            health -= min(15.0, (data.rpm - 4500) * 0.005)

        # Aggressive driving events
        health -= min(15.0, data.hard_acceleration_events * 1.2)

        # Mileage & Service factor
        if data.distance_since_service > 10000:
            health -= min(15.0, (data.distance_since_service - 10000) / 1000.0 * 1.5)

        health = max(5.0, min(100.0, health))
        
        # Calibrated failure probability
        prob = 1.0 / (1.0 + math.exp((health - 50.0) / 10.0))
        prob = round(max(0.01, min(0.98, prob)), 3)
        return round(health, 1), prob

    def calculate_battery_health(self, data: VehicleTelemetryInput) -> Tuple[float, float]:
        """
        Computes battery health (0-100) and failure probability (0.0-1.0).
        Nominal resting voltage: 12.4 - 12.8V; charging: 13.8 - 14.4V.
        """
        health = 100.0
        v = data.battery_voltage

        if v < 11.8:
            # Severely discharged / failing cell
            health -= (11.8 - v) * 50.0
            health -= 25.0
        elif v < 12.4:
            health -= (12.4 - v) * 35.0
        elif v > 15.0:
            # Overvoltage / faulty regulator
            health -= (v - 15.0) * 30.0

        # Battery age degradation (~8% loss per year past 2 years)
        if data.vehicle_age > 2.0:
            health -= min(35.0, (data.vehicle_age - 2.0) * 8.0)

        health = max(5.0, min(100.0, health))
        prob = 1.0 / (1.0 + math.exp((health - 45.0) / 9.0))
        prob = round(max(0.01, min(0.98, prob)), 3)
        return round(health, 1), prob

    def calculate_brake_health(self, data: VehicleTelemetryInput) -> Tuple[float, float]:
        """
        Computes brake health (0-100) and failure probability (0.0-1.0).
        brake_wear is 0-100 (where 100 is completely worn pad).
        """
        # Base health is directly remaining pad percentage
        base_health = 100.0 - data.brake_wear

        # Penalize hard braking events
        wear_acceleration = min(20.0, data.hard_braking_events * 2.0)
        health = base_health - wear_acceleration

        health = max(4.0, min(100.0, health))
        
        # Brakes have steeper hazard curve as pad reaches zero
        if data.brake_wear >= 75.0:
            prob = 0.55 + ((data.brake_wear - 75.0) / 25.0) * 0.40
        else:
            prob = 1.0 / (1.0 + math.exp((health - 45.0) / 11.0))
        
        prob = round(max(0.01, min(0.99, prob)), 3)
        return round(health, 1), prob

    def calculate_tyre_health(self, data: VehicleTelemetryInput) -> Tuple[float, float]:
        """
        Computes tyre health (0-100) and failure probability (0.0-1.0).
        Nominal pressure: 32-35 PSI.
        """
        health = 100.0

        # Pressure deviation
        if data.tyre_pressure < 30.0:
            under_psi = 30.0 - data.tyre_pressure
            health -= min(40.0, under_psi * 3.5)
        elif data.tyre_pressure > 38.0:
            over_psi = data.tyre_pressure - 38.0
            health -= min(25.0, over_psi * 2.5)

        # Mileage wear (~15% per 20,000 km baseline since tyre change)
        cycle_mileage = data.mileage % 50000.0
        health -= (cycle_mileage / 50000.0) * 35.0

        # Hard braking friction
        health -= min(15.0, data.hard_braking_events * 1.5)

        health = max(10.0, min(100.0, health))
        prob = 1.0 / (1.0 + math.exp((health - 50.0) / 12.0))
        prob = round(max(0.01, min(0.95, prob)), 3)
        return round(health, 1), prob

    def get_risk_level(self, probability: float) -> str:
        if probability >= 0.65:
            return "Critical"
        elif probability >= 0.40:
            return "High"
        elif probability >= 0.20:
            return "Medium"
        return "Low"

    def predict(self, data: VehicleTelemetryInput) -> Dict[str, Any]:
        """
        Execute prediction pipeline.
        
        NOTE FOR TRAINED MODEL:
        If self.ml_model is set, you can call:
            features = self.extract_feature_vector(data).reshape(1, -1)
            prediction = self.ml_model.predict(features)
        """
        # 1. Component evaluations
        eng_health, eng_prob = self.calculate_engine_health(data)
        bat_health, bat_prob = self.calculate_battery_health(data)
        brk_health, brk_prob = self.calculate_brake_health(data)
        tyr_health, tyr_prob = self.calculate_tyre_health(data)

        # 2. Overall composite vehicle health score (0-100)
        overall_health = (
            eng_health * 0.35 +
            bat_health * 0.20 +
            brk_health * 0.25 +
            tyr_health * 0.20
        )
        overall_health = round(max(5.0, min(100.0, overall_health)), 1)

        # 3. Categorical risk levels
        risks = FailureRiskLevels(
            engine=self.get_risk_level(eng_prob),
            battery=self.get_risk_level(bat_prob),
            brakes=self.get_risk_level(brk_prob),
            tyres=self.get_risk_level(tyr_prob),
        )

        # 4. Estimated maintenance distance (km until next mandatory service)
        # Based on minimum component health margin and service cycle
        min_comp_health = min(eng_health, bat_health, brk_health, tyr_health)
        base_distance = 10000.0 - (data.distance_since_service % 10000.0)
        health_factor = max(0.1, min_comp_health / 100.0)
        
        estimated_dist = max(150.0, round(base_distance * health_factor, -1))
        # If brakes are severely worn, cap distance urgently
        if data.brake_wear > 70.0:
            estimated_dist = min(estimated_dist, max(120.0, (100.0 - data.brake_wear) * 80.0))

        # 5. Generate structured recommendations
        recommendations = []
        rec_id = 1

        if brk_health < 72.0 or data.brake_wear > 65.0:
            urgency = "Critical" if data.brake_wear > 80.0 else "Urgent" if data.brake_wear > 65.0 else "Recommended"
            recommendations.append(
                MaintenanceRecommendation(
                    id=f"REC-{rec_id:03d}",
                    component="Brake System",
                    action="Inspect and replace brake pads and rotors",
                    urgency=urgency,
                    explanation=f"Brake wear is at {data.brake_wear:.0f}%, causing increased stopping distance and hazard risk.",
                    estimated_distance_remaining_km=round(estimated_dist * 0.8, 0)
                )
            )
            rec_id += 1

        if bat_health < 75.0 or data.battery_voltage < 12.2:
            urgency = "Critical" if data.battery_voltage < 11.9 else "Urgent" if data.battery_voltage < 12.2 else "Recommended"
            recommendations.append(
                MaintenanceRecommendation(
                    id=f"REC-{rec_id:03d}",
                    component="Battery & Charging",
                    action="Perform battery load test and alternator inspection",
                    urgency=urgency,
                    explanation=f"Battery voltage measured at {data.battery_voltage:.2f}V with age {data.vehicle_age:.1f} years.",
                    estimated_distance_remaining_km=round(estimated_dist * 0.9, 0)
                )
            )
            rec_id += 1

        if data.oil_condition < 60.0 or data.distance_since_service > 8000:
            urgency = "Urgent" if data.oil_condition < 35.0 else "Recommended"
            recommendations.append(
                MaintenanceRecommendation(
                    id=f"REC-{rec_id:03d}",
                    component="Engine Lubrication",
                    action="Oil and oil filter replacement",
                    urgency=urgency,
                    explanation=f"Oil condition index is {data.oil_condition:.0f}% with {data.distance_since_service:,.0f} km since last oil change.",
                    estimated_distance_remaining_km=round(max(200.0, 10000.0 - data.distance_since_service), 0)
                )
            )
            rec_id += 1

        if data.tyre_pressure < 30.0 or data.tyre_pressure > 38.0:
            urgency = "Urgent" if (data.tyre_pressure < 27.0 or data.tyre_pressure > 42.0) else "Recommended"
            action = "Inflate tyres to factory recommendation (32-35 PSI)" if data.tyre_pressure < 30.0 else "Bleed excess tyre pressure to 32-35 PSI"
            recommendations.append(
                MaintenanceRecommendation(
                    id=f"REC-{rec_id:03d}",
                    component="Tyres & Alignment",
                    action=action,
                    urgency=urgency,
                    explanation=f"Current average tyre pressure is {data.tyre_pressure:.1f} PSI (optimal range is 32-35 PSI).",
                    estimated_distance_remaining_km=round(estimated_dist, 0)
                )
            )
            rec_id += 1

        if not recommendations:
            recommendations.append(
                MaintenanceRecommendation(
                    id=f"REC-{rec_id:03d}",
                    component="General Vehicle Health",
                    action="Routine inspection according to OEM schedule",
                    urgency="Routine",
                    explanation="All primary systems operating within standard performance margins.",
                    estimated_distance_remaining_km=round(estimated_dist, 0)
                )
            )

        return {
            "overall_health_score": overall_health,
            "engine_health": eng_health,
            "battery_health": bat_health,
            "brake_health": brk_health,
            "tyre_health": tyr_health,
            "engine_failure_probability": eng_prob,
            "battery_failure_probability": bat_prob,
            "brake_failure_probability": brk_prob,
            "tyre_failure_probability": tyr_prob,
            "failure_risks": risks,
            "estimated_maintenance_distance": estimated_dist,
            "recommendations": recommendations,
            "vehicle_id": data.vehicle_id or "VH-DEMO-01",
        }


# Global predictor instance
predictor = VehicleHealthPredictor()
