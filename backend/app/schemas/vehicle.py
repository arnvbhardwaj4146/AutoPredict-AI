"""
Pydantic schemas for AutoPredict AI vehicle telemetry and prediction results.
"""
from typing import List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class VehicleTelemetryInput(BaseModel):
    """
    Input schema containing all 15 vehicle, sensor, maintenance, and driving features.
    """
    # Vehicle parameters
    vehicle_id: Optional[str] = Field(default="VH-DEMO-01", description="Identifier for the vehicle")
    vehicle_type: str = Field(default="Sedan", description="Vehicle type: Sedan, SUV, Truck, Hatchback, Coupe")
    engine_type: str = Field(default="Petrol", description="Engine type: Petrol, Diesel, Hybrid, Electric")
    vehicle_age: float = Field(..., ge=0, le=50, description="Vehicle age in years")
    mileage: float = Field(..., ge=0, le=1000000, description="Total odometer mileage in km")

    # Engine/sensor telemetry
    engine_temperature: float = Field(..., ge=0, le=200, description="Engine coolant/block temperature in °C")
    rpm: float = Field(..., ge=0, le=12000, description="Current engine revolutions per minute")
    engine_load: float = Field(..., ge=0, le=100, description="Engine operating load percentage (0-100%)")

    # Battery
    battery_voltage: float = Field(..., ge=6.0, le=18.0, description="12V battery terminal voltage")

    # Maintenance & Component state
    oil_condition: float = Field(..., ge=0, le=100, description="Oil quality/remaining life percentage (0-100%)")
    brake_wear: float = Field(..., ge=0, le=100, description="Brake pad wear percentage (0=brand new, 100=metal on metal)")
    tyre_pressure: float = Field(..., ge=15, le=60, description="Average tyre pressure in PSI")
    service_count: int = Field(..., ge=0, le=100, description="Number of past routine services performed")
    distance_since_service: float = Field(..., ge=0, le=100000, description="Distance traveled since last routine service in km")

    # Driving behavior
    average_speed: float = Field(..., ge=0, le=300, description="Average driving speed in km/h")
    hard_braking_events: int = Field(..., ge=0, le=1000, description="Hard braking events recorded per 100km")
    hard_acceleration_events: int = Field(..., ge=0, le=1000, description="Hard acceleration events recorded per 100km")
    driving_hours: float = Field(..., ge=0, le=50000, description="Operational driving hours")

    class Config:
        json_schema_extra = {
            "example": {
                "vehicle_id": "VH-9021-AUTO",
                "vehicle_type": "Sedan",
                "engine_type": "Petrol",
                "vehicle_age": 3.2,
                "mileage": 42500.0,
                "engine_temperature": 91.5,
                "rpm": 2200.0,
                "engine_load": 38.0,
                "battery_voltage": 12.6,
                "oil_condition": 78.0,
                "brake_wear": 32.0,
                "tyre_pressure": 32.8,
                "service_count": 4,
                "distance_since_service": 5200.0,
                "average_speed": 48.0,
                "hard_braking_events": 2,
                "hard_acceleration_events": 1,
                "driving_hours": 3.5,
            }
        }


class ComponentHealth(BaseModel):
    engine: float = Field(..., ge=0, le=100, description="Engine health score (0-100)")
    battery: float = Field(..., ge=0, le=100, description="Battery health score (0-100)")
    brakes: float = Field(..., ge=0, le=100, description="Brake health score (0-100)")
    tyres: float = Field(..., ge=0, le=100, description="Tyre health score (0-100)")


class FailureProbabilities(BaseModel):
    engine: float = Field(..., ge=0.0, le=100.0, description="Engine failure probability (0.0% to 100.0%)")
    battery: float = Field(..., ge=0.0, le=100.0, description="Battery failure probability (0.0% to 100.0%)")
    brakes: float = Field(..., ge=0.0, le=100.0, description="Brake failure probability (0.0% to 100.0%)")
    tyres: float = Field(..., ge=0.0, le=100.0, description="Tyre failure probability (0.0% to 100.0%)")


class FailureRiskLevels(BaseModel):
    engine: Literal["Low", "Medium", "High", "Critical"] = "Low"
    battery: Literal["Low", "Medium", "High", "Critical"] = "Low"
    brakes: Literal["Low", "Medium", "High", "Critical"] = "Low"
    tyres: Literal["Low", "Medium", "High", "Critical"] = "Low"


class MaintenanceRecommendation(BaseModel):
    id: str
    component: str
    action: str
    urgency: Literal["Routine", "Recommended", "Urgent", "Critical"]
    explanation: str
    estimated_distance_remaining_km: float


class PredictionOutput(BaseModel):
    """
    Output schema returned by POST /api/predict.
    """
    overall_health_score: float = Field(..., ge=0, le=100, description="Composite vehicle health score (0-100)")
    
    # Component-level health scores (0-100)
    engine_health: float = Field(..., ge=0, le=100)
    battery_health: float = Field(..., ge=0, le=100)
    brake_health: float = Field(..., ge=0, le=100)
    tyre_health: float = Field(..., ge=0, le=100)
    
    # Failure-risk probabilities (0.0% - 100.0%)
    engine_failure_probability: float = Field(..., ge=0.0, le=100.0)
    battery_failure_probability: float = Field(..., ge=0.0, le=100.0)
    brake_failure_probability: float = Field(..., ge=0.0, le=100.0)
    tyre_failure_probability: float = Field(..., ge=0.0, le=100.0)
    
    # Risk categories
    failure_risks: FailureRiskLevels
    
    # Predictive maintenance estimate
    estimated_maintenance_distance: float = Field(..., description="Estimated distance in km until next required maintenance")
    
    # Recommendations
    recommendations: List[MaintenanceRecommendation]
    
    # Metadata
    model_version: str = "2.0.0-random-forest"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    vehicle_id: str


class VehiclePreset(BaseModel):
    id: str
    name: str
    category: str
    description: str
    data: VehicleTelemetryInput
