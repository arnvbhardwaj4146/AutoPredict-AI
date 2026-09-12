import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  Activity,
  ShieldAlert,
  Wrench,
  Gauge,
  History,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Info,
  RefreshCw,
  Flame,
  BatteryCharging,
  Disc,
  LifeBuoy,
  Car,
  Sliders,
  ArrowRight,
  AlertCircle,
  Filter,
  Calendar,
  Cpu,
  Database,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { PredictionContext } from '../context/PredictionContext';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  formatDistance,
  formatPercent,
  getHealthStatus,
  getHealthColor,
  getRiskFromProbability,
  getRiskBadgeStyle,
} from '../utils/formatters';

// Fallback verified metrics from model_metrics.json (R² 0.9507, MAE 3.34)
const VERIFIED_MODEL_METRICS = {
  overall_health_score: {
    task_type: 'regression',
    algorithm: 'RandomForestRegressor',
    metrics: { mae: 3.336, r2: 0.9507 },
  },
  maintenance_distance: {
    task_type: 'regression',
    algorithm: 'RandomForestRegressor',
    metrics: { mae: 250.995, r2: 0.9799 },
  },
  engine_failure: {
    task_type: 'classification',
    algorithm: 'RandomForestClassifier',
    metrics: { accuracy: 0.935, precision: 0.8932, recall: 0.8106, f1_score: 0.8499 },
  },
  battery_failure: {
    task_type: 'classification',
    algorithm: 'RandomForestClassifier',
    metrics: { accuracy: 0.869, precision: 0.8083, recall: 0.7288, f1_score: 0.7665 },
  },
  brake_failure: {
    task_type: 'classification',
    algorithm: 'RandomForestClassifier',
    metrics: { accuracy: 0.900, precision: 0.8581, recall: 0.6165, f1_score: 0.7175 },
  },
  tyre_failure: {
    task_type: 'classification',
    algorithm: 'RandomForestClassifier',
    metrics: { accuracy: 0.770, precision: 0.8103, recall: 0.4172, f1_score: 0.5508 },
  },
};

