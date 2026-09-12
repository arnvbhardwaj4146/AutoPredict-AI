import React from 'react';
import {
  ShieldAlert,
  Flame,
  BatteryCharging,
  Disc,
  LifeBuoy,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Activity,
  Wrench,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Gauge,
  Car,
  AlertCircle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import RiskMeter from '../components/common/RiskMeter';
import StatusBadge from '../components/common/StatusBadge';
import {
  getHealthStatus,
  getHealthColor,
  getRiskFromProbability,
  getCompositeRisk,
  formatDistance,
  getRiskBadgeStyle,
} from '../utils/formatters';

export const FailurePrediction = ({
  prediction,
  previousPrediction,
  telemetry,
  onNavigate,
  isPredicting = false,
  apiError = null,
  lastAnalysisTimestamp = null,
}) => {
  // 1. Loading State
  if (isPredicting) {
    return (
      <div className="glass-panel rounded-xl p-12 border border-slate-800/80 text-center space-y-4 my-8">
        <div className="inline-flex p-4 rounded-full bg-cyan-950/40 border border-cyan-500/40 animate-pulse">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          Running AI Vehicle Analysis...
        </h3>
        <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
          Synthesizing 17 telemetry features across 6 scikit-learn Random Forest models (regressors, failure classifiers, and maintenance estimators).
        </p>
      </div>
    );
  }

  // 2. Error State (when API failed and no prediction exists)
  if (apiError && !prediction) {
    return (
      <div className="glass-panel rounded-xl p-8 border border-rose-600/60 bg-rose-950/20 text-center space-y-4 my-8">
        <div className="inline-flex p-3 rounded-full bg-rose-950/60 border border-rose-500/60">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          Unable to Generate Failure Prediction
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

  // 3. Empty / No-Data State
  if (!prediction) {
    return (
      <div className="glass-panel rounded-xl p-12 border border-slate-800/80 text-center space-y-4 my-8">
        <div className="inline-flex p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
          <Gauge className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          No Vehicle Analysis Available
        </h3>
        <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
          Enter vehicle telemetry data in Vehicle Analysis and run AI Analysis to generate real-time component failure predictions.
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

  // Helper to normalize probability without premature integer rounding
  const getNormProb = (val, fallback = 0) => {
    const raw = Number(val ?? fallback);
    return raw <= 1.0 && raw > 0 ? Number((raw * 100).toFixed(1)) : Number(raw.toFixed(1));
  };

  const brakeProbPct = getNormProb(prediction.brake_failure_probability);
  const batteryProbPct = getNormProb(prediction.battery_failure_probability);
  const tyreProbPct = getNormProb(prediction.tyre_failure_probability);
  const engineProbPct = getNormProb(prediction.engine_failure_probability);

  const risks = prediction.failure_risks || {
    engine: getRiskFromProbability(engineProbPct),
    battery: getRiskFromProbability(batteryProbPct),
    brakes: getRiskFromProbability(brakeProbPct),
    tyres: getRiskFromProbability(tyreProbPct),
  };

  // Unified, single source of truth composite risk rule
  const overallRisk = getCompositeRisk(prediction);
  const overallHealthStatus = getHealthStatus(prediction.overall_health_score);
  const overallHealthColor = getHealthColor(prediction.overall_health_score);

  // Find backend recommendation explanations if present
  const findRecExplanation = (keyword) => {
    if (!prediction.recommendations) return null;
    const found = prediction.recommendations.find(
      (r) => r.component?.toLowerCase().includes(keyword.toLowerCase()) || r.action?.toLowerCase().includes(keyword.toLowerCase())
    );
    return found ? found.explanation : null;
  };

  // 4 Major Component Definitions
  const components = [
    {
      id: 'engine',
      name: 'Engine & Powertrain',
      icon: Flame,
      health: Math.round(prediction.engine_health),
      probPercent: engineProbPct,
      risk: risks.engine || getRiskFromProbability(engineProbPct),
      statusMsg:
        engineProbPct >= 60
          ? 'Imminent thermal breakdown risk. Severe coolant overheat or excessive continuous operating load.'
          : engineProbPct >= 35
          ? 'Elevated engine stress. Thermal dynamics or sustained high load exceed nominal envelope.'
          : engineProbPct >= 15
          ? 'Moderate engine load observed. Approaching preventative oil and cooling service interval.'
          : 'Optimal thermal dynamics and internal powertrain lubrication within design specifications.',
      backendNote: findRecExplanation('Engine'),
      factors: [
        {
          name: 'Coolant Temperature',
          value: `${(telemetry?.engine_temperature ?? 91).toFixed(1)}°C`,
          impact: (telemetry?.engine_temperature ?? 91) > 105 ? 'Critical Impact' : (telemetry?.engine_temperature ?? 91) > 98 ? 'Moderate Impact' : 'Normal',
          explanation: (telemetry?.engine_temperature ?? 91) > 105
            ? 'Coolant temperature exceeds 105°C, strongly correlating with thermal saturation and head gasket strain in the model.'
            : 'Coolant temperature operates within nominal thermal equilibrium (88–95°C).',
        },
        {
          name: 'Engine Operating Load & RPM',
          value: `${Math.round(telemetry?.engine_load ?? 35)}% load @ ${Math.round(telemetry?.rpm ?? 2000)} RPM`,
          impact: (telemetry?.engine_load ?? 35) > 75 ? 'High Impact' : 'Normal',
          explanation: (telemetry?.engine_load ?? 35) > 75
            ? 'Sustained operating load (>75%) increases internal friction and crankshaft thermal fatigue.'
            : 'Engine load and operating RPM are within standard cruising envelope.',
        },
        {
          name: 'Oil Condition Index',
          value: `${Math.round(telemetry?.oil_condition ?? 80)}% remaining life`,
          impact: (telemetry?.oil_condition ?? 80) < 35 ? 'High Impact' : 'Normal',
          explanation: (telemetry?.oil_condition ?? 80) < 35
            ? 'Depleted lubricant viscosity elevates mechanical wear indices across pistons and bearings.'
            : 'Oil condition provides sufficient hydrodynamic lubrication film.',
        },
      ],
    },
    {
      id: 'battery',
      name: 'Battery & Starting System',
      icon: BatteryCharging,
      health: Math.round(prediction.battery_health),
      probPercent: batteryProbPct,
      risk: risks.battery || getRiskFromProbability(batteryProbPct),
      statusMsg:
        batteryProbPct >= 60
          ? 'Severe electrochemical degradation. Significant cold-cranking and starting failure hazard.'
          : batteryProbPct >= 35
          ? 'Sub-optimal cell voltage retention during resting cycles. Early battery replacement indicated.'
          : batteryProbPct >= 15
          ? 'Moderate plate aging observed. Charge acceptance slightly reduced from factory baseline.'
          : 'Healthy terminal voltage retention and stable alternator charging output verified.',
      backendNote: findRecExplanation('Battery'),
      factors: [
        {
          name: 'Terminal Resting Voltage',
          value: `${(telemetry?.battery_voltage ?? 12.5).toFixed(2)} V`,
          impact: (telemetry?.battery_voltage ?? 12.5) < 11.9 ? 'Critical Impact' : (telemetry?.battery_voltage ?? 12.5) < 12.3 ? 'Moderate Impact' : 'Normal',
          explanation: (telemetry?.battery_voltage ?? 12.5) < 11.9
            ? 'Voltage under 11.9V indicates deep discharge or sulfated cell plates, driving high failure probability in the model.'
            : 'Terminal voltage (12.4V–12.8V) demonstrates proper open-circuit charge capacity.',
        },
        {
          name: 'Battery Operating Age',
          value: `${(telemetry?.vehicle_age ?? 3.0).toFixed(1)} years`,
          impact: (telemetry?.vehicle_age ?? 3.0) > 5.0 ? 'High Impact' : 'Normal',
          explanation: (telemetry?.vehicle_age ?? 3.0) > 5.0
            ? 'Operating age exceeding 5.0 years is statistically associated with internal lead plate corrosion.'
            : 'Battery age is within expected 4–5 year design operational lifespan.',
        },
      ],
    },
    {
      id: 'brakes',
      name: 'Braking System & Friction Surfaces',
      icon: Disc,
      health: Math.round(prediction.brake_health),
      probPercent: brakeProbPct,
      risk: risks.brakes || getRiskFromProbability(brakeProbPct),
      statusMsg:
        brakeProbPct >= 60
          ? 'Critical friction material depletion. Immediate pad and rotor inspection required before driving.'
          : brakeProbPct >= 35
          ? 'Significant pad wear detected. Thermal friction fade risk elevated under heavy braking.'
          : brakeProbPct >= 15
          ? 'Moderate friction surface thinning. Plan scheduled inspection at next routine service.'
          : 'Friction pad lining thickness and hydraulic response within standard OEM safety limits.',
      backendNote: findRecExplanation('Brake'),
      factors: [
        {
          name: 'Brake Pad Lining Wear',
          value: `${Math.round(telemetry?.brake_wear ?? 25)}% worn`,
          impact: (telemetry?.brake_wear ?? 25) > 75 ? 'Critical Impact' : (telemetry?.brake_wear ?? 25) > 50 ? 'Moderate Impact' : 'Normal',
          explanation: (telemetry?.brake_wear ?? 25) > 75
            ? 'Pad wear exceeding 75% dramatically accelerates thermal transfer into calipers and risks metal-to-metal contact.'
            : 'Lining thickness indicates ample usable friction compound remaining.',
        },
        {
          name: 'Hard Braking Frequency',
          value: `${telemetry?.hard_braking_events ?? 2} deceleration events / 100km`,
          impact: (telemetry?.hard_braking_events ?? 2) > 8 ? 'High Impact' : 'Normal',
          explanation: (telemetry?.hard_braking_events ?? 2) > 8
            ? 'Repeated high-G braking cycles induce pad surface glazing and rotor disc warpage.'
            : 'Braking frequency reflects balanced driving dynamics.',
        },
      ],
    },
    {
      id: 'tyres',
      name: 'Tyres & Wheel Assemblies',
      icon: LifeBuoy,
      health: Math.round(prediction.tyre_health),
      probPercent: tyreProbPct,
      risk: risks.tyres || getRiskFromProbability(tyreProbPct),
      statusMsg:
        tyreProbPct >= 60
          ? 'Hazardous tyre pressure deviation. Elevated blowout risk and compromised wet traction.'
          : tyreProbPct >= 35
          ? 'Sub-optimal inflation pressure increases rolling resistance and accelerated shoulder wear.'
          : tyreProbPct >= 15
          ? 'Minor pressure deviation from recommended cold threshold. Check cold pressure.'
          : 'Inflation pressure and rolling resistance optimal across all four wheel positions.',
      backendNote: findRecExplanation('Tyre'),
      factors: [
        {
          name: 'Cold Inflation Pressure',
          value: `${(telemetry?.tyre_pressure ?? 33.0).toFixed(1)} PSI`,
          impact: (telemetry?.tyre_pressure ?? 33.0) < 27 || (telemetry?.tyre_pressure ?? 33.0) > 40 ? 'Critical Impact' : 'Normal',
          explanation: (telemetry?.tyre_pressure ?? 33.0) < 27
            ? 'Under-inflation (<27 PSI) increases sidewall flexing and internal carcass heat buildup, multiplying failure probability in the model.'
            : 'Tyre pressure matches the recommended 32–35 PSI optimal contact patch profile.',
        },
        {
          name: 'Average Velocity Strain',
          value: `${Math.round(telemetry?.average_speed ?? 50)} km/h`,
          impact: 'Normal',
          explanation: 'Average velocity envelope sustains standard tyre carcass dissipation rates.',
        },
      ],
    },
  ];

  // Helper for "What Changed?" calculation
  const renderComparisonSection = () => {
    if (!previousPrediction) {
      return (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Baseline Analysis Recorded.</strong> Modify vehicle parameters in Vehicle Analysis or toggle presets to view dynamic metric deltas and risk transitions here.
            </span>
          </div>
        </div>
      );
    }

    const prevOverall = previousPrediction.overall_health_score;
    const currOverall = prediction.overall_health_score;
    const overallDelta = Math.round((currOverall - prevOverall) * 10) / 10;

    const prevMaint = previousPrediction.estimated_maintenance_distance;
    const currMaint = prediction.estimated_maintenance_distance;
    const maintDelta = Math.round(currMaint - prevMaint);

    const comparisons = [
      {
        label: 'Overall Vehicle Health',
        prev: `${prevOverall.toFixed(1)}`,
        curr: `${currOverall.toFixed(1)}`,
        delta: `${overallDelta > 0 ? '+' : ''}${overallDelta} pts`,
        status: overallDelta > 0 ? 'improved' : overallDelta < 0 ? 'degraded' : 'unchanged',
      },
      {
        label: 'Engine Failure Risk',
        prev: `${getNormProb(previousPrediction.engine_failure_probability)}%`,
        curr: `${engineProbPct}%`,
        delta: `${engineProbPct - getNormProb(previousPrediction.engine_failure_probability) > 0 ? '+' : ''}${engineProbPct - getNormProb(previousPrediction.engine_failure_probability)}%`,
        status: engineProbPct > getNormProb(previousPrediction.engine_failure_probability) ? 'worse' : engineProbPct < getNormProb(previousPrediction.engine_failure_probability) ? 'improved' : 'unchanged',
      },
      {
        label: 'Battery Failure Risk',
        prev: `${getNormProb(previousPrediction.battery_failure_probability)}%`,
        curr: `${batteryProbPct}%`,
        delta: `${batteryProbPct - getNormProb(previousPrediction.battery_failure_probability) > 0 ? '+' : ''}${batteryProbPct - getNormProb(previousPrediction.battery_failure_probability)}%`,
        status: batteryProbPct > getNormProb(previousPrediction.battery_failure_probability) ? 'worse' : batteryProbPct < getNormProb(previousPrediction.battery_failure_probability) ? 'improved' : 'unchanged',
      },
      {
        label: 'Brake Failure Risk',
        prev: `${getNormProb(previousPrediction.brake_failure_probability)}%`,
        curr: `${brakeProbPct}%`,
        delta: `${brakeProbPct - getNormProb(previousPrediction.brake_failure_probability) > 0 ? '+' : ''}${brakeProbPct - getNormProb(previousPrediction.brake_failure_probability)}%`,
        status: brakeProbPct > getNormProb(previousPrediction.brake_failure_probability) ? 'worse' : brakeProbPct < getNormProb(previousPrediction.brake_failure_probability) ? 'improved' : 'unchanged',
      },
      {
        label: 'Tyre Failure Risk',
        prev: `${getNormProb(previousPrediction.tyre_failure_probability)}%`,
        curr: `${tyreProbPct}%`,
        delta: `${tyreProbPct - getNormProb(previousPrediction.tyre_failure_probability) > 0 ? '+' : ''}${tyreProbPct - getNormProb(previousPrediction.tyre_failure_probability)}%`,
        status: tyreProbPct > getNormProb(previousPrediction.tyre_failure_probability) ? 'worse' : tyreProbPct < getNormProb(previousPrediction.tyre_failure_probability) ? 'improved' : 'unchanged',
      },
      {
        label: 'Maintenance Distance',
        prev: `~${Math.round(prevMaint).toLocaleString()} km`,
        curr: `~${Math.round(currMaint).toLocaleString()} km`,
        delta: `${maintDelta > 0 ? '+' : ''}${maintDelta.toLocaleString()} km`,
        status: maintDelta > 0 ? 'improved' : maintDelta < 0 ? 'worse' : 'unchanged',
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {comparisons.map((item, idx) => {
          const isDegraded = item.status === 'worse' || item.status === 'degraded';
          const isImproved = item.status === 'improved';

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs font-mono transition-all ${
                isDegraded
                  ? 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                  : isImproved
                  ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <span className="text-[11px] text-slate-400 block mb-1 font-sans font-medium">
                {item.label}
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-400 text-xs">
                  {item.prev} <span className="text-slate-500">→</span> <strong className="text-white">{item.curr}</strong>
                </span>
                <span
                  className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                    isDegraded
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-600/60'
                      : isImproved
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDegraded && <TrendingUp className="w-3 h-3 text-rose-400" />}
                  {isImproved && <TrendingDown className="w-3 h-3 text-emerald-400" />}
                  {!isDegraded && !isImproved && <Minus className="w-3 h-3 text-slate-400" />}
                  <span>{item.delta}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/60 text-cyan-400 border border-cyan-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              AI Model Analysis
            </span>
            {telemetry?.vehicle_id && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {telemetry.vehicle_id} • {telemetry.vehicle_type || 'Sedan'} ({telemetry.engine_type || 'Petrol'})
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Failure Prediction
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            AI-powered component failure risk analysis. Evaluates mechanical wear indices, sensor dynamics, and empirical degradation factors across 6 trained Random Forest models.
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

      {/* 2. Overall Risk Summary Card */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-[#0C1527]/90 to-slate-900/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
              Overall Vehicle Risk Summary
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Composite Risk Level:</span>
            <span className={`px-2.5 py-0.5 rounded font-bold uppercase border ${overallRisk.badge}`}>
              {overallRisk.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Vehicle Health Score
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono" style={{ color: overallHealthColor.hex }}>
                {Math.round(prediction.overall_health_score * 10) / 10}
              </span>
              <span className="text-xs font-mono text-slate-400">/ 100</span>
            </div>
            <span className="text-[11px] font-mono font-medium block mt-1" style={{ color: overallHealthColor.hex }}>
              {overallHealthStatus} Health State
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Overall Failure Risk
            </span>
            <div className="flex items-baseline justify-between">
              <span className={`text-3xl font-bold font-mono ${overallRisk.color === 'rose' ? 'text-rose-400' : overallRisk.color === 'orange' ? 'text-orange-400' : overallRisk.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {overallRisk.level}
              </span>
              <span className="text-xs font-mono text-slate-400">Taxonomy</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 block mt-1">
              Worst sub-system risk factor
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Target Maintenance Window
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono text-white">
                ~{Math.round(prediction.estimated_maintenance_distance).toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">km</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 block mt-1">
              Distance remaining to service
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Active Action Directives
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono text-cyan-400">
                {(prediction.recommendations || []).length}
              </span>
              <span className="text-xs font-mono text-slate-400">Directives</span>
            </div>
            {onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate('maintenance')}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 mt-1 transition-colors cursor-pointer"
              >
                <span>View Service Schedule</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[11px] font-mono text-slate-400 mt-1">Generated by models</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Component Failure Risk Grid (4 Major Sub-systems) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Component Failure Risk Breakdown
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Calculated from Random Forest Probabilistic Classifiers
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {components.map((comp) => {
            const Icon = comp.icon;
            const badgeStyle = getRiskBadgeStyle(comp.risk);

            return (
              <div
                key={comp.id}
                className="glass-panel rounded-xl p-6 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-5"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <Icon className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white tracking-tight">
                          {comp.name}
                        </h3>
                        <p className="text-xs font-mono text-slate-400">
                          Subsystem Reliability Profile
                        </p>
                      </div>
                    </div>

                    <StatusBadge level={comp.risk} label={`${comp.risk} Risk`} size="lg" />
                  </div>

                  {/* Dual Metric Counters: Health vs Probability */}
                  <div className="grid grid-cols-2 gap-3 my-4">
                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                        Component Health
                      </span>
                      <span className="text-2xl font-bold font-mono text-white">
                        {comp.health}%
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        Operational Capacity
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                        Failure Probability
                      </span>
                      <span className={`text-2xl font-bold font-mono ${badgeStyle.text}`}>
                        {comp.probPercent}%
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        Model Risk Likelihood
                      </span>
                    </div>
                  </div>

                  {/* Visual Risk Meter */}
                  <div className="my-3">
                    <RiskMeter
                      probability={comp.probPercent}
                      riskLevel={comp.risk}
                      label="Probabilistic Failure Index"
                      size="md"
                    />
                  </div>

                  {/* Clinical Status Message */}
                  <p className="text-xs font-mono text-slate-300 leading-relaxed bg-slate-900/70 p-3 rounded-lg border border-slate-800/80">
                    {comp.statusMsg}
                  </p>

                  {/* Backend Direct Recommendation Explanation */}
                  {comp.backendNote && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-[11px] font-mono text-cyan-300 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span><strong>Model Diagnostic Directive:</strong> {comp.backendNote}</span>
                    </div>
                  )}

                  {/* 5. AI-Indicated Contributing Factors */}
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                        AI-Indicated Contributing Factors
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Statistical Association • Not Proven Causation
                      </span>
                    </div>

                    <div className="space-y-2">
                      {comp.factors.map((factor, fIdx) => (
                        <div
                          key={fIdx}
                          className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs font-mono space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-200 font-semibold">{factor.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold">{factor.value}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  factor.impact.includes('Critical')
                                    ? 'bg-rose-950/80 text-rose-300 border border-rose-600/50'
                                    : factor.impact.includes('Moderate') || factor.impact.includes('High')
                                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {factor.impact}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                            {factor.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Current Vehicle Values (Compact Telemetry Readings) */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              Current Vehicle Sensor Readings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Values shown are the exact inputs evaluated by the Random Forest models for this analysis.
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('analysis')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Edit in Vehicle Analysis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Engine Subsystem</span>
            <span className="text-slate-200 block">Temp: <strong>{(telemetry?.engine_temperature ?? 91).toFixed(1)}°C</strong></span>
            <span className="text-slate-200 block">RPM: <strong>{Math.round(telemetry?.rpm ?? 2000)}</strong></span>
            <span className="text-slate-200 block">Load: <strong>{Math.round(telemetry?.engine_load ?? 35)}%</strong></span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Battery & Electrical</span>
            <span className="text-slate-200 block">Voltage: <strong>{(telemetry?.battery_voltage ?? 12.5).toFixed(2)}V</strong></span>
            <span className="text-slate-200 block">Age: <strong>{(telemetry?.vehicle_age ?? 3).toFixed(1)} yrs</strong></span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Braking & Decel</span>
            <span className="text-slate-200 block">Pad Wear: <strong>{Math.round(telemetry?.brake_wear ?? 25)}%</strong></span>
            <span className="text-slate-200 block">Hard Stops: <strong>{telemetry?.hard_braking_events ?? 2}/100km</strong></span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Tyres & Velocity</span>
            <span className="text-slate-200 block">Pressure: <strong>{(telemetry?.tyre_pressure ?? 33).toFixed(1)} PSI</strong></span>
            <span className="text-slate-200 block">Avg Speed: <strong>{Math.round(telemetry?.average_speed ?? 50)} km/h</strong></span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">Service & Odometer</span>
            <span className="text-slate-200 block">Mileage: <strong>{Math.round(telemetry?.mileage ?? 45000).toLocaleString()} km</strong></span>
            <span className="text-slate-200 block">Since Service: <strong>{Math.round(telemetry?.distance_since_service ?? 4500).toLocaleString()} km</strong></span>
            <span className="text-slate-200 block">Services: <strong>{telemetry?.service_count ?? 3}</strong></span>
          </div>
        </div>
      </div>

      {/* 7. Recommended Actions Section */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Recommended Actions ({prediction.recommendations?.length || 0})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Actionable maintenance directives prioritized by ML risk severity to avert roadside breakdown.
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('maintenance')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Full Maintenance Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          {(prediction.recommendations || []).map((rec, rIdx) => {
            const isCritical = rec.urgency === 'Critical';
            const isUrgent = rec.urgency === 'Urgent';
            const isRecommended = rec.urgency === 'Recommended' || rec.urgency === 'Soon';

            return (
              <div
                key={rec.id || rIdx}
                className={`p-4 rounded-xl border transition-all ${
                  isCritical
                    ? 'border-rose-600/70 bg-rose-950/20 shadow-glow-crimson'
                    : isUrgent
                    ? 'border-amber-600/60 bg-amber-950/15'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
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
                          : isRecommended
                          ? 'bg-sky-950/80 text-sky-300 border-sky-600'
                          : 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                      }`}
                    >
                      {rec.urgency}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-semibold">
                      {rec.component}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {rec.id}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 shrink-0">
                    Within ~{Math.round(rec.estimated_distance_remaining_km).toLocaleString()} km
                  </span>
                </div>

                <div className="text-sm font-bold text-white mt-1">
                  {rec.action}
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-sans">
                  {rec.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. "What Changed?" Section */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Risk Changes Since Last Analysis
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Changes reflect the difference between the previous model analysis and the current vehicle inputs.
            </p>
          </div>
        </div>

        {renderComparisonSection()}
      </div>

      {/* Model Risk Taxonomy Reference */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-3">
          Risk Classification Taxonomy Reference
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
            <span className="text-emerald-400 font-bold block mb-1">Low Risk (0% – 15%)</span>
            <span className="text-[11px] text-slate-400">Normal component operating cycle. Standard scheduled service.</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40">
            <span className="text-amber-400 font-bold block mb-1">Moderate Risk (15% – 35%)</span>
            <span className="text-[11px] text-slate-400">Moderate wear detected. Inspection recommended at next service.</span>
          </div>
          <div className="p-3 rounded-lg bg-orange-950/20 border border-orange-900/40">
            <span className="text-orange-400 font-bold block mb-1">High Risk (35% – 60%)</span>
            <span className="text-[11px] text-slate-400">Significant wear threshold exceeded. Prioritize early replacement.</span>
          </div>
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-600/50">
            <span className="text-rose-300 font-bold block mb-1">Critical (60% – 100%)</span>
            <span className="text-[11px] text-slate-300">Imminent functional failure hazard. Immediate service required.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FailurePrediction;
