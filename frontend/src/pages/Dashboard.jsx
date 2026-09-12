import React from 'react';
import {
  ShieldAlert,
  Gauge,
  Battery,
  Disc,
  CircleGauge,
  Clock,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  formatDistance,
  formatPercent,
  getHealthColor,
  getHealthStatus,
  getRiskFromProbability,
  getCompositeRisk,
} from '../utils/formatters';

export const Dashboard = ({
  prediction,
  telemetry,
  onNavigate,
  onRunPredict,
  isPredicting,
}) => {
  const overall = prediction?.overall_health_score ?? 0;
  const overallColor = getHealthColor(overall);
  const healthStatusLabel = getHealthStatus(overall);

  const engineHealth = prediction?.engine_health ?? 0;
  const batteryHealth = prediction?.battery_health ?? 0;
  const brakeHealth = prediction?.brake_health ?? 0;
  const tyreHealth = prediction?.tyre_health ?? 0;

  const engProb = prediction?.engine_failure_probability ?? 0;
  const batProb = prediction?.battery_failure_probability ?? 0;
  const brkProb = prediction?.brake_failure_probability ?? 0;
  const tyrProb = prediction?.tyre_failure_probability ?? 0;

  const engRisk = getRiskFromProbability(engProb);
  const batRisk = getRiskFromProbability(batProb);
  const brkRisk = getRiskFromProbability(brkProb);
  const tyrRisk = getRiskFromProbability(tyrProb);

  const overallRisk = getCompositeRisk(prediction);

  const nextMaintenance = prediction?.estimated_maintenance_distance ?? 0;

  const getAccentForRisk = (risk) => {
    const r = (risk || '').toLowerCase();
    if (r.includes('critical') || r.includes('high')) return 'crimson';
    if (r.includes('moderate') || r.includes('medium')) return 'amber';
    return 'emerald';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Health Score Banner */}
      <div className="glass-panel rounded-2xl p-6 lg:p-8 border border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-[#0B132B]/60 to-slate-900/90 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase">
              <span className={`w-2 h-2 rounded-full ${isPredicting ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
              {isPredicting ? 'Computing AI Inference...' : 'Trained ML Telemetry Intelligence'}
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Vehicle Health Status & Risk Overview
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Real-time predictive telemetry evaluated by Random Forest models trained on engine load, battery voltage, brake pad wear, and driving behavior datasets.
            </p>
          </div>

          {/* Primary Overall Health Badge */}
          <div className="flex items-center gap-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800 shrink-0">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={overallColor.text}
                  strokeDasharray={`${overall}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-bold font-mono text-white tracking-tight">
                  {Math.round(overall)}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">/ 100</span>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Vehicle Health
              </div>
              <div className="text-xl font-bold font-mono text-white mt-0.5">
                {overall.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <StatusBadge
                  level={overall >= 75 ? 'low' : overall >= 60 ? 'medium' : overall >= 40 ? 'high' : 'critical'}
                  label={`${healthStatusLabel} (${Math.round(overall)}/100)`}
                />
                <StatusBadge
                  level={overallRisk.level.toLowerCase()}
                  label={`Composite: ${overallRisk.label}`}
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Component-Level Health Scores (4 Core Pillars) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-300">
            Component-Level Health
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('analysis')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer focus:outline-none focus:underline"
          >
            <span>Telemetry Controls</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Engine Health */}
          <MetricCard
            title="Engine Health"
            value={formatPercent(engineHealth)}
            icon={CircleGauge}
            accentColor={getAccentForRisk(engRisk)}
            progress={engineHealth}
            subtitle={`Temp: ${telemetry?.engine_temperature ?? 90}°C • ${Math.round(telemetry?.rpm ?? 2000)} RPM`}
            badge={<StatusBadge level={engRisk} label={`Risk: ${engRisk}`} />}
          />

          {/* Battery Health */}
          <MetricCard
            title="Battery Health"
            value={formatPercent(batteryHealth)}
            icon={Battery}
            accentColor={getAccentForRisk(batRisk)}
            progress={batteryHealth}
            subtitle={`${(telemetry?.battery_voltage ?? 12.5).toFixed(2)}V • Age ${telemetry?.vehicle_age ?? 3} yrs`}
            badge={<StatusBadge level={batRisk} label={`Risk: ${batRisk}`} />}
          />

          {/* Brake Health */}
          <MetricCard
            title="Brake Health"
            value={formatPercent(brakeHealth)}
            icon={Disc}
            accentColor={getAccentForRisk(brkRisk)}
            progress={brakeHealth}
            subtitle={`Pad wear: ${Math.round(telemetry?.brake_wear ?? 30)}% • ${telemetry?.hard_braking_events ?? 0} hard events`}
            badge={<StatusBadge level={brkRisk} label={`Risk: ${brkRisk}`} />}
          />

          {/* Tyre Health */}
          <MetricCard
            title="Tyre Health"
            value={formatPercent(tyreHealth)}
            icon={Gauge}
            accentColor={getAccentForRisk(tyrRisk)}
            progress={tyreHealth}
            subtitle={`${(telemetry?.tyre_pressure ?? 33).toFixed(1)} PSI • ${Math.round(telemetry?.average_speed ?? 50)} km/h`}
            badge={<StatusBadge level={tyrRisk} label={`Risk: ${tyrRisk}`} />}
          />
        </div>
      </div>

      {/* Failure Risk & Next Maintenance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Failure Risk Matrix Breakdown */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
                Failure-Risk Predictions (0–100%)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('prediction')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Detailed Risk Analysis</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Engine', risk: engRisk, prob: engProb },
              { label: 'Battery', risk: batRisk, prob: batProb },
              { label: 'Brakes', risk: brkRisk, prob: brkProb },
              { label: 'Tyres', risk: tyrRisk, prob: tyrProb },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800/90 flex flex-col justify-between"
              >
                <div className="text-xs font-medium text-slate-400 mb-1">
                  {item.label}
                </div>
                <div className="my-1.5">
                  <StatusBadge level={item.risk} label={item.risk} size="lg" />
                </div>
                <div className="text-[11px] font-mono text-slate-300 mt-1 font-semibold">
                  P(fail): {item.prob.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* Quick Context / Alert note */}
          <div className="mt-4 p-3 rounded-lg bg-slate-900/50 border border-slate-800/60 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-cyan-300">Model Inference Notice:</span> Values are computed live via RandomForestClassifier and RandomForestRegressor models loaded in the FastAPI backend.
            </p>
          </div>
        </div>

        {/* Next Maintenance Estimate Card */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
                  Next Maintenance
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                AI Prediction
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center mb-4">
              <div className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-1">
                Estimated Service Window
              </div>
              <div className="text-3xl font-bold font-mono tracking-tight text-white">
                ~{Math.round(nextMaintenance).toLocaleString()} <span className="text-base font-normal text-cyan-400">km</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Predicted by RandomForestRegressor based on component margins and service history
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('maintenance')}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-xs font-mono font-medium text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>View Maintenance Schedule</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recommended Actions Preview */}
      {prediction?.recommendations && prediction.recommendations.length > 0 && (
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-300">
              Immediate Recommendations ({prediction.recommendations.length})
            </h3>
            <button
              onClick={() => onNavigate('maintenance')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
            >
              <span>See All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {prediction.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    rec.urgency === 'Critical' ? 'bg-rose-500' :
                    rec.urgency === 'Urgent' ? 'bg-amber-500' : 'bg-cyan-400'
                  }`} />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {rec.component} — {rec.action}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {rec.explanation}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <StatusBadge level={rec.urgency} label={rec.urgency} />
                  <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                    Within ~{Math.round(rec.estimated_distance_remaining_km).toLocaleString()} km
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
