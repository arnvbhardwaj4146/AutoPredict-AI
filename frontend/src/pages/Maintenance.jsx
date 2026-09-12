import React, { useState, useContext } from 'react';
import {
  Wrench,
  Clock,
  Gauge,
  Sliders,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Flame,
  BatteryCharging,
  Disc,
  LifeBuoy,
  Info,
  ShieldCheck,
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import { PredictionContext } from '../context/PredictionContext';
import {
  getHealthStatus,
  getHealthColor,
  getRiskFromProbability,
  getCompositeRisk,
  getRiskBadgeStyle,
} from '../utils/formatters';

export const Maintenance = (props) => {
  const context = useContext(PredictionContext);

  const prediction = props.prediction !== undefined ? props.prediction : context?.latestPrediction;
  const telemetry = props.telemetry !== undefined ? props.telemetry : context?.currentVehicleInput;
  const isPredicting = props.isPredicting !== undefined ? props.isPredicting : (context?.isPredicting || false);
  const apiError = props.apiError !== undefined ? props.apiError : (context?.apiError || null);
  const lastAnalysisTimestamp = props.lastAnalysisTimestamp !== undefined ? props.lastAnalysisTimestamp : (context?.lastAnalysisTimestamp || null);
  const onNavigate = props.onNavigate || context?.onNavigate;
  const [expandedWhy, setExpandedWhy] = useState({});

  const toggleWhy = (id) => {
    setExpandedWhy((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 1. Loading State
  if (isPredicting) {
    return (
      <div className="glass-panel rounded-xl p-12 border border-slate-800/80 text-center space-y-4 my-8">
        <div className="inline-flex p-4 rounded-full bg-cyan-950/40 border border-cyan-500/40 animate-pulse">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          Generating Maintenance Plan...
        </h3>
        <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
          Formulating predictive service intervals, component maintenance schedules, and urgency directives from current Random Forest health models.
        </p>
      </div>
    );
  }

  // 2. Error State
  if (apiError && !prediction) {
    return (
      <div className="glass-panel rounded-xl p-8 border border-rose-600/60 bg-rose-950/20 text-center space-y-4 my-8">
        <div className="inline-flex p-3 rounded-full bg-rose-950/60 border border-rose-500/60">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          Maintenance Analysis Unavailable
        </h3>
        <p className="text-xs font-mono text-rose-300 max-w-lg mx-auto leading-relaxed">
          {apiError}
        </p>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('analysis')}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-mono text-cyan-400 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Go to Vehicle Analysis</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Empty State
  if (!prediction) {
    return (
      <div className="glass-panel rounded-xl p-12 border border-slate-800/80 text-center space-y-4 my-8">
        <div className="inline-flex p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
          <Wrench className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          No Maintenance Plan Available
        </h3>
        <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
          Run an AI vehicle analysis to generate a personalized maintenance plan and predicted service intervals.
        </p>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('analysis')}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-glow-cyan inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Go to Vehicle Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const recommendations = prediction.recommendations || [];
  const maintDistance = prediction.estimated_maintenance_distance;
  const healthScore = prediction.overall_health_score;
  const healthStatus = getHealthStatus(healthScore);
  const healthColor = getHealthColor(healthScore);

  // Derive Overall Risk Level from unified getCompositeRisk
  const getNormProb = (val) => {
    const raw = Number(val || 0);
    return raw <= 1.0 && raw > 0 ? Number((raw * 100).toFixed(1)) : Number(raw.toFixed(1));
  };

  const brakeProb = getNormProb(prediction.brake_failure_probability);
  const batteryProb = getNormProb(prediction.battery_failure_probability);
  const tyreProb = getNormProb(prediction.tyre_failure_probability);
  const engineProb = getNormProb(prediction.engine_failure_probability);
  const maxCompProb = Math.max(brakeProb, batteryProb, tyreProb, engineProb);

  // Single unified source of truth composite risk rule
  const overallRisk = getCompositeRisk(prediction);

  // Priority counts
  const priorityCounts = {
    Critical: recommendations.filter((r) => r.urgency === 'Critical').length,
    Urgent: recommendations.filter((r) => r.urgency === 'Urgent').length,
    Recommended: recommendations.filter((r) => r.urgency === 'Recommended' || r.urgency === 'Soon').length,
    Routine: recommendations.filter((r) => r.urgency === 'Routine').length,
  };

  // Group recommendations into distance-based Timeline buckets (NOW, SOON, UPCOMING)
  const timelineBuckets = {
    now: recommendations.filter((r) => r.urgency === 'Critical' || r.estimated_distance_remaining_km <= 500),
    soon: recommendations.filter(
      (r) => (r.urgency === 'Urgent' || r.urgency === 'Recommended' || r.urgency === 'Soon') && r.estimated_distance_remaining_km > 500
    ),
    upcoming: recommendations.filter((r) => r.urgency === 'Routine' || r.estimated_distance_remaining_km > 3000),
  };

  // Subsystem Component Status
  const componentStatuses = [
    {
      name: 'Engine & Lubrication',
      icon: Flame,
      health: Math.round(prediction.engine_health),
      prob: engineProb,
      risk: prediction.failure_risks?.engine || getRiskFromProbability(engineProb),
      status: engineProb >= 60 ? 'Immediate Service Required' : engineProb >= 35 ? 'Inspection Due Soon' : 'Optimal Condition',
      action: engineProb >= 35 ? 'Diagnostic scan, oil service & cooling flush' : 'Standard scheduled oil & filter replacement',
      relevantSensor: `Temp: ${(telemetry?.engine_temperature ?? 91).toFixed(1)}°C • Oil: ${Math.round(telemetry?.oil_condition ?? 80)}%`,
    },
    {
      name: 'Battery & Starting',
      icon: BatteryCharging,
      health: Math.round(prediction.battery_health),
      prob: batteryProb,
      risk: prediction.failure_risks?.battery || getRiskFromProbability(batteryProb),
      status: batteryProb >= 60 ? 'Immediate Replacement Required' : batteryProb >= 35 ? 'Conductance Test Due Soon' : 'Nominal Charge Output',
      action: batteryProb >= 35 ? 'Battery conductance test & terminal check' : 'Routine terminal cleaning & alternator check',
      relevantSensor: `Voltage: ${(telemetry?.battery_voltage ?? 12.5).toFixed(2)}V • Age: ${(telemetry?.vehicle_age ?? 3).toFixed(1)} yrs`,
    },
    {
      name: 'Braking System',
      icon: Disc,
      health: Math.round(prediction.brake_health),
      prob: brakeProb,
      risk: prediction.failure_risks?.brakes || getRiskFromProbability(brakeProb),
      status: brakeProb >= 60 ? 'Critical Friction Failure Hazard' : brakeProb >= 35 ? 'Pad Inspection Required Soon' : 'Standard Operating Lining',
      action: brakeProb >= 35 ? 'Inspect pads, disc rotors & hydraulic fluid' : 'Routine brake pad thickness measurement',
      relevantSensor: `Pad wear: ${Math.round(telemetry?.brake_wear ?? 25)}% • Stops: ${telemetry?.hard_braking_events ?? 2}/100km`,
    },
    {
      name: 'Tyres & Wheel Assemblies',
      icon: LifeBuoy,
      health: Math.round(prediction.tyre_health),
      prob: tyreProb,
      risk: prediction.failure_risks?.tyres || getRiskFromProbability(tyreProb),
      status: tyreProb >= 60 ? 'Pressure/Tread Hazard' : tyreProb >= 35 ? 'Pressure Calibration Due' : 'Uniform Tread Profile',
      action: tyreProb >= 35 ? 'Adjust cold tyre pressure & check alignment' : 'Routine tyre rotation & balance check',
      relevantSensor: `Pressure: ${(telemetry?.tyre_pressure ?? 33).toFixed(1)} PSI • Speed: ${Math.round(telemetry?.average_speed ?? 50)} km/h`,
    },
  ];

  // Map each component's key telemetry for the "Why this is recommended" breakdown
  const getComponentContext = (compName) => {
    const lower = compName.toLowerCase();
    if (lower.includes('brake')) {
      return {
        factor: 'Brake Pad Lining Wear',
        value: `${Math.round(telemetry?.brake_wear ?? 25)}%`,
        prob: `${brakeProb}%`,
        risk: prediction.failure_risks?.brakes || getRiskFromProbability(brakeProb),
        association: 'The trained Random Forest model indicates that the current brake wear condition and deceleration frequency are associated with elevated brake friction degradation.',
      };
    }
    if (lower.includes('battery')) {
      return {
        factor: 'Terminal Resting Voltage & Age',
        value: `${(telemetry?.battery_voltage ?? 12.5).toFixed(2)}V (${(telemetry?.vehicle_age ?? 3).toFixed(1)} yrs)`,
        prob: `${batteryProb}%`,
        risk: prediction.failure_risks?.battery || getRiskFromProbability(batteryProb),
        association: 'The trained model indicates that resting cell voltage below nominal levels combined with battery age correlates with starting and cranking vulnerabilities.',
      };
    }
    if (lower.includes('engine')) {
      return {
        factor: 'Coolant Temperature & Engine Load',
        value: `${(telemetry?.engine_temperature ?? 91).toFixed(1)}°C (${Math.round(telemetry?.engine_load ?? 35)}% load)`,
        prob: `${engineProb}%`,
        risk: prediction.failure_risks?.engine || getRiskFromProbability(engineProb),
        association: 'The trained model indicates that elevated thermal saturation and sustained load are associated with accelerated powertrain oil breakdown and cooling strain.',
      };
    }
    if (lower.includes('tyre')) {
      return {
        factor: 'Cold Inflation Pressure',
        value: `${(telemetry?.tyre_pressure ?? 33).toFixed(1)} PSI`,
        prob: `${tyreProb}%`,
        risk: prediction.failure_risks?.tyres || getRiskFromProbability(tyreProb),
        association: 'The trained model indicates that deviation from recommended 32–35 PSI cold inflation correlates with increased sidewall strain and rolling friction.',
      };
    }
    return {
      factor: 'Composite System Health',
      value: `${Math.round(healthScore)} / 100`,
      prob: `${maxCompProb}%`,
      risk: overallRisk.level,
      association: 'The multi-model regression indicates that multi-subsystem wear indices warrant proactive multipoint inspection.',
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/60 text-cyan-400 border border-cyan-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AI Analysis Active
            </span>
            {telemetry?.vehicle_id && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {telemetry.vehicle_id} • {telemetry.vehicle_type || 'Sedan'} ({telemetry.engine_type || 'Petrol'})
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Maintenance Planner
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            AI-generated maintenance priorities based on current vehicle health.
          </p>
          <p className="text-[11px] text-slate-400 mt-2 italic max-w-3xl">
            Maintenance recommendations are model-generated guidance and should be verified against the vehicle manufacturer's service schedule and a qualified technician.
          </p>
        </div>

        <div className="text-left md:text-right shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Analysis Timestamp
          </span>
          <span className="text-xs font-mono text-cyan-300 font-semibold block mt-0.5">
            {lastAnalysisTimestamp || 'Active Session'}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">
            Model Pipeline: Scikit-Learn RF Ensemble
          </span>
        </div>
      </div>

      {/* 2. Maintenance Overview Banner */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-[#0C1527]/90 to-slate-900/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
              Predictive Maintenance Overview
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Current Odometer: <strong className="text-slate-200">{Math.round(telemetry?.mileage ?? 45000).toLocaleString()} km</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Vehicle Health Score
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono" style={{ color: healthColor.hex }}>
                {Math.round(healthScore * 10) / 10}
              </span>
              <span className="text-xs font-mono text-slate-400">/ 100</span>
            </div>
            <span className="text-[11px] font-mono font-medium block mt-1" style={{ color: healthColor.hex }}>
              {healthStatus} Health State
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Composite Risk Level
            </span>
            <div className="flex items-baseline justify-between">
              <span className={`text-3xl font-bold font-mono ${overallRisk.color === 'rose' ? 'text-rose-400' : overallRisk.color === 'orange' ? 'text-orange-400' : overallRisk.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {overallRisk.label}
              </span>
              <span className="text-xs font-mono text-slate-400">Status</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 block mt-1">
              {overallRisk.level === 'Low' ? 'Nominal Operating Envelope' : `${overallRisk.level} Risk Condition`}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Maintenance Due In
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono text-white">
                ~{Math.round(maintDistance).toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">km</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 block mt-1">
              Model-estimated maintenance window
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Action Directives
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono text-cyan-300">
                {recommendations.length}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {priorityCounts.Critical > 0 ? `${priorityCounts.Critical} Critical` : priorityCounts.Urgent > 0 ? `${priorityCounts.Urgent} Urgent` : 'Routine'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 block mt-1">
              Active priority tasks
            </span>
          </div>
        </div>
      </div>

      {/* 3. Urgency Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border transition-all ${priorityCounts.Critical > 0 ? 'bg-rose-950/30 border-rose-600/70 shadow-glow-crimson' : 'bg-slate-900/40 border-slate-800/80'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono font-bold uppercase text-rose-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${priorityCounts.Critical > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`} />
              Critical
            </span>
            <span className="text-lg font-bold font-mono text-rose-300">{priorityCounts.Critical}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 block">Immediate service required</span>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${priorityCounts.Urgent > 0 ? 'bg-amber-950/30 border-amber-600/70 shadow-glow-amber' : 'bg-slate-900/40 border-slate-800/80'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${priorityCounts.Urgent > 0 ? 'bg-amber-500' : 'bg-slate-700'}`} />
              Urgent
            </span>
            <span className="text-lg font-bold font-mono text-amber-300">{priorityCounts.Urgent}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 block">Prioritize early service</span>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${priorityCounts.Recommended > 0 ? 'bg-sky-950/30 border-sky-600/60' : 'bg-slate-900/40 border-slate-800/80'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono font-bold uppercase text-sky-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${priorityCounts.Recommended > 0 ? 'bg-sky-500' : 'bg-slate-700'}`} />
              Recommended
            </span>
            <span className="text-lg font-bold font-mono text-sky-300">{priorityCounts.Recommended}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 block">Service within window</span>
        </div>

        <div className={`p-4 rounded-xl border transition-all ${priorityCounts.Routine > 0 ? 'bg-emerald-950/30 border-emerald-600/60 shadow-glow-emerald' : 'bg-slate-900/40 border-slate-800/80'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${priorityCounts.Routine > 0 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              Routine
            </span>
            <span className="text-lg font-bold font-mono text-emerald-300">{priorityCounts.Routine}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 block">Standard OEM interval</span>
        </div>
      </div>

      {/* 7. Maintenance Distance Visualization & 10. Health -> Maintenance Logic */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Estimated Distance Until Maintenance
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Model-Estimated Maintenance Window
            </h3>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-2xl lg:text-3xl font-bold font-mono text-white">
              ~{Math.round(maintDistance).toLocaleString()} <span className="text-sm font-normal text-slate-400">km</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400 block">
              Projected service odometer: ~{Math.round((telemetry?.mileage ?? 45000) + maintDistance).toLocaleString()} km
            </span>
          </div>
        </div>

        {/* Visual Progress Bar representing Distance Urgency */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Immediate Service (0 km)</span>
            <span>Target Window: ~{Math.round(maintDistance).toLocaleString()} km</span>
            <span>Routine Interval (10,000 km)</span>
          </div>
          <div className="w-full bg-slate-900 border border-slate-800 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                maintDistance < 1000
                  ? 'bg-rose-500 shadow-glow-crimson'
                  : maintDistance < 3000
                  ? 'bg-orange-500 shadow-glow-amber'
                  : maintDistance < 6000
                  ? 'bg-amber-500 shadow-glow-amber'
                  : 'bg-emerald-500 shadow-glow-emerald'
              }`}
              style={{ width: `${Math.max(3, Math.min(100, (maintDistance / 10000) * 100))}%` }}
            />
          </div>
        </div>

        {/* Health -> Maintenance Relationship Explanation */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs font-mono text-slate-300 flex items-start gap-2.5 leading-relaxed">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Health to Maintenance Relationship:</strong> Vehicle health score of <strong>{Math.round(healthScore)}/100</strong> correlates with a predicted maintenance window of <strong>~{Math.round(maintDistance).toLocaleString()} km</strong>. As component wear or thermal strain rises, the Random Forest regression algorithm rapidly compresses the maintenance window to prevent roadside mechanical breakdown.
          </span>
        </div>
      </div>

      {/* 4. AI Maintenance Actions & 11. "Why This is Recommended" */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Recommended Maintenance Actions ({recommendations.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Prioritized service directives synthesized from component failure risks and operational telemetry.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Model Predictive Output
          </span>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const isCritical = rec.urgency === 'Critical';
            const isUrgent = rec.urgency === 'Urgent';
            const whyOpen = !!expandedWhy[rec.id || idx];
            const compContext = getComponentContext(rec.component);

            return (
              <div
                key={rec.id || idx}
                className={`glass-panel rounded-xl p-5 border transition-all ${
                  isCritical
                    ? 'border-rose-600/80 bg-rose-950/20 shadow-glow-crimson'
                    : isUrgent
                    ? 'border-amber-600/70 bg-amber-950/15'
                    : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${
                        isCritical
                          ? 'bg-rose-950/80 text-rose-300 border-rose-600'
                          : isUrgent
                          ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                      }`}
                    >
                      {rec.urgency}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">
                      {rec.component}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {rec.id || `REC-00${idx + 1}`}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 shrink-0">
                    Within ~{Math.round(rec.estimated_distance_remaining_km).toLocaleString()} km
                  </span>
                </div>

                <div className="text-base font-bold text-white mt-1">
                  {rec.action}
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-sans">
                  {rec.explanation}
                </p>

                {/* 11. Collapsible "Why this is recommended" area */}
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => toggleWhy(rec.id || idx)}
                    className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    <span>Why this is recommended</span>
                    {whyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {whyOpen && (
                    <div className="mt-2.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">Contributing Sensor:</span>
                          <strong className="text-white">{compContext.factor} ({compContext.value})</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Failure Probability:</span>
                          <strong className="text-rose-400">{compContext.prob}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Subsystem Risk:</span>
                          <strong className="text-amber-400">{compContext.risk}</strong>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        {compContext.association}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Maintenance Timeline (Distance-based: NOW, SOON, UPCOMING) */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Maintenance Execution Timeline
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Distance-based service sequencing structured by operational urgency.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Distance-Based Sequencing
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bucket 1: NOW */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold uppercase text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                NOW • Immediate
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                &lt; 500 km or Critical
              </span>
            </div>

            {timelineBuckets.now.length > 0 ? (
              <div className="space-y-2">
                {timelineBuckets.now.map((item, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-xs font-mono">
                    <span className="text-rose-300 font-bold block mb-0.5">{item.component}</span>
                    <span className="text-slate-200 block text-[11px] font-sans">{item.action}</span>
                    <span className="text-[10px] text-rose-400 mt-1 block">Within ~{Math.round(item.estimated_distance_remaining_km).toLocaleString()} km</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-400 italic py-2">
                No immediate roadside critical actions currently required.
              </p>
            )}
          </div>

          {/* Bucket 2: SOON */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                SOON • Within Window
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                500 – 3,000 km
              </span>
            </div>

            {timelineBuckets.soon.length > 0 ? (
              <div className="space-y-2">
                {timelineBuckets.soon.map((item, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs font-mono">
                    <span className="text-amber-300 font-bold block mb-0.5">{item.component}</span>
                    <span className="text-slate-200 block text-[11px] font-sans">{item.action}</span>
                    <span className="text-[10px] text-amber-400 mt-1 block">Within ~{Math.round(item.estimated_distance_remaining_km).toLocaleString()} km</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-400 italic py-2">
                All mid-range service items nominal or covered in routine schedule.
              </p>
            )}
          </div>

          {/* Bucket 3: UPCOMING */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                UPCOMING • Routine
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Standard OEM Interval
              </span>
            </div>

            {timelineBuckets.upcoming.length > 0 ? (
              <div className="space-y-2">
                {timelineBuckets.upcoming.map((item, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-xs font-mono">
                    <span className="text-emerald-300 font-bold block mb-0.5">{item.component}</span>
                    <span className="text-slate-200 block text-[11px] font-sans">{item.action}</span>
                    <span className="text-[10px] text-emerald-400 mt-1 block">Within ~{Math.round(item.estimated_distance_remaining_km).toLocaleString()} km</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-400 italic py-2">
                Standard scheduled service deferred to priority intervention items above.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 6. Component Maintenance Status Grid (4 Components) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Component Maintenance Status
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Status Derived from ML Failure Classifiers
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {componentStatuses.map((comp, idx) => {
            const Icon = comp.icon;
            const badgeStyle = getRiskBadgeStyle(comp.risk);

            return (
              <div
                key={idx}
                className="glass-panel rounded-xl p-5 border border-slate-800/80 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <Icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <StatusBadge level={comp.risk} label={`${comp.risk} Risk`} size="sm" />
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {comp.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 my-2 py-2 border-y border-slate-800/60 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Health</span>
                      <strong className="text-white">{comp.health}%</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Failure Risk</span>
                      <strong className={badgeStyle.text}>{comp.prob}%</strong>
                    </div>
                  </div>

                  <div className="space-y-1 my-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Maintenance Status</span>
                    <span className={`text-xs font-mono font-bold block ${comp.prob >= 60 ? 'text-rose-400' : comp.prob >= 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {comp.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 mt-2 font-sans">
                    <strong>Action:</strong> {comp.action}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-400">
                  {comp.relevantSensor}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. Current Vehicle Condition & 9. Maintenance History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Vehicle Condition */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200">
                Current Vehicle Readings
              </h3>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('analysis')}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Edit Parameters</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Coolant Temp</span>
              <strong className="text-white">{(telemetry?.engine_temperature ?? 91).toFixed(1)}°C</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Engine Load</span>
              <strong className="text-white">{Math.round(telemetry?.engine_load ?? 35)}%</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Engine RPM</span>
              <strong className="text-white">{Math.round(telemetry?.rpm ?? 2000)}</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Battery Voltage</span>
              <strong className="text-white">{(telemetry?.battery_voltage ?? 12.5).toFixed(2)}V</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Vehicle Age</span>
              <strong className="text-white">{(telemetry?.vehicle_age ?? 3).toFixed(1)} yrs</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Brake Pad Wear</span>
              <strong className="text-white">{Math.round(telemetry?.brake_wear ?? 25)}%</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Hard Stops</span>
              <strong className="text-white">{telemetry?.hard_braking_events ?? 2}/100km</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Tyre Pressure</span>
              <strong className="text-white">{(telemetry?.tyre_pressure ?? 33).toFixed(1)} PSI</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">Oil Condition</span>
              <strong className="text-white">{Math.round(telemetry?.oil_condition ?? 80)}%</strong>
            </div>
          </div>

          <p className="text-[11px] font-mono text-slate-400">
            Current readings used by the AI maintenance analysis. Editable in Vehicle Analysis.
          </p>
        </div>

        {/* 9. Maintenance History */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold tracking-wider uppercase font-mono text-slate-200">
                  Maintenance History
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Telemetry Record</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 mb-3">
              Historical service records are not connected in the current prototype. Operational service counts and intervals below represent the active telemetry inputs evaluated by the ML model.
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Lifetime Services Performed</span>
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {telemetry?.service_count ?? 3} <span className="text-xs font-normal text-slate-400">services</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">OEM routine visits</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-1">Distance Driven Since Service</span>
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {Math.round(telemetry?.distance_since_service ?? 4500).toLocaleString()} <span className="text-xs font-normal text-slate-400">km</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Operational elapsed</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-[11px] font-mono text-slate-400">
            Mean service cadence: ~{telemetry?.service_count && telemetry?.mileage ? Math.round(telemetry.mileage / Math.max(1, telemetry.service_count)).toLocaleString() : '12,500'} km per routine cycle.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
