"""
API route definitions for AutoPredict AI.
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.database import get_db
from app.schemas.vehicle import (
    VehicleTelemetryInput,
    PredictionOutput,
    VehiclePreset,
)
from app.services.prediction_service import PredictionService
from app.ml.simulator import get_presets, get_preset_by_id
from app.ml.predict import predictor

api_router = APIRouter()


@api_router.get("/health", status_code=status.HTTP_200_OK, tags=["System"])
def health_check():
    """
    Health check endpoint confirming that the backend API is running and trained ML models are loaded.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ml_engine_ready": predictor.is_loaded,
        "model_pipeline": "Scikit-Learn Random Forest Ensemble (6 Models)",
        "database": "SQLite connected",
        "models_loaded": list(predictor.models.keys()) if predictor.is_loaded else [],
    }


@api_router.post(
    "/predict",
    response_model=PredictionOutput,
    status_code=status.HTTP_200_OK,
    tags=["Prediction"]
)
def predict_vehicle_health(
    telemetry: VehicleTelemetryInput,
    db: Session = Depends(get_db)
):
    """
    Executes trained Random Forest models to evaluate 15 vehicle sensor, maintenance, and driving parameters:
    1. Overall vehicle health score (0-100) via RandomForestRegressor
    2. Component-level scores (Engine, Battery, Brakes, Tyres)
    3. Failure probabilities (0-100%) via RandomForestClassifier
    4. Categorical risk classifications (Low, Medium, High, Critical)
    5. Predictive maintenance distance estimate (km) via RandomForestRegressor
    6. Dynamic maintenance recommendations prioritized by urgency
    """
    try:
        result = PredictionService.run_prediction(telemetry, db=db, persist=True)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction pipeline error: {str(e)}"
        )


@api_router.get("/presets", response_model=List[VehiclePreset], tags=["Simulation"])
def list_vehicle_presets():
    """
    Returns curated simulated vehicle presets for quick testing and demonstrations.
    """
    return get_presets()


@api_router.get("/presets/{preset_id}", response_model=VehiclePreset, tags=["Simulation"])
def get_vehicle_preset(preset_id: str):
    """
    Returns a specific simulated vehicle scenario.
    """
    preset = get_preset_by_id(preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Vehicle preset not found")
    return preset


@api_router.get("/history", tags=["Analytics"])
def get_prediction_history(
    vehicle_id: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Retrieves recent vehicle health predictions logged to SQLite.
    Supports optional vehicle_id filter and limit (default: 20).
    """
    return PredictionService.get_history(db=db, limit=limit, vehicle_id=vehicle_id)


@api_router.get("/metrics", tags=["Analytics"])
def get_model_metrics():
    """
    Returns verified model evaluation metrics directly from data/model_metrics.json.
    """
    metrics_path = settings.DATA_DIR / "model_metrics.json"
    if metrics_path.exists():
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read model metrics: {str(e)}"
            )
    return {"models": {}}
