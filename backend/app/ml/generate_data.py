"""
AutoPredict AI - Synthetic Vehicle Telemetry & Health Dataset Generator.

NOTE FOR ACADEMIC / PORTFOLIO USE:
This dataset is programmatically generated and simulated using physical & engineering
degradation models. It is designed for machine learning prototyping, feature modeling,
and demonstration purposes, and is NOT intended for real-world automotive safety-critical decisions.
"""

import os
from pathlib import Path
import numpy as np
import pandas as pd

# Set random seed for reproducibility
np.random.seed(42)

NUM_SAMPLES = 5000

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_CSV = DATA_DIR / "vehicle_data.csv"


def generate_vehicle_dataset(n_samples: int = NUM_SAMPLES) -> pd.DataFrame:
    print(f"[Data Generator] Generating {n_samples:,} realistic vehicle telemetry records...")

    # 1. Vehicle base characteristics
    vehicle_types = ["Sedan", "SUV", "Truck", "Hatchback", "Coupe"]
    v_type_weights = [0.35, 0.30, 0.15, 0.15, 0.05]
    vehicle_type = np.random.choice(vehicle_types, size=n_samples, p=v_type_weights)

    engine_types = ["Petrol", "Diesel", "Hybrid", "Electric"]
    e_type_weights = [0.45, 0.30, 0.15, 0.10]
    engine_type = np.random.choice(engine_types, size=n_samples, p=e_type_weights)

    # Vehicle age: gamma distribution (0.5 to 14 years, average ~4.2 years)
    vehicle_age = np.round(np.clip(np.random.gamma(shape=3.0, scale=1.4, size=n_samples), 0.5, 15.0), 1)

    # Mileage: strongly correlated with age (~14,000 km/year ± variance)
    annual_mileage = np.random.normal(loc=14000, scale=3500, size=n_samples)
    annual_mileage = np.clip(annual_mileage, 6000, 26000)
    mileage = np.round(np.clip(vehicle_age * annual_mileage + np.random.normal(0, 4000, size=n_samples), 5000, 280000), 0)

    # 2. Driving behavior
    average_speed = np.round(np.clip(np.random.normal(loc=52, scale=14, size=n_samples), 25, 110), 1)
    driving_hours = np.round(np.clip(np.random.gamma(shape=2.5, scale=1.5, size=n_samples), 1.0, 10.0), 1)

    # Aggressive driving events: some drivers are aggressive, trucks/coupes have distinct profiles
    base_aggression = np.random.exponential(scale=2.5, size=n_samples)
    hard_braking_events = np.round(np.clip(base_aggression + np.random.poisson(lam=1.5, size=n_samples), 0, 22)).astype(int)
    hard_acceleration_events = np.round(np.clip(base_aggression * 0.9 + np.random.poisson(lam=1.2, size=n_samples), 0, 20)).astype(int)

    # 3. Engine / Powertrain sensors
    # Nominal temperature 88-95°C. Elevated if engine load or age is high, electric motors run cooler
    base_temp = np.random.normal(loc=91.5, scale=4.0, size=n_samples)
    is_electric = (engine_type == "Electric")
    base_temp[is_electric] = np.random.normal(loc=62.0, scale=5.0, size=np.sum(is_electric))

    # Overheating events correlated with high mileage & age
    overheat_prob = np.clip((mileage / 250000.0) * 0.25 + (vehicle_age / 15.0) * 0.15, 0.02, 0.40)
    has_overheat = np.random.rand(n_samples) < overheat_prob
    base_temp[has_overheat] += np.random.uniform(12.0, 24.0, size=np.sum(has_overheat))
    engine_temperature = np.round(np.clip(base_temp, 50.0, 120.0), 1)

    # Engine load: 20-85%. Trucks and heavy SUVs carry higher load
    truck_mask = np.isin(vehicle_type, ["Truck", "SUV"])
    load_mean = np.where(truck_mask, 52.0, 38.0)
    engine_load = np.round(np.clip(np.random.normal(loc=load_mean, scale=12.0) + (hard_acceleration_events * 0.8), 15.0, 95.0), 1)

    # RPM: correlated with average speed & acceleration
    rpm_mean = 1800 + (average_speed * 12.0) + (hard_acceleration_events * 45.0)
    rpm = np.round(np.clip(np.random.normal(loc=rpm_mean, scale=250.0), 800, 5800), 0)

    # 4. Battery sensor
    # 12V terminal voltage: nominal 12.4-12.8V resting. Alternator charging: 13.8-14.4V
    # Older cars with degraded batteries dip below 11.9V
    base_voltage = np.random.normal(loc=12.55, scale=0.35, size=n_samples)
    battery_age_degradation = (vehicle_age / 15.0) * 0.65
    degraded_battery = (np.random.rand(n_samples) < (vehicle_age / 12.0) * 0.35)
    base_voltage[degraded_battery] -= np.random.uniform(0.6, 1.2, size=np.sum(degraded_battery))
    battery_voltage = np.round(np.clip(base_voltage - battery_age_degradation, 10.8, 14.5), 2)

    # 5. Maintenance & Component wear
    service_count = np.round(np.clip(mileage / 12000.0 + np.random.normal(0, 1, size=n_samples), 1, 25)).astype(int)
    distance_since_service = np.round(np.clip(np.random.exponential(scale=6500.0, size=n_samples) + 400.0, 300.0, 24000.0), 0)

    # Oil condition: decays as distance_since_service increases
    oil_decay = (distance_since_service / 12000.0) * 65.0 + (mileage / 300000.0) * 20.0
    oil_condition = np.round(np.clip(100.0 - oil_decay + np.random.normal(0, 6, size=n_samples), 5.0, 100.0), 1)
    oil_condition[is_electric] = 100.0  # Electric vehicles do not require motor oil

    # Brake wear: increases with mileage, heavy vehicles, and hard braking events
    base_brake_cycle = (mileage % 45000.0) / 45000.0 * 65.0
    brake_stress = (hard_braking_events * 2.2) + np.where(truck_mask, 10.0, 0.0)
    brake_wear = np.round(np.clip(base_brake_cycle + brake_stress + np.random.normal(0, 5, size=n_samples), 5.0, 98.0), 1)

    # Tyre pressure: nominal 32-35 PSI. Decays with neglected maintenance
    pressure_drift = (distance_since_service / 15000.0) * 5.0
    tyre_pressure = np.round(np.clip(np.random.normal(loc=33.2, scale=2.5, size=n_samples) - pressure_drift, 20.0, 44.0), 1)

    # ----------------------------------------------------------------------
    # 6. Physical Ground-Truth Target Modeling
    # ----------------------------------------------------------------------

    # A. Engine Failure (0 or 1):
    # Driven by engine overheat (>102°C), depleted oil (<35%), high load and mileage
    engine_hazard_score = (
        np.maximum(0, engine_temperature - 98.0) * 2.8 +
        np.maximum(0, 45.0 - oil_condition) * 1.5 +
        np.maximum(0, engine_load - 75.0) * 0.8 +
        (mileage / 200000.0) * 15.0 +
        (hard_acceleration_events * 1.2)
    )
    if np.any(is_electric):
        engine_hazard_score[is_electric] *= 0.25  # EV motors have fewer failure modes
    engine_failure_prob = 1.0 / (1.0 + np.exp(-(engine_hazard_score - 32.0) / 7.5))
    engine_failure = (np.random.rand(n_samples) < engine_failure_prob).astype(int)

    # B. Battery Failure (0 or 1):
    # Driven by low voltage (<12.0V), vehicle age > 4 yrs, and high mileage
    battery_hazard_score = (
        np.maximum(0, 12.2 - battery_voltage) * 45.0 +
        np.maximum(0, vehicle_age - 3.0) * 5.5 +
        (mileage / 200000.0) * 10.0
    )
    battery_failure_prob = 1.0 / (1.0 + np.exp(-(battery_hazard_score - 25.0) / 6.0))
    battery_failure = (np.random.rand(n_samples) < battery_failure_prob).astype(int)

    # C. Brake Failure (0 or 1):
    # Driven by brake wear (>70%), hard braking events, and vehicle load
    brake_hazard_score = (
        np.maximum(0, brake_wear - 60.0) * 2.4 +
        (hard_braking_events * 2.5) +
        (distance_since_service / 12000.0) * 12.0
    )
    brake_failure_prob = 1.0 / (1.0 + np.exp(-(brake_hazard_score - 35.0) / 7.0))
    brake_failure = (np.random.rand(n_samples) < brake_failure_prob).astype(int)

    # D. Tyre Failure (0 or 1):
    # Driven by pressure deviation (|pressure - 33| > 5), mileage, hard braking
    pressure_delta = np.abs(tyre_pressure - 33.0)
    tyre_hazard_score = (
        np.maximum(0, pressure_delta - 3.5) * 6.5 +
        ((mileage % 50000.0) / 50000.0) * 25.0 +
        (hard_braking_events * 1.5)
    )
    tyre_failure_prob = 1.0 / (1.0 + np.exp(-(tyre_hazard_score - 28.0) / 6.5))
    tyre_failure = (np.random.rand(n_samples) < tyre_failure_prob).astype(int)

    # E. Overall Health Score (0 to 100):
    # Composite penalty calculated from individual component states
    penalties = (
        (100.0 - oil_condition) * 0.25 +
        brake_wear * 0.30 +
        np.maximum(0, 12.4 - battery_voltage) * 22.0 +
        np.maximum(0, engine_temperature - 94.0) * 1.6 +
        pressure_delta * 2.0 +
        (distance_since_service / 10000.0) * 8.0 +
        (vehicle_age / 12.0) * 10.0
    )
    overall_health_score = np.round(np.clip(100.0 - penalties + np.random.normal(0, 2.5, size=n_samples), 8.0, 99.0), 1)

    # F. Maintenance Distance (km remaining until service recommended):
    # Based on distance since service, minimum component margin, and overall health
    max_service_interval = 12000.0
    remaining_service_km = np.maximum(200.0, max_service_interval - distance_since_service)
    remaining_brake_km = np.maximum(150.0, (100.0 - brake_wear) * 160.0)
    maintenance_distance = np.round(
        np.clip(
            np.minimum(remaining_service_km, remaining_brake_km) * (overall_health_score / 100.0) +
            np.random.normal(0, 150, size=n_samples),
            150.0,
            14000.0
        ),
        0
    )

    df = pd.DataFrame({
        "vehicle_age": vehicle_age,
        "mileage": mileage,
        "vehicle_type": vehicle_type,
        "engine_type": engine_type,
        "engine_temperature": engine_temperature,
        "rpm": rpm,
        "engine_load": engine_load,
        "battery_voltage": battery_voltage,
        "oil_condition": oil_condition,
        "brake_wear": brake_wear,
        "tyre_pressure": tyre_pressure,
        "service_count": service_count,
        "distance_since_service": distance_since_service,
        "average_speed": average_speed,
        "hard_braking_events": hard_braking_events,
        "hard_acceleration_events": hard_acceleration_events,
        "driving_hours": driving_hours,
        # Targets
        "overall_health_score": overall_health_score,
        "engine_failure": engine_failure,
        "battery_failure": battery_failure,
        "brake_failure": brake_failure,
        "tyre_failure": tyre_failure,
        "maintenance_distance": maintenance_distance,
    })

    df.to_csv(OUTPUT_CSV, index=False)
    print(f"[Data Generator] Successfully saved {len(df):,} records to {OUTPUT_CSV}")
    print(f"[Data Generator] Class balance check:")
    print(f"  - Engine failures:  {df['engine_failure'].sum()} ({df['engine_failure'].mean():.1%})")
    print(f"  - Battery failures: {df['battery_failure'].sum()} ({df['battery_failure'].mean():.1%})")
    print(f"  - Brake failures:   {df['brake_failure'].sum()} ({df['brake_failure'].mean():.1%})")
    print(f"  - Tyre failures:    {df['tyre_failure'].sum()} ({df['tyre_failure'].mean():.1%})")
    print(f"  - Mean Health:      {df['overall_health_score'].mean():.1f} / 100")
    print(f"  - Mean Maint Dist:  {df['maintenance_distance'].mean():.0f} km")

    return df


if __name__ == "__main__":
    generate_vehicle_dataset()
