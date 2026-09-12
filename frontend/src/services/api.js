/**
 * AutoPredict AI API Service
 * Connects frontend directly to the FastAPI ML backend.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initial Baseline Telemetry (Healthy Daily Driver)
export const DEFAULT_TELEMETRY = {
  vehicle_id: "VH-HEALTHY-01",
  vehicle_type: "Sedan",
  engine_type: "Petrol",
  vehicle_age: 1.5,
  mileage: 18500.0,
  engine_temperature: 91.0,
  rpm: 1950.0,
  engine_load: 28.0,
  battery_voltage: 12.65,
  oil_condition: 92.0,
  brake_wear: 18.0,
  tyre_pressure: 33.2,
  service_count: 2,
  distance_since_service: 2100.0,
  average_speed: 54.0,
  hard_braking_events: 1,
  hard_acceleration_events: 1,
  driving_hours: 2.5,
};

export const api = {
  async checkHealth() {
    try {
      const response = await apiClient.get('/health');
      return { success: true, data: response.data };
    } catch (error) {
      console.warn('[API] Health check failed:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getPresets() {
    try {
      const response = await apiClient.get('/presets');
      return response.data;
    } catch (error) {
      console.warn('[API] Failed to fetch presets from backend:', error.message);
      return [];
    }
  },

  async predict(telemetry) {
    try {
      const response = await apiClient.post('/predict', telemetry);
      return response.data;
    } catch (error) {
      console.error('[API] Prediction request failed:', error);
      // Do not silently fall back to fake predictions.
      throw new Error(
        error.response?.data?.detail ||
        "Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running."
      );
    }
  },

  async getHistory(vehicleId = null, limit = 20) {
    try {
      const params = {};
      if (vehicleId) params.vehicle_id = vehicleId;
      if (limit) params.limit = limit;
      const response = await apiClient.get('/history', { params });
      return response.data || [];
    } catch (error) {
      console.warn('[API] History fetch failed:', error.message);
      throw error;
    }
  },

  async getMetrics() {
    try {
      const response = await apiClient.get('/metrics');
      return response.data;
    } catch (error) {
      console.warn('[API] Metrics fetch failed:', error.message);
      return null;
    }
  },
};
