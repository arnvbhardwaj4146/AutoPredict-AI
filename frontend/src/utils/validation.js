/**
 * AutoPredict AI - Telemetry Input Validation
 * Validates vehicle telemetry features against ML training bounds.
 */

export const VALIDATION_RULES = {
  vehicle_age: {
    min: 0,
    max: 30,
    label: 'Vehicle Age',
    unit: 'years',
    step: 0.1,
    description: 'Vehicle operational age',
  },
  mileage: {
    min: 0,
    max: 500000,
    label: 'Mileage',
    unit: 'km',
    step: 500,
    description: 'Total odometer reading',
  },
  vehicle_type: {
    allowed: ['Sedan', 'SUV', 'Truck', 'Hatchback', 'Coupe'],
    label: 'Vehicle Type',
  },
  engine_type: {
    allowed: ['Petrol', 'Diesel', 'Hybrid', 'Electric'],
    label: 'Engine Type',
  },
  engine_temperature: {
    min: 50,
    max: 150,
    label: 'Engine Temperature',
    unit: '°C',
    step: 0.5,
    description: 'Block/coolant temperature',
  },
  rpm: {
    min: 500,
    max: 8000,
    label: 'Engine RPM',
    unit: 'RPM',
    step: 50,
    description: 'Revolutions per minute',
  },
  engine_load: {
    min: 0,
    max: 100,
    label: 'Engine Load',
    unit: '%',
    step: 1,
    description: 'Engine work capacity usage',
  },
  battery_voltage: {
    min: 8,
    max: 15,
    label: 'Battery Voltage',
    unit: 'V',
    step: 0.05,
    description: '12V terminal voltage',
  },
  oil_condition: {
    min: 0,
    max: 100,
    label: 'Oil Condition',
    unit: '%',
    step: 1,
    description: 'Lubrication life remaining',
  },
  brake_wear: {
    min: 0,
    max: 100,
    label: 'Brake Wear',
    unit: '%',
    step: 1,
    description: 'Pad friction surface wear',
  },
  tyre_pressure: {
    min: 15,
    max: 50,
    label: 'Tyre Pressure',
    unit: 'PSI',
    step: 0.5,
    description: 'Cold inflation pressure',
  },
  service_count: {
    min: 0,
    max: 30,
    label: 'Service Count',
    unit: 'services',
    step: 1,
    description: 'Lifetime maintenance services',
  },
  distance_since_service: {
    min: 0,
    max: 50000,
    label: 'Distance Since Service',
    unit: 'km',
    step: 100,
    description: 'Distance driven since last routine service',
  },
  average_speed: {
    min: 0,
    max: 200,
    label: 'Average Speed',
    unit: 'km/h',
    step: 1,
    description: 'Mean operating velocity',
  },
  hard_braking_events: {
    min: 0,
    max: 500,
    label: 'Hard Braking Events',
    unit: 'events/100km',
    step: 1,
    description: 'Deceleration triggers per 100km',
  },
  hard_acceleration_events: {
    min: 0,
    max: 500,
    label: 'Hard Acceleration Events',
    unit: 'events/100km',
    step: 1,
    description: 'Rapid throttle triggers per 100km',
  },
  driving_hours: {
    min: 0,
    max: 20000,
    label: 'Driving Hours',
    unit: 'hours',
    step: 0.5,
    description: 'Operational engine hours',
  },
};

export const CUSTOM_PRESET_DEFAULT = {
  vehicle_id: 'VH-CUSTOM-01',
  vehicle_type: 'Sedan',
  engine_type: 'Petrol',
  vehicle_age: 3.0,
  mileage: 45000.0,
  engine_temperature: 90.0,
  rpm: 2000.0,
  engine_load: 35.0,
  battery_voltage: 12.50,
  oil_condition: 75.0,
  brake_wear: 30.0,
  tyre_pressure: 33.0,
  service_count: 3,
  distance_since_service: 4500.0,
  average_speed: 50.0,
  hard_braking_events: 2,
  hard_acceleration_events: 2,
  driving_hours: 3.0,
};

/**
 * Validates an entire telemetry object.
 * Returns a dictionary of errors: { [field]: errorMessage }
 */
export function validateVehicleTelemetry(telemetry) {
  const errors = {};
  if (!telemetry || typeof telemetry !== 'object') {
    return { global: 'Invalid telemetry object.' };
  }

  for (const [key, rule] of Object.entries(VALIDATION_RULES)) {
    const val = telemetry[key];

    if (rule.allowed) {
      if (!val || !rule.allowed.includes(val)) {
        errors[key] = `Please select a valid ${rule.label} (${rule.allowed.join(', ')}).`;
      }
      continue;
    }

    if (val === undefined || val === null || val === '' || isNaN(Number(val))) {
      errors[key] = `${rule.label} is required and must be a valid number.`;
      continue;
    }

    const num = Number(val);
    if (num < rule.min || num > rule.max) {
      errors[key] = `${rule.label} must be between ${rule.min.toLocaleString()} and ${rule.max.toLocaleString()} ${rule.unit}.`;
    }
  }

  return errors;
}

/**
 * Validates a single telemetry field.
 * Returns an error string or null if valid.
 */
export function validateField(key, value) {
  const rule = VALIDATION_RULES[key];
  if (!rule) return null;

  if (rule.allowed) {
    if (!value || !rule.allowed.includes(value)) {
      return `Please select a valid ${rule.label}.`;
    }
    return null;
  }

  if (value === undefined || value === null || value === '' || isNaN(Number(value))) {
    return `${rule.label} is required.`;
  }

  const num = Number(value);
  if (num < rule.min || num > rule.max) {
    return `${rule.label} must be between ${rule.min.toLocaleString()} and ${rule.max.toLocaleString()} ${rule.unit}.`;
  }

  return null;
}
