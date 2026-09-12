import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, DEFAULT_TELEMETRY } from '../services/api';
import { CUSTOM_PRESET_DEFAULT, validateVehicleTelemetry } from '../utils/validation';

export const PredictionContext = createContext(null);

export function PredictionProvider({ children }) {
  const [currentVehicleInput, setCurrentVehicleInput] = useState(DEFAULT_TELEMETRY);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [previousPrediction, setPreviousPrediction] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState('preset_healthy_daily');
  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState(null);
  const [presets, setPresets] = useState([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Initialize and run initial prediction on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setApiError(null);
        // 1. Health check
        const health = await api.checkHealth();
        if (!mounted) return;

        if (!health.success) {
          setBackendConnected(false);
          setApiError('Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running.');
          return;
        }

        setBackendConnected(true);

        // 2. Fetch presets
        const fetchedPresets = await api.getPresets();
        if (!mounted) return;

        let initialData = DEFAULT_TELEMETRY;
        if (fetchedPresets && fetchedPresets.length > 0) {
          setPresets(fetchedPresets);
          const healthyPreset = fetchedPresets.find((p) => p.id === 'preset_healthy_daily') || fetchedPresets[0];
          if (healthyPreset) {
            setSelectedScenario(healthyPreset.id);
            setCurrentVehicleInput(healthyPreset.data);
            initialData = healthyPreset.data;
          }
        }

        // 3. Initial baseline prediction on boot
        setIsPredicting(true);
        const initialPred = await api.predict(initialData);
        if (mounted && initialPred) {
          setLatestPrediction(initialPred);
          setLastAnalysisTimestamp(new Date().toLocaleTimeString());
        }
      } catch (err) {
        if (mounted) {
          setApiError(err.message || 'Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running.');
        }
      } finally {
        if (mounted) setIsPredicting(false);
      }
    }

    initialize();

    // Periodic heartbeat check
    const interval = setInterval(async () => {
      const res = await api.checkHealth();
      if (mounted) {
        setBackendConnected(res.success);
        if (!res.success) {
          setApiError('Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running.');
        } else if (apiError) {
          setApiError(null);
        }
      }
    }, 20000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Run AI Analysis: validates data, sends to POST /api/predict, updates shared state
  const runAnalysis = useCallback(async (dataToAnalyze = null) => {
    const data = dataToAnalyze || currentVehicleInput;
    
    // 1. Validate form fields
    const errors = validateVehicleTelemetry(data);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return { success: false, errors };
    }

    setValidationErrors({});
    setIsPredicting(true);
    setApiError(null);

    try {
      // 2. Call FastAPI backend ML models
      const result = await api.predict(data);
      if (result) {
        setPreviousPrediction(latestPrediction);
        setLatestPrediction(result);
        setCurrentVehicleInput(data);
        setLastAnalysisTimestamp(new Date().toLocaleTimeString());
        setBackendConnected(true);
        return { success: true, data: result };
      }
    } catch (err) {
      console.error('Prediction error:', err);
      const errMsg = err.message || 'Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running.';
      setApiError(errMsg);
      setBackendConnected(false);
      return { success: false, error: errMsg };
    } finally {
      setIsPredicting(false);
    }
  }, [currentVehicleInput, latestPrediction]);

  // Select a preset scenario: populates form, does NOT call API automatically
  const selectScenario = useCallback((presetId) => {
    setSelectedScenario(presetId);
    setValidationErrors({});

    if (presetId === 'preset_custom') {
      setCurrentVehicleInput({ ...CUSTOM_PRESET_DEFAULT });
      return;
    }

    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setCurrentVehicleInput({ ...found.data });
    }
  }, [presets]);

  // Update a single vehicle field
  const updateVehicleField = useCallback((field, value) => {
    setCurrentVehicleInput((prev) => {
      const updated = {
        ...prev,
        [field]: typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== ''
          ? Number(value)
          : value,
      };
      return updated;
    });

    // Clear field-specific validation error if user is typing
    setValidationErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const value = {
    currentVehicleInput,
    latestPrediction,
    previousPrediction,
    selectedScenario,
    lastAnalysisTimestamp,
    presets,
    isPredicting,
    backendConnected,
    apiError,
    validationErrors,
    setValidationErrors,
    setCurrentVehicleInput,
    runAnalysis,
    selectScenario,
    updateVehicleField,
  };

  return (
    <PredictionContext.Provider value={value}>
      {children}
    </PredictionContext.Provider>
  );
}

export function usePrediction() {
  const context = useContext(PredictionContext);
  if (!context) {
    throw new Error('usePrediction must be used within a PredictionProvider');
  }
  return context;
}
