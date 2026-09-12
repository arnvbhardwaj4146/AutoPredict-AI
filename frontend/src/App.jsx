import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';
import Dashboard from './pages/Dashboard';
import VehicleAnalysis from './pages/VehicleAnalysis';
import FailurePrediction from './pages/FailurePrediction';
import Maintenance from './pages/Maintenance';
import Analytics from './pages/Analytics';
import { api, DEFAULT_TELEMETRY } from './services/api';
import { CUSTOM_PRESET_DEFAULT } from './utils/validation';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [telemetry, setTelemetry] = useState(DEFAULT_TELEMETRY);
  const [prediction, setPrediction] = useState(null);
  const [previousPrediction, setPreviousPrediction] = useState(null);
  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState(null);
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('preset_healthy_daily');
  const [isPredicting, setIsPredicting] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Initialize and run initial prediction on mount
  useEffect(() => {
    let mounted = true;

    async function initializeSystem() {
      try {
        setApiError(null);
        // 1. Check backend API health
        const healthRes = await api.checkHealth();
        if (!mounted) return;

        if (!healthRes.success) {
          setBackendConnected(false);
          setApiError("Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running.");
          return;
        }

        setBackendConnected(true);

        // 2. Fetch presets from backend
        const fetchedPresets = await api.getPresets();
        if (!mounted) return;

        let initialData = DEFAULT_TELEMETRY;
        if (fetchedPresets && fetchedPresets.length > 0) {
          setPresets(fetchedPresets);
          const healthyPreset = fetchedPresets.find((p) => p.id === 'preset_healthy_daily') || fetchedPresets[0];
          if (healthyPreset) {
            setSelectedPresetId(healthyPreset.id);
            setTelemetry(healthyPreset.data);
            initialData = healthyPreset.data;
          }
        }

        // 3. Immediately run initial baseline prediction through the live ML models
        setIsPredicting(true);
        const livePrediction = await api.predict(initialData);
        if (mounted && livePrediction) {
          setPrediction(livePrediction);
          setLastAnalysisTimestamp(new Date().toLocaleTimeString());
        }
      } catch (err) {
        if (mounted) {
          setApiError(err.message || "Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running.");
        }
      } finally {
        if (mounted) setIsPredicting(false);
      }
    }

    initializeSystem();

    // Periodic health check every 20 seconds
    const interval = setInterval(async () => {
      const res = await api.checkHealth();
      if (mounted) {
        setBackendConnected(res.success);
        if (!res.success) {
          setApiError("Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running.");
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

  // Handler for running prediction
  const handleRunPredict = async (customTelemetry = null) => {
    const dataToSend = customTelemetry || telemetry;
    setIsPredicting(true);
    setApiError(null);
    try {
      const result = await api.predict(dataToSend);
      if (result) {
        setPreviousPrediction(prediction);
        setPrediction(result);
        setLastAnalysisTimestamp(new Date().toLocaleTimeString());
        setBackendConnected(true);
        return result;
      }
    } catch (err) {
      console.error('Prediction API error:', err);
      const errMsg = err.message || "Unable to connect to AutoPredict AI backend. Please make sure the FastAPI server is running.";
      setApiError(errMsg);
      setBackendConnected(false);
      throw new Error(errMsg);
    } finally {
      setIsPredicting(false);
    }
  };

  // Handler for selecting a preset scenario: populates form, does NOT auto-call API
  const handleSelectPreset = (presetId) => {
    setSelectedPresetId(presetId);
    if (presetId === 'preset_custom') {
      setTelemetry({ ...CUSTOM_PRESET_DEFAULT });
      return;
    }
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setTelemetry({ ...found.data });
    }
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Title mapper
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'System Overview & Health Metrics';
      case 'analysis':
        return 'Interactive Telemetry & Sensor Config';
      case 'prediction':
        return 'Failure-Risk & Probability Breakdown';
      case 'maintenance':
        return 'Predictive Maintenance Action Schedule';
      case 'analytics':
        return 'Historical Telemetry & Lifecycle Analytics';
      default:
        return 'AutoPredict AI';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090D16] text-slate-100 bg-grid-pattern">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        vehicleId={telemetry?.vehicle_id}
        healthScore={prediction?.overall_health_score ?? 0}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden min-w-0">
        {/* Sticky Top Navigation */}
        <TopNav
          activeTitle={getTabTitle()}
          presets={presets}
          selectedPresetId={selectedPresetId}
          onSelectPreset={handleSelectPreset}
          onRunPredict={() => handleRunPredict(telemetry)}
          isPredicting={isPredicting}
          backendConnected={backendConnected}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Backend connection error banner if API is unreachable */}
            {apiError && (
              <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-600/80 text-rose-200 flex items-center justify-between gap-4 shadow-glow-crimson animate-pulse">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <div className="text-xs sm:text-sm font-medium">
                    {apiError}
                  </div>
                </div>
                <button
                  onClick={() => handleRunPredict(telemetry)}
                  disabled={isPredicting}
                  className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-500 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPredicting ? 'animate-spin' : ''}`} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                prediction={prediction}
                telemetry={telemetry}
                onNavigate={setActiveTab}
                onRunPredict={() => handleRunPredict(telemetry)}
                isPredicting={isPredicting}
              />
            )}

            {activeTab === 'analysis' && (
              <VehicleAnalysis
                telemetry={telemetry}
                onChangeTelemetry={setTelemetry}
                onRunPredict={() => handleRunPredict(telemetry)}
                onResetTelemetry={() => {
                  if (selectedPresetId === 'preset_custom') {
                    setTelemetry({ ...CUSTOM_PRESET_DEFAULT });
                  } else {
                    const found = presets.find((p) => p.id === selectedPresetId);
                    setTelemetry({ ...(found?.data || DEFAULT_TELEMETRY) });
                  }
                }}
                isPredicting={isPredicting}
                prediction={prediction}
                lastAnalysisTimestamp={lastAnalysisTimestamp}
                selectedPresetId={selectedPresetId}
                onSelectPreset={handleSelectPreset}
                onNavigate={setActiveTab}
                presets={presets}
              />
            )}

            {activeTab === 'prediction' && (
              <FailurePrediction
                prediction={prediction}
                previousPrediction={previousPrediction}
                telemetry={telemetry}
                onNavigate={setActiveTab}
                isPredicting={isPredicting}
                apiError={apiError}
                lastAnalysisTimestamp={lastAnalysisTimestamp}
              />
            )}

            {activeTab === 'maintenance' && (
              <Maintenance
                prediction={prediction}
                telemetry={telemetry}
                onNavigate={setActiveTab}
                isPredicting={isPredicting}
                apiError={apiError}
                lastAnalysisTimestamp={lastAnalysisTimestamp}
              />
            )}

            {activeTab === 'analytics' && (
              <Analytics
                prediction={prediction}
                previousPrediction={previousPrediction}
                telemetry={telemetry}
                onNavigate={setActiveTab}
                isPredicting={isPredicting}
                apiError={apiError}
                lastAnalysisTimestamp={lastAnalysisTimestamp}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
