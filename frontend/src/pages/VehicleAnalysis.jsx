import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  RefreshCw,
  Car,
  Activity,
  Battery,
  Disc,
  Compass,
  Wrench,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Gauge,
} from 'lucide-react';
import { VALIDATION_RULES, validateVehicleTelemetry } from '../utils/validation';
import { getHealthStatus, getHealthColor } from '../utils/formatters';

export const VehicleAnalysis = ({
  telemetry,
  onChangeTelemetry,
  onRunPredict,
  onResetTelemetry,
  isPredicting,
  prediction,
  lastAnalysisTimestamp,
  selectedPresetId,
  onSelectPreset,
  onNavigate,
  presets = [],
}) => {
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Handle manual input change
  const handleFieldChange = (field, rawValue) => {
    let value = rawValue;
    if (VALIDATION_RULES[field]?.allowed) {
      value = rawValue;
    } else if (typeof rawValue === 'string') {
      if (rawValue.trim() === '') {
        value = '';
      } else {
        const parsed = Number(rawValue);
        value = isNaN(parsed) ? rawValue : parsed;
      }
    }

    onChangeTelemetry({
      ...telemetry,
      [field]: value,
    });

    // Clear field-specific error as user types
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Preset Selection: populates form, clears errors, DOES NOT call prediction API
  const handlePresetClick = (presetId) => {
    setErrors({});
    setSuccessMessage(null);
    setSubmitError(null);
    if (onSelectPreset) {
      onSelectPreset(presetId);
    }
  };

  // Run AI Analysis Handler
  const handleRunAnalysis = async () => {
    setSuccessMessage(null);
    setSubmitError(null);

    // 1. Validate all fields
    const validationErrors = validateVehicleTelemetry(telemetry);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitError('Validation Failed: Please correct the highlighted fields before running analysis.');
      // Scroll to top of form or first error
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setErrors({});

    // 2. Call parent prediction runner
    try {
      const result = await onRunPredict();
      if (result !== false) {
        setSuccessMessage('AI Analysis successfully evaluated. Predictions updated across all dashboard views.');
      }
    } catch (err) {
      setSubmitError(err.message || 'Unable to connect to AutoPredict AI backend.');
    }
  };

  // Helper to render a numeric input field with label, units, slider, and validation error
  const renderNumericField = (field, icon = null) => {
    const rule = VALIDATION_RULES[field];
    if (!rule) return null;

    const val = telemetry[field] !== undefined ? telemetry[field] : '';
    const hasError = !!errors[field];
    const numVal = typeof val === 'number' && !isNaN(val) ? val : rule.min;

    return (
      <div className="space-y-1.5" key={field}>
        <div className="flex items-center justify-between">
          <label
            htmlFor={`input-${field}`}
            className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            {icon}
            <span>{rule.label}</span>
          </label>
          <span className="text-[11px] font-mono text-slate-400">
            [{rule.min.toLocaleString()} – {rule.max.toLocaleString()} {rule.unit}]
          </span>
        </div>

        {/* Input + Unit Group */}
        <div className="flex rounded-lg overflow-hidden border transition-colors shadow-sm focus-within:ring-1 focus-within:ring-cyan-500 border-slate-700 bg-slate-900">
          <input
            id={`input-${field}`}
            type="number"
            step={rule.step || 'any'}
            value={val}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            aria-invalid={hasError}
            aria-describedby={hasError ? `error-${field}` : undefined}
            className={`w-full bg-transparent px-3 py-2 text-xs font-mono text-white focus:outline-none ${
              hasError ? 'text-rose-300 bg-rose-950/20' : ''
            }`}
          />
          <span className="px-3 py-2 bg-slate-800/80 border-l border-slate-700/80 text-xs font-mono text-slate-400 shrink-0 flex items-center">
            {rule.unit}
          </span>
        </div>

        {/* Tactile Slider for immediate visual interaction */}
        <div className="pt-1">
          <input
            type="range"
            min={rule.min}
            max={rule.max}
            step={rule.step || 1}
            value={Math.min(rule.max, Math.max(rule.min, numVal))}
            onChange={(e) => handleFieldChange(field, Number(e.target.value))}
            aria-label={`${rule.label} slider`}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Validation Error Message */}
        {hasError && (
          <p id={`error-${field}`} className="text-xs text-rose-400 font-mono mt-1 flex items-center gap-1 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{errors[field]}</span>
          </p>
        )}
      </div>
    );
  };

  const healthStatus = prediction ? getHealthStatus(prediction.overall_health_score) : null;
  const healthColorObj = prediction ? getHealthColor(prediction.overall_health_score) : null;
  const healthColorHex = healthColorObj?.hex || '#06B6D4';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1 font-semibold">
            <Sliders className="w-3.5 h-3.5" />
            Telemetry Input & Interactive Calibration
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Vehicle Telemetry Configuration Form
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Select a preset scenario to populate standard configurations or manually calibrate the 17 parameters.
            Click <strong className="text-cyan-300">Run AI Analysis</strong> to evaluate against the trained Random Forest models.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onResetTelemetry}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleRunAnalysis}
            disabled={isPredicting}
            type="button"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs font-mono transition-all shadow-glow-cyan disabled:opacity-50 cursor-pointer"
          >
            {isPredicting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isPredicting ? 'Evaluating ML Models...' : 'Run AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Preset Scenario Selector Bar */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            Select Scenario Preset (Populates Form Fields)
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Does not auto-submit • Requires clicking "Run AI Analysis"
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'preset_healthy_daily', name: 'Healthy Daily Driver', badge: 'Optimal', tagColor: 'emerald', desc: '1.5 yrs, 18.5k km, 91°C, 12.65V' },
            { id: 'preset_high_mileage', name: 'High Mileage Vehicle', badge: 'Moderate', tagColor: 'amber', desc: '6.8 yrs, 142k km, 52% brake wear' },
            { id: 'preset_high_risk', name: 'High Risk Vehicle', badge: 'Critical', tagColor: 'rose', desc: '7.2 yrs, 165k km, 109.5°C overheat' },
            { id: 'preset_custom', name: 'Custom Vehicle', badge: 'Editable', tagColor: 'cyan', desc: 'Standard baseline ready for custom input' },
          ].map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-500/80 bg-cyan-950/20 shadow-glow-cyan'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-xs font-bold font-mono ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {preset.name}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                      preset.tagColor === 'emerald'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                        : preset.tagColor === 'rose'
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-900/60'
                        : preset.tagColor === 'amber'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-900/60'
                        : 'bg-cyan-950/60 text-cyan-400 border border-cyan-900/60'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono line-clamp-1">
                  {preset.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Status / Error Messages */}
      {submitError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-600/80 text-rose-200 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{submitError}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-600/80 text-emerald-200 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Analysis Summary Panel (Visible when prediction exists) */}
      {prediction && (
        <div className="glass-panel rounded-xl p-5 border border-cyan-500/40 bg-gradient-to-r from-slate-900/90 via-[#0C1527]/90 to-slate-900/90 space-y-4 shadow-glow-cyan">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                Latest AI Prediction Summary
              </span>
              <span
                className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase"
                style={{
                  color: healthColorHex,
                  backgroundColor: `${healthColorHex}20`,
                  border: `1px solid ${healthColorHex}40`,
                }}
              >
                {healthStatus} Health
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span>Last analyzed: <strong className="text-slate-200">{lastAnalysisTimestamp || 'Just now'}</strong></span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 font-semibold transition-all cursor-pointer"
                >
                  <span>View Full Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Overall Health</span>
              <span className="text-xl font-bold font-mono" style={{ color: healthColorHex }}>
                {Math.round(prediction.overall_health_score)} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Engine</span>
              <span className={`text-xl font-bold font-mono ${getHealthColor(prediction.engine_health).text}`}>
                {Math.round(prediction.engine_health)}%
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Battery</span>
              <span className={`text-xl font-bold font-mono ${getHealthColor(prediction.battery_health).text}`}>
                {Math.round(prediction.battery_health)}%
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Brakes</span>
              <span className={`text-xl font-bold font-mono ${getHealthColor(prediction.brake_health).text}`}>
                {Math.round(prediction.brake_health)}%
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Tyres</span>
              <span className={`text-xl font-bold font-mono ${getHealthColor(prediction.tyre_health).text}`}>
                {Math.round(prediction.tyre_health)}%
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Next Service</span>
              <span className="text-xl font-bold font-mono text-white">
                ~{Math.round(prediction.estimated_maintenance_distance).toLocaleString()} <span className="text-xs font-normal text-slate-400">km</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6 Grouped Cards in 2-Column Responsive Layout */}
      <form onSubmit={(e) => { e.preventDefault(); handleRunAnalysis(); }} className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Section 1: Vehicle Information */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80 mb-4">
              <Car className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200">
                1. Vehicle Information
              </h3>
            </div>

            <div className="space-y-4">
              {/* Vehicle ID */}
              <div className="space-y-1.5">
                <label htmlFor="input-vehicle_id" className="text-xs font-mono font-medium text-slate-300 block">
                  Vehicle Identifier
                </label>
                <input
                  id="input-vehicle_id"
                  type="text"
                  value={telemetry.vehicle_id || ''}
                  onChange={(e) => handleFieldChange('vehicle_id', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Categorical: Vehicle Type & Engine Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="input-vehicle_type" className="text-xs font-mono font-medium text-slate-300 block">
                    Vehicle Type
                  </label>
                  <select
                    id="input-vehicle_type"
                    value={telemetry.vehicle_type || 'Sedan'}
                    onChange={(e) => handleFieldChange('vehicle_type', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {VALIDATION_RULES.vehicle_type.allowed.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.vehicle_type && (
                    <p className="text-xs text-rose-400 font-mono mt-1">{errors.vehicle_type}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="input-engine_type" className="text-xs font-mono font-medium text-slate-300 block">
                    Engine Type
                  </label>
                  <select
                    id="input-engine_type"
                    value={telemetry.engine_type || 'Petrol'}
                    onChange={(e) => handleFieldChange('engine_type', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {VALIDATION_RULES.engine_type.allowed.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {errors.engine_type && (
                    <p className="text-xs text-rose-400 font-mono mt-1">{errors.engine_type}</p>
                  )}
                </div>
              </div>

              {/* Vehicle Age */}
              {renderNumericField('vehicle_age')}

              {/* Mileage */}
              {renderNumericField('mileage')}
            </div>
          </div>
        </div>

        {/* Section 2: Engine & Telemetry */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80 mb-4">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200">
                2. Engine & Telemetry
              </h3>
            </div>

            <div className="space-y-4">
              {renderNumericField('engine_temperature')}
              {renderNumericField('rpm')}
              {renderNumericField('engine_load')}
            </div>
          </div>
        </div>

        {/* Section 3: Battery */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80 mb-4">
              <Battery className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200">
                3. Battery & Electrical
              </h3>
            </div>

            <div className="space-y-4">
              {renderNumericField('battery_voltage')}
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 leading-relaxed">
                Terminal resting voltage (nominal 12.4V – 12.8V) evaluated against vehicle age to calculate cold cranking vulnerability and battery cell degradation.
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Component Condition */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80 mb-4">
              <Disc className="w-4 h-4 text-rose-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200">
                4. Component Condition
              </h3>
            </div>

            <div className="space-y-4">
              {renderNumericField('oil_condition')}
              {renderNumericField('brake_wear')}
              {renderNumericField('tyre_pressure')}
            </div>
          </div>
        </div>

        {/* Section 5: Maintenance History */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80 mb-4">
              <Wrench className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200">
                5. Maintenance History
              </h3>
            </div>

            <div className="space-y-4">
              {renderNumericField('service_count')}
              {renderNumericField('distance_since_service')}
            </div>
          </div>
        </div>

        {/* Section 6: Driving Behaviour */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80 mb-4">
              <Compass className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200">
                6. Driving Behaviour
              </h3>
            </div>

            <div className="space-y-4">
              {renderNumericField('average_speed')}
              {renderNumericField('hard_braking_events')}
              {renderNumericField('hard_acceleration_events')}
              {renderNumericField('driving_hours')}
            </div>
          </div>
        </div>

        {/* Form Action Footer (Span 2 columns) */}
        <div className="md:col-span-2 glass-panel rounded-xl p-5 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400">
            Ready to evaluate {Object.keys(VALIDATION_RULES).length} telemetry attributes via the FastAPI prediction engine.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onResetTelemetry}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-mono text-slate-300 transition-colors cursor-pointer"
            >
              Reset Inputs
            </button>
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isPredicting}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs font-mono transition-all shadow-glow-cyan disabled:opacity-50 cursor-pointer"
            >
              {isPredicting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isPredicting ? 'Evaluating ML Models...' : 'Run AI Analysis'}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default VehicleAnalysis;
