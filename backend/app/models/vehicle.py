"""
SQLAlchemy ORM models for AutoPredict AI SQLite database.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class PredictionRecord(Base):
    """
    Stores historical vehicle telemetry predictions for trend analysis and audit trails.
    """
    __tablename__ = "prediction_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    vehicle_id = Column(String(64), index=True, nullable=False)
    vehicle_type = Column(String(32), default="Sedan")
    engine_type = Column(String(32), default="Petrol")
    mileage = Column(Float, nullable=False)
    
    # Health Scores
    overall_health_score = Column(Float, nullable=False)
    engine_health = Column(Float, nullable=False)
    battery_health = Column(Float, nullable=False)
    brake_health = Column(Float, nullable=False)
    tyre_health = Column(Float, nullable=False)
    
    # Failure Probabilities
    engine_failure_probability = Column(Float, nullable=False)
    battery_failure_probability = Column(Float, nullable=False)
    brake_failure_probability = Column(Float, nullable=False)
    tyre_failure_probability = Column(Float, nullable=False)
    
    # Estimates
    estimated_maintenance_distance = Column(Float, nullable=False)
    
    # JSON payload storage
    telemetry_json = Column(Text, nullable=True)
    recommendations_json = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "vehicle_type": self.vehicle_type,
            "engine_type": self.engine_type,
            "mileage": self.mileage,
            "overall_health_score": self.overall_health_score,
            "engine_health": self.engine_health,
            "battery_health": self.battery_health,
            "brake_health": self.brake_health,
            "tyre_health": self.tyre_health,
            "engine_failure_probability": self.engine_failure_probability,
            "battery_failure_probability": self.battery_failure_probability,
            "brake_failure_probability": self.brake_failure_probability,
            "tyre_failure_probability": self.tyre_failure_probability,
            "estimated_maintenance_distance": self.estimated_maintenance_distance,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "timestamp": self.created_at.isoformat() if self.created_at else None,
        }
