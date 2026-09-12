"""
Service layer coordinating trained ML inference, schema validations, and SQLite history logging.
"""
import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.schemas.vehicle import (
    VehicleTelemetryInput,
    PredictionOutput,
    FailureRiskLevels,
    MaintenanceRecommendation,
)
from app.ml.predict import predict_vehicle_health
from app.models.vehicle import PredictionRecord


class PredictionService:
    @staticmethod
    def run_prediction(
        data: VehicleTelemetryInput,
        db: Optional[Session] = None,
        persist: bool = True
    ) -> PredictionOutput:
        """
        Executes prediction using trained scikit-learn models and optionally stores history in SQLite.
        """
        # Run trained ML pipeline
        result = predict_vehicle_health(data)

        # Convert recommendations dicts to Pydantic models
        recs = [
            MaintenanceRecommendation(**r) if isinstance(r, dict) else r
            for r in result["recommendations"]
        ]

        risks = (
            FailureRiskLevels(**result["failure_risks"])
            if isinstance(result["failure_risks"], dict)
            else result["failure_risks"]
        )

        prediction_output = PredictionOutput(
            overall_health_score=result["overall_health_score"],
            engine_health=result["engine_health"],
            battery_health=result["battery_health"],
            brake_health=result["brake_health"],
            tyre_health=result["tyre_health"],
            engine_failure_probability=result["engine_failure_probability"],
            battery_failure_probability=result["battery_failure_probability"],
            brake_failure_probability=result["brake_failure_probability"],
            tyre_failure_probability=result["tyre_failure_probability"],
            failure_risks=risks,
            estimated_maintenance_distance=result["estimated_maintenance_distance"],
            recommendations=recs,
            model_version="2.0.0-random-forest",
            timestamp=datetime.utcnow(),
            vehicle_id=result.get("vehicle_id", data.vehicle_id or "VH-DEMO-01"),
        )

        # Persist to SQLite database if session provided
        if db is not None and persist:
            try:
                record = PredictionRecord(
                    vehicle_id=data.vehicle_id or "VH-DEMO-01",
                    vehicle_type=data.vehicle_type,
                    engine_type=data.engine_type,
                    mileage=data.mileage,
                    overall_health_score=prediction_output.overall_health_score,
                    engine_health=prediction_output.engine_health,
                    battery_health=prediction_output.battery_health,
                    brake_health=prediction_output.brake_health,
                    tyre_health=prediction_output.tyre_health,
                    engine_failure_probability=prediction_output.engine_failure_probability,
                    battery_failure_probability=prediction_output.battery_failure_probability,
                    brake_failure_probability=prediction_output.brake_failure_probability,
                    tyre_failure_probability=prediction_output.tyre_failure_probability,
                    estimated_maintenance_distance=prediction_output.estimated_maintenance_distance,
                    telemetry_json=json.dumps(data.model_dump()),
                    recommendations_json=json.dumps([r.model_dump() for r in prediction_output.recommendations]),
                )
                db.add(record)
                db.commit()
                db.refresh(record)
            except Exception as e:
                db.rollback()
                print(f"[DB Warning] Could not persist prediction log: {e}")

        return prediction_output

    @staticmethod
    def get_history(
        db: Session,
        limit: int = 20,
        vehicle_id: Optional[str] = None
    ) -> List[dict]:
        """Fetch recent prediction logs from SQLite database with optional vehicle filtering."""
        query = db.query(PredictionRecord)
        if vehicle_id:
            query = query.filter(PredictionRecord.vehicle_id == vehicle_id)
        records = (
            query.order_by(PredictionRecord.created_at.desc(), PredictionRecord.id.desc())
            .limit(limit)
            .all()
        )
        return [r.to_dict() for r in records]