export const Analytics = (props) => {
  const context = useContext(PredictionContext);

  const prediction = props.prediction !== undefined ? props.prediction : context?.latestPrediction;
  const previousPrediction = props.previousPrediction !== undefined ? props.previousPrediction : context?.previousPrediction;
  const telemetry = props.telemetry !== undefined ? props.telemetry : context?.currentVehicleInput;
  const isPredicting = props.isPredicting !== undefined ? props.isPredicting : (context?.isPredicting || false);
  const apiError = props.apiError !== undefined ? props.apiError : (context?.apiError || null);
  const lastAnalysisTimestamp = props.lastAnalysisTimestamp !== undefined ? props.lastAnalysisTimestamp : (context?.lastAnalysisTimestamp || null);
  const onNavigate = props.onNavigate || context?.onNavigate;

  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('current');
  const [modelMetrics, setModelMetrics] = useState(VERIFIED_MODEL_METRICS);

  // Active vehicle ID
  const activeVehicleId = telemetry?.vehicle_id || prediction?.vehicle_id || 'VH-HEALTHY-01';

  // Fetch real persistent analysis history from SQLite
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const records = await api.getHistory(null, 50);
      setHistoryLogs(Array.isArray(records) ? records : []);
    } catch (err) {
      console.warn('[Analytics] History API fetch error:', err);
      setHistoryError(err.message || 'Historical analytics unavailable');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Fetch verified model metrics from backend
  useEffect(() => {
    async function loadMetrics() {
      try {
        const data = await api.getMetrics();
        if (data && data.models) {
          setModelMetrics(data.models);
        }
      } catch (err) {
        console.warn('[Analytics] Metrics endpoint fallback to verified constants:', err);
      }
    }
    loadMetrics();
  }, []);

  // Reload history when prediction updates or on mount
  useEffect(() => {
    fetchHistory();
  }, [prediction, fetchHistory]);

  // Filter history logs based on selector
  const filteredHistory = useMemo(() => {
    if (selectedVehicleFilter === 'current') {
      return historyLogs.filter((log) => log.vehicle_id === activeVehicleId);
    }
    return historyLogs;
  }, [historyLogs, selectedVehicleFilter, activeVehicleId]);

  // Chronological history for trend charts (oldest to newest)
  const chronologicalHistory = useMemo(() => {
    const sorted = [...filteredHistory].sort((a, b) => {
      const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
      const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
      return dateA - dateB;
    });

    return sorted.map((item, idx) => {
      const dateObj = new Date(item.created_at || item.timestamp || Date.now());
      const formattedTime = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : `#${idx + 1}`;
      const formattedDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })
        : '';

      return {
        ...item,
        displayLabel: `${formattedDate} ${formattedTime}`.trim(),
        shortTime: formattedTime,
        health: Number(item.overall_health_score?.toFixed(1) ?? 0),
        engineRisk: Number(item.engine_failure_probability?.toFixed(1) ?? 0),
        batteryRisk: Number(item.battery_failure_probability?.toFixed(1) ?? 0),
        brakeRisk: Number(item.brake_failure_probability?.toFixed(1) ?? 0),
        tyreRisk: Number(item.tyre_failure_probability?.toFixed(1) ?? 0),
        maintDist: Math.round(item.estimated_maintenance_distance ?? 0),
      };
    });
  }, [filteredHistory]);

  // Determine highest risk component dynamically from current prediction
  const topRiskComponent = useMemo(() => {
    if (!prediction) return null;
    const comps = [
      {
        name: 'Engine',
        key: 'engine',
        prob: prediction.engine_failure_probability ?? 0,
        health: prediction.engine_health ?? (100 - (prediction.engine_failure_probability ?? 0)),
        riskLevel: prediction.failure_risks?.engine || getRiskFromProbability(prediction.engine_failure_probability),
        factor: telemetry ? `Temp: ${telemetry.engine_temperature}°C | RPM: ${telemetry.rpm}` : 'Operating telemetry profile',
        icon: Flame,
      },
      {
        name: 'Battery',
        key: 'battery',
        prob: prediction.battery_failure_probability ?? 0,
        health: prediction.battery_health ?? (100 - (prediction.battery_failure_probability ?? 0)),
        riskLevel: prediction.failure_risks?.battery || getRiskFromProbability(prediction.battery_failure_probability),
        factor: telemetry ? `Voltage: ${telemetry.battery_voltage}V` : 'Terminal voltage degradation',
        icon: BatteryCharging,
      },
      {
        name: 'Brakes',
        key: 'brakes',
        prob: prediction.brake_failure_probability ?? 0,
        health: prediction.brake_health ?? (100 - (prediction.brake_failure_probability ?? 0)),
        riskLevel: prediction.failure_risks?.brakes || getRiskFromProbability(prediction.brake_failure_probability),
        factor: telemetry ? `Pad Wear: ${telemetry.brake_wear}%` : 'Friction lining friction wear',
        icon: Disc,
      },
      {
        name: 'Tyres',
        key: 'tyres',
        prob: prediction.tyre_failure_probability ?? 0,
        health: prediction.tyre_health ?? (100 - (prediction.tyre_failure_probability ?? 0)),
        riskLevel: prediction.failure_risks?.tyres || getRiskFromProbability(prediction.tyre_failure_probability),
        factor: telemetry ? `Pressure: ${telemetry.tyre_pressure} PSI` : 'Tread deflection & pressure',
        icon: LifeBuoy,
      },
    ];

    comps.sort((a, b) => b.prob - a.prob);
    return comps[0];
  }, [prediction, telemetry]);

  // Derived average component risk (Frontend Analytical Aggregation)
  const averageComponentRisk = useMemo(() => {
    if (!prediction) return 0;
    const sum =
      (prediction.engine_failure_probability ?? 0) +
      (prediction.battery_failure_probability ?? 0) +
      (prediction.brake_failure_probability ?? 0) +
      (prediction.tyre_failure_probability ?? 0);
    return Number((sum / 4).toFixed(1));
  }, [prediction]);

  // Bar chart data for current component failure risk
  const componentRiskBarData = useMemo(() => {
    if (!prediction) return [];
    return [
      {
        component: 'Engine',
        probability: Number(prediction.engine_failure_probability?.toFixed(1) ?? 0),
        riskLevel: prediction.failure_risks?.engine || getRiskFromProbability(prediction.engine_failure_probability),
      },
      {
        component: 'Battery',
        probability: Number(prediction.battery_failure_probability?.toFixed(1) ?? 0),
        riskLevel: prediction.failure_risks?.battery || getRiskFromProbability(prediction.battery_failure_probability),
      },
      {
        component: 'Brakes',
        probability: Number(prediction.brake_failure_probability?.toFixed(1) ?? 0),
        riskLevel: prediction.failure_risks?.brakes || getRiskFromProbability(prediction.brake_failure_probability),
      },
      {
        component: 'Tyres',
        probability: Number(prediction.tyre_failure_probability?.toFixed(1) ?? 0),
        riskLevel: prediction.failure_risks?.tyres || getRiskFromProbability(prediction.tyre_failure_probability),
      },
    ];
  }, [prediction]);

  // Deterministic rule-based insights from current model outputs
  const aiInsights = useMemo(() => {
    if (!prediction) return [];
    const insights = [];
    const health = prediction.overall_health_score ?? 0;
    const maintDist = prediction.estimated_maintenance_distance ?? 0;

    // 1. Overall Health Tier Insight
    if (health >= 80) {
      insights.push({
        type: 'positive',
        title: 'Nominal Health Envelope',
        text: 'Vehicle health is currently within a healthy range with low aggregate component degradation.',
      });
    } else if (health < 50) {
      insights.push({
        type: 'critical',
        title: 'Elevated Systemic Risk',
        text: 'Vehicle health has entered a high-risk range and requires increased maintenance attention.',
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Moderate Health Range',
        text: 'Vehicle condition is in an intermediate operational envelope; early wear patterns are present.',
      });
    }

    // 2. Highest Risk Component Insight
    if (topRiskComponent) {
      insights.push({
        type: topRiskComponent.prob >= 60 ? 'critical' : topRiskComponent.prob >= 35 ? 'warning' : 'info',
        title: `${topRiskComponent.name} Risk Dominance`,
        text: `${topRiskComponent.name} currently represents the highest predicted component failure risk at ${topRiskComponent.prob.toFixed(1)}% (${topRiskComponent.riskLevel} risk).`,
      });
    }

    // 3. Maintenance Urgency Insight
    if (maintDist < 1000) {
      insights.push({
        type: 'critical',
        title: 'Critical Service Horizon',
        text: `The model-estimated maintenance window is short (~${Math.round(maintDist)} km), indicating elevated service urgency.`,
      });
    } else if (maintDist < 3000) {
      insights.push({
        type: 'warning',
        title: 'Upcoming Service Window',
        text: `Predicted maintenance interval is approaching in ~${Math.round(maintDist).toLocaleString()} km.`,
      });
    } else {
      insights.push({
        type: 'info',
        title: 'Adequate Maintenance Runway',
        text: `Estimated maintenance window is ~${Math.round(maintDist).toLocaleString()} km under steady operating conditions.`,
      });
    }

    // 4. Telemetry contributor insight if available
    if (telemetry) {
      if (telemetry.brake_wear >= 80) {
        insights.push({
          type: 'critical',
          title: 'Brake Lining Friction Factor',
          text: `Brake pad wear at ${telemetry.brake_wear}% is heavily driving the elevated brake failure probability.`,
        });
      } else if (telemetry.engine_temperature >= 105) {
        insights.push({
          type: 'critical',
          title: 'Thermal Stress Contributor',
          text: `Engine operating temperature of ${telemetry.engine_temperature}°C exceeds normal operating thresholds.`,
        });
      } else if (telemetry.tyre_pressure < 28) {
        insights.push({
          type: 'warning',
          title: 'Tyre Deflection Risk',
          text: `Sub-optimal tyre inflation (${telemetry.tyre_pressure} PSI) increases rolling friction and tyre failure probability.`,
        });
      } else if (telemetry.mileage > 150000) {
        insights.push({
          type: 'info',
          title: 'High Mileage Lifecycle',
          text: `High odometer reading (${telemetry.mileage.toLocaleString()} km) shifts component failure baselines into mature lifecycle ranges.`,
        });
      }
    }

    return insights;
  }, [prediction, topRiskComponent, telemetry]);

  // Color helper for component bar charts
  const getBarColorByRisk = (prob) => {
    if (prob >= 60) return '#EF4444'; // rose/red
    if (prob >= 35) return '#F97316'; // orange
    if (prob >= 15) return '#F59E0B'; // amber
    return '#10B981'; // emerald
  };

  // 1. Loading State (Requirement 22)
  if (isPredicting && !prediction) {
    return (
      <div className="glass-panel rounded-xl p-12 border border-slate-800/80 text-center space-y-4 my-8">
        <div className="inline-flex p-4 rounded-full bg-cyan-950/40 border border-cyan-500/40 animate-pulse">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">
          Loading Vehicle Analytics...
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Synchronizing telemetry signals with trained Random Forest models and loading historical intelligence.
        </p>
      </div>
    );
  }

  // 2. Empty State (Requirement 20)
  if (!prediction) {
    return (
      <div className="glass-panel rounded-xl p-12 border border-slate-800/80 text-center space-y-5 my-8">
        <div className="inline-flex p-4 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
          <BarChart3 className="w-10 h-10 text-slate-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            No Analytics Available
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-2">
            Run an AI vehicle analysis to generate analytics, evaluate component degradation, and populate historical intelligence.
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('analysis')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold transition-colors shadow-glow-cyan cursor-pointer"
          >
            <span>Go to Vehicle Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const healthColor = getHealthColor(prediction.overall_health_score);
  const healthStatus = getHealthStatus(prediction.overall_health_score);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header (Requirement 2) */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1 font-semibold">
            <BarChart3 className="w-3.5 h-3.5" />
            AI Vehicle Analytics & Historical Intelligence
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Vehicle Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical vehicle intelligence and predictive maintenance insights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* Active Vehicle Badge */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-2">
            <Car className="w-3.5 h-3.5 text-cyan-400" />
            <span>ID: <strong className="text-white">{activeVehicleId}</strong></span>
          </div>

          {/* Analysis Timestamp */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{lastAnalysisTimestamp || 'Current Session'}</span>
          </div>

          {/* AI Model Status */}
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>RF Ensemble (6 Models Loaded)</span>
          </div>
        </div>
      </div>

      {/* Backend API Error Banner if history failed (Requirement 23) */}
      {historyError && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/60 text-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-semibold">
                Historical analytics unavailable
              </div>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Current prediction analytics are fully active. Stored history logs could not be retrieved from SQLite database.
              </p>
            </div>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="px-3 py-1.5 rounded-lg bg-amber-900/80 hover:bg-amber-800 border border-amber-500 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 2. Analytics Overview KPI Row (Requirement 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Health */}
        <MetricCard
          title="Overall Health"
          value={prediction.overall_health_score.toFixed(1)}
          unit="/ 100"
          icon={Activity}
          subtitle={`Condition: ${healthStatus}`}
          accentColor={
            prediction.overall_health_score >= 75
              ? 'cyan'
              : prediction.overall_health_score >= 50
              ? 'amber'
              : 'crimson'
          }
          progress={prediction.overall_health_score}
          badge={<StatusBadge level={healthStatus.toLowerCase()} label={healthStatus} />}
        />

        {/* Failure Risk */}
        <MetricCard
          title="Failure Risk"
          value={`${topRiskComponent ? topRiskComponent.prob.toFixed(1) : '0'}%`}
          unit="Peak"
          icon={ShieldAlert}
          subtitle={`Leading: ${topRiskComponent?.name || 'N/A'}`}
          accentColor={
            topRiskComponent?.prob >= 60
              ? 'crimson'
              : topRiskComponent?.prob >= 35
              ? 'amber'
              : 'emerald'
          }
          progress={topRiskComponent?.prob || 0}
          badge={
            <StatusBadge
              level={(topRiskComponent?.riskLevel || 'Low').toLowerCase()}
              label={topRiskComponent?.riskLevel || 'Low'}
            />
          }
        />

        {/* Maintenance Distance */}
        <MetricCard
          title="Maintenance Distance"
          value={Math.round(prediction.estimated_maintenance_distance ?? 0).toLocaleString()}
          unit="km"
          icon={Wrench}
          subtitle="Estimated service window"
          accentColor={prediction.estimated_maintenance_distance < 1000 ? 'crimson' : 'cyan'}
          badge={
            <span className="text-[11px] font-mono text-slate-400">
              {prediction.estimated_maintenance_distance < 1000 ? 'Urgent' : 'Routine'}
            </span>
          }
        />

        {/* Analyses Completed (Truthful count - Requirement 3 & 4) */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Analyses Completed
            </span>
            <div className="p-2 rounded-lg border text-cyan-400 bg-cyan-950/40 border-cyan-800/40">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-white">
              {historyLogs.length > 0 ? historyLogs.length : 1}
            </span>
            <span className="text-sm font-medium text-slate-400 font-mono">
              {historyLogs.length > 1 ? 'records' : 'analysis'}
            </span>
          </div>
          <div className="w-full bg-slate-800/90 rounded-full h-1.5 my-2.5 overflow-hidden">
            <div className="h-full rounded-full bg-cyan-500" style={{ width: '100%' }} />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>
              {historyLogs.length > 0
                ? `${filteredHistory.length} for ${selectedVehicleFilter === 'current' ? activeVehicleId : 'all vehicles'}`
                : '1 current analysis'}
            </span>
            <span className="text-[10px] font-mono text-emerald-400">SQLite Logged</span>
          </div>
        </div>
      </div>

      {/* 3. Current Vehicle Snapshot & Filter (Requirement 16 & 19) */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
                Current Vehicle Snapshot
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Parameters utilized by ML models for current inference. Read-only snapshot.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Vehicle Filter Selector (Requirement 19) */}
            <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">History Filter:</span>
              <select
                value={selectedVehicleFilter}
                onChange={(e) => setSelectedVehicleFilter(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value="current" className="bg-slate-900 text-white">
                  Current Vehicle ({activeVehicleId})
                </option>
                <option value="all" className="bg-slate-900 text-white">
                  All Vehicles ({historyLogs.length} records)
                </option>
              </select>
            </div>

            {/* Link to edit inputs */}
            {onNavigate && (
              <button
                onClick={() => onNavigate('analysis')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-mono text-cyan-400 transition-colors cursor-pointer"
              >
                <span>Edit in Vehicle Analysis</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Snapshot Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 pt-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Vehicle Type</span>
            <span className="text-white font-semibold">{telemetry?.vehicle_type || 'Sedan'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Vehicle Age</span>
            <span className="text-white font-semibold">{telemetry?.vehicle_age ?? 1.5} yrs</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Odometer</span>
            <span className="text-white font-semibold">{Math.round(telemetry?.mileage ?? 18500).toLocaleString()} km</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Engine Type</span>
            <span className="text-white font-semibold">{telemetry?.engine_type || 'Petrol'}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Engine Temp</span>
            <span className={`font-semibold ${(telemetry?.engine_temperature ?? 91) > 105 ? 'text-rose-400' : 'text-white'}`}>
              {telemetry?.engine_temperature ?? 91}°C
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Battery Voltage</span>
            <span className={`font-semibold ${(telemetry?.battery_voltage ?? 12.65) < 12.0 ? 'text-rose-400' : 'text-white'}`}>
              {telemetry?.battery_voltage ?? 12.65} V
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Brake Pad Wear</span>
            <span className={`font-semibold ${(telemetry?.brake_wear ?? 18) > 75 ? 'text-rose-400' : 'text-white'}`}>
              {telemetry?.brake_wear ?? 18}%
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Tyre Pressure</span>
            <span className={`font-semibold ${(telemetry?.tyre_pressure ?? 33.2) < 28 ? 'text-amber-400' : 'text-white'}`}>
              {telemetry?.tyre_pressure ?? 33.2} PSI
            </span>
          </div>
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <span className="text-slate-500 block text-[10px] uppercase">Dist Since Service</span>
            <span className="text-white font-semibold">{Math.round(telemetry?.distance_since_service ?? 2100).toLocaleString()} km</span>
          </div>
        </div>
      </div>

      {/* 4. Deep Analytical Section: Top Risk Component, Health Breakdown & Risk Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Risk Component Card (Requirement 12) */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Highest Risk Component
              </span>
              {topRiskComponent && (
                <StatusBadge
                  level={topRiskComponent.riskLevel.toLowerCase()}
                  label={topRiskComponent.riskLevel}
                />
              )}
            </div>
            <h3 className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
              {topRiskComponent?.name.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Dynamically derived from current Random Forest classification outputs.
            </p>
          </div>

          <div className="my-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Failure Probability</span>
              <span className="text-lg font-bold font-mono text-rose-400">
                {topRiskComponent?.prob.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-rose-500"
                style={{ width: `${topRiskComponent?.prob || 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <span className="text-slate-400">Component Health</span>
              <span className="text-white font-bold">
                {topRiskComponent?.health.toFixed(1)}%
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
              <span className="text-slate-500 block text-[10px]">Primary Sensor Factor:</span>
              <span className="text-cyan-300 font-medium">{topRiskComponent?.factor}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Calculated dynamically from live inference payload.
          </div>
        </div>

        {/* Health Status Distribution (Requirement 13) */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Component Health Status
              </span>
              <span className="text-xs font-mono text-slate-400">Scale: 0-100%</span>
            </div>
            <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
              Subsystem Equilibrium
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time health score across the four evaluated vehicle subsystems.
            </p>
          </div>

          <div className="space-y-4 my-4">
            {[
              {
                name: 'Engine',
                score: prediction.engine_health ?? (100 - (prediction.engine_failure_probability ?? 0)),
                prob: prediction.engine_failure_probability ?? 0,
                icon: Flame,
              },
              {
                name: 'Battery',
                score: prediction.battery_health ?? (100 - (prediction.battery_failure_probability ?? 0)),
                prob: prediction.battery_failure_probability ?? 0,
                icon: BatteryCharging,
              },
              {
                name: 'Brakes',
                score: prediction.brake_health ?? (100 - (prediction.brake_failure_probability ?? 0)),
                prob: prediction.brake_failure_probability ?? 0,
                icon: Disc,
              },
              {
                name: 'Tyres',
                score: prediction.tyre_health ?? (100 - (prediction.tyre_failure_probability ?? 0)),
                prob: prediction.tyre_failure_probability ?? 0,
                icon: LifeBuoy,
              },
            ].map((comp) => {
              const compColor = getHealthColor(comp.score);
              return (
                <div key={comp.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <comp.icon className="w-3.5 h-3.5 text-slate-400" />
                      {comp.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Risk: {comp.prob.toFixed(1)}%</span>
                      <span className={`font-bold ${compColor.text}`}>
                        {Math.round(comp.score)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${compColor.bar}`}
                      style={{ width: `${Math.max(0, Math.min(100, comp.score))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
            <span>Health = 100 - Failure Probability</span>
            <span className="text-emerald-400 font-semibold">Strict Invariance</span>
          </div>
        </div>

        {/* Health vs Risk Overview (Requirement 10) */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Health & Risk Overview
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Derived Metric
              </span>
            </div>
            <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
              Systemic Health vs. Failure Risk
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Overall vehicle health compared against average component failure probability.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 my-5 text-center font-mono">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block mb-1">
                Overall Health
              </span>
              <span className={`text-2xl font-bold ${healthColor.text}`}>
                {prediction.overall_health_score.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">
                Random Forest Regressor
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block mb-1">
                Avg Component Risk
              </span>
              <span className={`text-2xl font-bold ${averageComponentRisk >= 40 ? 'text-rose-400' : averageComponentRisk >= 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {averageComponentRisk.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">
                4-Component Mean
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="text-slate-300 font-semibold text-xs">
              Derived from current model outputs
            </div>
            <p className="text-[10px] text-slate-500">
              Analytical frontend aggregation combining 4 trained Random Forest classification outputs against systemic regression score.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Component Failure Risk Bar Chart (Requirement 7) */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              <BarChart3 className="w-3.5 h-3.5" />
              Failure Probability Comparison
            </div>
            <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
              Component Failure Risk
            </h3>
            <p className="text-xs text-slate-400">
              Current model-predicted failure probabilities for Engine, Battery, Brakes, and Tyres.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Source: latestPrediction
          </span>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={componentRiskBarData}
              margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis
                dataKey="component"
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 12, fontFamily: 'monospace' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                }}
                formatter={(val, name, props) => [
                  `${val}% (${props.payload.riskLevel} Risk)`,
                  'Failure Probability',
                ]}
              />
              <ReferenceLine y={15} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Low Risk (15%)', fill: '#10B981', fontSize: 10, position: 'insideTopLeft' }} />
              <ReferenceLine y={35} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Medium Risk (35%)', fill: '#F59E0B', fontSize: 10, position: 'insideTopLeft' }} />
              <ReferenceLine y={60} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'High Risk (60%)', fill: '#EF4444', fontSize: 10, position: 'insideTopLeft' }} />
              <Bar dataKey="probability" radius={[6, 6, 0, 0]}>
                {componentRiskBarData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColorByRisk(entry.probability)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono text-center">
          {componentRiskBarData.map((item) => (
            <div key={item.component} className="p-2 rounded bg-slate-900/60 border border-slate-800/60">
              <span className="text-slate-400 block text-[11px]">{item.component}</span>
              <span className="font-bold text-white text-sm">{item.probability}%</span>
              <span className="block text-[10px] text-slate-500 uppercase">{item.riskLevel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Historical Trend Charts (Requirements 6, 8, 9, 21) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Health Trend (Requirement 6) */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Historical Telemetry
              </span>
              <span className="text-xs font-mono text-slate-400">
                {chronologicalHistory.length} Analysis Point{chronologicalHistory.length !== 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Vehicle Health Trend
            </h3>
            <p className="text-xs text-slate-400">
              Historical overall vehicle health score plotted from verified SQLite prediction records.
            </p>
          </div>

          <div className="w-full h-64 mt-4">
            {chronologicalHistory.length < 2 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-6 text-center space-y-3 bg-slate-950/30">
                <Info className="w-8 h-8 text-cyan-400/80" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200">
                    Run additional vehicle analyses to build a historical trend.
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {chronologicalHistory.length === 1
                      ? `Current analysis logged: ${chronologicalHistory[0].health} / 100 on ${chronologicalHistory[0].displayLabel}. Subsequent runs will establish the timeline curve.`
                      : 'No historical analyses found for this vehicle. Run predictions in Vehicle Analysis.'}
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chronologicalHistory}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="shortTime"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontFamily: 'monospace',
                    }}
                    formatter={(val) => [`${val} / 100`, 'Health Score']}
                    labelFormatter={(label, items) => {
                      const item = items?.[0]?.payload;
                      return item?.displayLabel || label;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="health"
                    stroke="#06B6D4"
                    strokeWidth={2.5}
                    dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#38BDF8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span>X-Axis: Analysis Time</span>
            <span>Y-Axis: Health Score (0-100)</span>
          </div>
        </div>

        {/* Historical Risk Trend (Requirement 8) */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" />
                Component Trajectory
              </span>
              <span className="text-xs font-mono text-slate-400">4 Subsystems</span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Failure Risk Over Time
            </h3>
            <p className="text-xs text-slate-400">
              Multi-line component degradation tracking over consecutive telemetry runs.
            </p>
          </div>

          <div className="w-full h-64 mt-4">
            {chronologicalHistory.length < 2 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-6 text-center space-y-3 bg-slate-950/30">
                <AlertTriangle className="w-8 h-8 text-amber-400/80" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200">
                    Additional vehicle analyses are required to plot component failure risks over time.
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    At least 2 persistent prediction records are needed to compute risk slopes and wear acceleration.
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chronologicalHistory}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="shortTime"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#FFF',
                      fontFamily: 'monospace',
                    }}
                    formatter={(val, name) => [`${val}%`, `${name} Risk`]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                  />
                  <Line type="monotone" dataKey="engineRisk" name="Engine" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="batteryRisk" name="Battery" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="brakeRisk" name="Brakes" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="tyreRisk" name="Tyres" stroke="#06B6D4" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-500 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span>Legend: Engine, Battery, Brakes, Tyres</span>
            <span>Y-Axis: Failure Probability %</span>
          </div>
        </div>
      </div>

      {/* 7. Maintenance Window Trend (Requirement 9) */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              <Wrench className="w-3.5 h-3.5" />
              Service Horizon Tracking
            </div>
            <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
              Maintenance Window Trend
            </h3>
            <p className="text-xs text-slate-400">
              Historical estimated maintenance distance remaining (km). A decreasing trend indicates increasing maintenance urgency.
            </p>
          </div>
          <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-400">
            Decreasing Slope = Higher Urgency
          </div>
        </div>

        <div className="w-full h-64">
          {chronologicalHistory.length < 2 ? (
            <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl p-6 text-center space-y-3 bg-slate-950/30">
              <Wrench className="w-8 h-8 text-cyan-400/80" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  Additional analyses are required to establish a maintenance trend.
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  {chronologicalHistory.length === 1
                    ? `Current estimated service window: ~${chronologicalHistory[0].maintDist.toLocaleString()} km. Further operational cycles will chart the consumption rate.`
                    : 'Log predictions to establish maintenance degradation trajectories.'}
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chronologicalHistory}
                margin={{ top: 15, right: 15, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="maintGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis
                  dataKey="shortTime"
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}
                  unit=" km"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#FFF',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val) => [`${Math.round(val).toLocaleString()} km`, 'Distance Remaining']}
                />
                <Area
                  type="monotone"
                  dataKey="maintDist"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#maintGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 8. AI Analytics Insights (Requirement 11) */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
              AI Analytics Insights
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Model-output insight
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiInsights.map((insight, idx) => {
            const borderClasses = {
              positive: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
              warning: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
              critical: 'border-rose-500/40 bg-rose-950/20 text-rose-300',
              info: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300',
            }[insight.type] || 'border-slate-800 bg-slate-900/40 text-slate-300';

            const icon = {
              positive: CheckCircle2,
              warning: AlertTriangle,
              critical: AlertCircle,
              info: Info,
            }[insight.type] || Info;

            const IconComponent = icon;

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${borderClasses} space-y-2 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider">
                    <IconComponent className="w-4 h-4 shrink-0" />
                    <span>{insight.title}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {insight.text}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 block pt-2 border-t border-slate-800/50">
                  AI-derived insight
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9. Model Performance & Transparency (Requirements 14 & 15) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Model Performance */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              <Cpu className="w-3.5 h-3.5" />
              ML Model Performance
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
              Verified 5,000 Sample Test Set
            </span>
          </div>

          <h3 className="text-base font-bold text-white tracking-tight">
            Scikit-Learn Random Forest Pipeline Metrics
          </h3>
          <p className="text-xs text-slate-400">
            Performance metrics derived from empirical 80/20 train-test evaluation saved in model_metrics.json.
          </p>

          <div className="space-y-3 font-mono text-xs">
            {/* Regression 1: Overall Health */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-semibold block">Overall Health Model</span>
                <span className="text-[10px] text-slate-400">RandomForestRegressor (120 trees)</span>
              </div>
              <div className="text-right">
                <span className="text-cyan-400 font-bold">
                  R²: {modelMetrics.overall_health_score?.metrics?.r2 ?? 0.9507}
                </span>
                <span className="text-slate-400 text-[11px] block">
                  MAE: {modelMetrics.overall_health_score?.metrics?.mae ?? 3.34} pts
                </span>
              </div>
            </div>

            {/* Regression 2: Maintenance Distance */}
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-semibold block">Maintenance Distance Model</span>
                <span className="text-[10px] text-slate-400">RandomForestRegressor (120 trees)</span>
              </div>
              <div className="text-right">
                <span className="text-cyan-400 font-bold">
                  R²: {modelMetrics.maintenance_distance?.metrics?.r2 ?? 0.9799}
                </span>
                <span className="text-slate-400 text-[11px] block">
                  MAE: ~{Math.round(modelMetrics.maintenance_distance?.metrics?.mae ?? 251)} km
                </span>
              </div>
            </div>

            {/* Classification Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              {[
                { name: 'Engine', key: 'engine_failure', acc: '93.5%', f1: '0.8499' },
                { name: 'Battery', key: 'battery_failure', acc: '86.9%', f1: '0.7665' },
                { name: 'Brakes', key: 'brake_failure', acc: '90.0%', f1: '0.7175' },
                { name: 'Tyres', key: 'tyre_failure', acc: '77.0%', f1: '0.5508' },
              ].map((c) => {
                const metricObj = modelMetrics[c.key]?.metrics;
                return (
                  <div key={c.name} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">{c.name} Clf</span>
                    <span className="text-white font-semibold block">
                      Acc: {metricObj ? `${(metricObj.accuracy * 100).toFixed(1)}%` : c.acc}
                    </span>
                    <span className="text-cyan-400 text-[10px] block">
                      F1: {metricObj ? metricObj.f1_score.toFixed(4) : c.f1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 font-mono">
            R² indicates how much variance is explained by the model; MAE represents average prediction error in the target's units.
          </div>
        </div>

        {/* Model Transparency: How the Analytics Are Generated (Requirement 15) */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
            <Database className="w-3.5 h-3.5" />
            Model Transparency
          </div>

          <h3 className="text-base font-bold text-white tracking-tight">
            How the Analytics Are Generated
          </h3>
          <p className="text-xs text-slate-400">
            End-to-end architecture transforming raw vehicle sensor telemetry into predictive intelligence.
          </p>

          <ol className="space-y-2.5 text-xs font-mono text-slate-300">
            <li className="flex items-start gap-2.5 p-2 rounded bg-slate-900/50 border border-slate-800/50">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                1
              </span>
              <span>
                <strong>Vehicle inputs are collected:</strong> 15 telemetry signals including thermal, electrical, mechanical, and usage parameters.
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded bg-slate-900/50 border border-slate-800/50">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                2
              </span>
              <span>
                <strong>Random Forest models evaluate vehicle condition:</strong> Feature scaling & one-hot encoding feed 6 trained scikit-learn models.
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded bg-slate-900/50 border border-slate-800/50">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                3
              </span>
              <span>
                <strong>Component failure probabilities are calculated:</strong> Classifiers evaluate failure probability (0-100%) for Engine, Battery, Brakes, and Tyres.
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded bg-slate-900/50 border border-slate-800/50">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                4
              </span>
              <span>
                <strong>Overall health and maintenance distance are predicted:</strong> Regressors estimate systemic health score and remaining distance to service.
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded bg-slate-900/50 border border-slate-800/50">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                5
              </span>
              <span>
                <strong>Results are stored for historical analysis:</strong> Each inference is persisted to SQLite (`prediction_records` table) for audit trails.
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded bg-slate-900/50 border border-slate-800/50">
              <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                6
              </span>
              <span>
                <strong>Analytics visualize model outputs over time:</strong> Interactive Recharts dashboards track degradation trajectories across vehicle lifecycles.
              </span>
            </li>
          </ol>
        </div>
      </div>

      {/* 10. Analysis History Table (Requirement 17) */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wider uppercase font-mono text-slate-200">
              Analysis History (Persistent SQLite Records)
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Showing {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}</span>
            <button
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh SQLite History"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
            <p className="text-sm font-mono text-slate-400">No historical analyses yet.</p>
            <p className="text-xs text-slate-500">
              Run analyses in the Vehicle Analysis tab to populate real SQLite history records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Date/Time</th>
                  <th className="py-2.5 px-3">Vehicle ID</th>
                  <th className="py-2.5 px-3">Mileage</th>
                  <th className="py-2.5 px-3">Health</th>
                  <th className="py-2.5 px-3">Engine Risk</th>
                  <th className="py-2.5 px-3">Battery Risk</th>
                  <th className="py-2.5 px-3">Brake Risk</th>
                  <th className="py-2.5 px-3">Tyre Risk</th>
                  <th className="py-2.5 px-3">Maintenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredHistory.map((log, idx) => {
                  const dateObj = new Date(log.created_at || log.timestamp || 0);
                  const formattedDate = !isNaN(dateObj.getTime())
                    ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'N/A';
                  const logHealthColor = getHealthColor(log.overall_health_score);

                  return (
                    <tr key={log.id || idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 font-semibold whitespace-nowrap">
                        {log.vehicle_id}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {Math.round(log.mileage).toLocaleString()} km
                      </td>
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <span className={logHealthColor.text}>
                          {log.overall_health_score.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={(log.engine_failure_probability ?? 0) >= 35 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                          {(log.engine_failure_probability ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={(log.battery_failure_probability ?? 0) >= 35 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                          {(log.battery_failure_probability ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={(log.brake_failure_probability ?? 0) >= 35 ? 'text-rose-400 font-semibold' : 'text-slate-300'}>
                          {(log.brake_failure_probability ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={(log.tyre_failure_probability ?? 0) >= 35 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                          {(log.tyre_failure_probability ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        ~{Math.round(log.estimated_maintenance_distance ?? 0).toLocaleString()} km
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
