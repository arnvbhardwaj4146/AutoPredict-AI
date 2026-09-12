"""
Pre-configured simulated vehicle telemetry presets for testing and demonstrations.

Features the 3 primary scenarios requested for model verification:
1. Healthy Daily Driver (low mileage, normal sensors, recent service, low risks)
2. High Mileage Vehicle (older vehicle, moderate wear, longer interval since service)
3. High Risk Vehicle (high mileage, overheat, low battery, worn brakes, abnormal tyre pressure)
"""
from typing import List, Dict
from app.schemas.vehicle import VehicleTelemetryInput, VehiclePreset

SIMULATED_PRESETS: List[Dict] = [
    {
        "id": "preset_healthy_daily",
        "name": "Healthy Daily Driver",
        "category": "Optimal",
        "description": "Relatively low mileage (18.5k km), normal operating temperature, healthy 12.65V battery, low brake wear (18%), and recent routine service.",
        "data": {
            "vehicle_id": "VH-HEALTHY-01",
            "vehicle_type": "Sedan",
            "engine_type": "Petrol",
            "vehicle_age": 1.5,
            "mileage": 18500.0,
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
    },
    {
        "id": "preset_high_mileage",
        "name": "High Mileage Vehicle",
        "category": "Moderate",
        "description": "Older vehicle (6.8 yrs, 142k km) with moderate component wear (52% brake wear, 55% oil life) and longer operational distance since last service.",
        "data": {
            "vehicle_id": "VH-HIGHMIL-02",
            "vehicle_type": "Sedan",
            "engine_type": "Diesel",
            "vehicle_age": 6.8,
            "mileage": 142000.0,
            "engine_temperature": 93.5,
            "rpm": 2200.0,
            "engine_load": 48.0,
            "battery_voltage": 12.25,
            "oil_condition": 55.0,
            "brake_wear": 52.0,
            "tyre_pressure": 32.0,
            "service_count": 11,
            "distance_since_service": 8900.0,
            "average_speed": 58.0,
            "hard_braking_events": 4,
            "hard_acceleration_events": 3,
            "driving_hours": 5.0,
        }
    },
    {
        "id": "preset_high_risk",
        "name": "High Risk Vehicle",
        "category": "Critical",
        "description": "Severe risk vehicle (165k km) with engine overheat (109.5°C), low battery (11.6V), critical brake wear (88%), underinflated tyres (23.5 PSI), and 16 hard braking events.",
        "data": {
            "vehicle_id": "VH-HIGHRISK-03",
            "vehicle_type": "SUV",
            "engine_type": "Diesel",
            "vehicle_age": 7.2,
            "mileage": 165000.0,
            "engine_temperature": 109.5,
            "rpm": 3400.0,
            "engine_load": 84.0,
            "battery_voltage": 11.60,
            "oil_condition": 22.0,
            "brake_wear": 88.0,
            "tyre_pressure": 23.5,
            "service_count": 8,
            "distance_since_service": 16500.0,
            "average_speed": 42.0,
            "hard_braking_events": 16,
            "hard_acceleration_events": 12,
            "driving_hours": 8.0,
        }
    },
    {
        "id": "preset_custom",
        "name": "Custom Vehicle",
        "category": "Custom",
        "description": "Configurable standard baseline profile with balanced parameters ready for manual interactive configuration.",
        "data": {
            "vehicle_id": "VH-CUSTOM-01",
            "vehicle_type": "Sedan",
            "engine_type": "Petrol",
            "vehicle_age": 3.0,
            "mileage": 45000.0,
            "engine_temperature": 90.0,
            "rpm": 2000.0,
            "engine_load": 35.0,
            "battery_voltage": 12.50,
            "oil_condition": 75.0,
            "brake_wear": 30.0,
            "tyre_pressure": 33.0,
            "service_count": 3,
            "distance_since_service": 4500.0,
            "average_speed": 50.0,
            "hard_braking_events": 2,
            "hard_acceleration_events": 2,
            "driving_hours": 3.0,
        }
    }
]


def get_presets() -> List[VehiclePreset]:
    presets = []
    for item in SIMULATED_PRESETS:
        presets.append(
            VehiclePreset(
                id=item["id"],
                name=item["name"],
                category=item["category"],
                description=item["description"],
                data=VehicleTelemetryInput(**item["data"])
            )
        )
    return presets


def get_preset_by_id(preset_id: str) -> VehiclePreset | None:
    for item in SIMULATED_PRESETS:
        if item["id"] == preset_id:
            return VehiclePreset(
                id=item["id"],
                name=item["name"],
                category=item["category"],
                description=item["description"],
                data=VehicleTelemetryInput(**item["data"])
            )
    return None
