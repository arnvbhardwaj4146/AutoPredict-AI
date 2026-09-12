/**
 * Utility formatters for vehicle telemetry and health metrics.
 * 
 * Standardized Health Scales:
 * 90–100 = Excellent
 * 75–89 = Good
 * 60–74 = Fair
 * 40–59 = Poor
 * 0–39 = Critical
 * 
 * Standardized Failure Risk Scales:
 * 0–15% = Low
 * 15–35% = Medium
 * 35–60% = High
 * 60–100% = Critical
 */

export const formatDistance = (km) => {
  if (km === undefined || km === null || isNaN(km)) return '-- km';
  return `${Math.round(km).toLocaleString()} km`;
};

export const formatPercent = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '--%';
  return `${Math.round(val)}%`;
};

export const getHealthStatus = (score) => {
  const s = Number(score) || 0;
  if (s >= 90) return 'Excellent';
  if (s >= 75) return 'Good';
  if (s >= 60) return 'Fair';
  if (s >= 40) return 'Poor';
  return 'Critical';
};

export const getHealthColor = (score) => {
  const s = Number(score) || 0;
  if (s >= 90) return {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-glow-emerald',
    bar: 'bg-emerald-500',
    hex: '#10B981',
    label: 'Excellent',
  };
  if (s >= 75) return {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    glow: 'shadow-glow-cyan',
    bar: 'bg-cyan-500',
    hex: '#06B6D4',
    label: 'Good',
  };
  if (s >= 60) return {
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    glow: 'shadow-glow-cyan',
    bar: 'bg-sky-500',
    hex: '#38BDF8',
    label: 'Fair',
  };
  if (s >= 40) return {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-glow-amber',
    bar: 'bg-amber-500',
    hex: '#F59E0B',
    label: 'Poor',
  };
  return {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    glow: 'shadow-glow-crimson',
    bar: 'bg-rose-500',
    hex: '#EF4444',
    label: 'Critical',
  };
};

export const getRiskFromProbability = (prob) => {
  const p = Number(prob) || 0;
  const norm = p > 0 && p <= 1.0 ? p * 100 : p;
  if (norm >= 60.0) return 'Critical';
  if (norm >= 35.0) return 'High';
  if (norm >= 15.0) return 'Moderate';
  return 'Low';
};

export const getRiskBadgeStyle = (risk) => {
  const r = (risk || 'low').toLowerCase();
  switch (r) {
    case 'critical':
    case 'critical risk':
      return {
        bg: 'bg-rose-950/80',
        text: 'text-rose-300 font-bold tracking-wide',
        border: 'border-rose-600',
        dot: 'bg-rose-500 shadow-[0_0_8px_#EF4444]',
      };
    case 'high':
    case 'high risk':
      return {
        bg: 'bg-rose-950/50',
        text: 'text-rose-400 font-semibold',
        border: 'border-rose-500/40',
        dot: 'bg-rose-500',
      };
    case 'medium':
    case 'moderate':
    case 'moderate risk':
      return {
        bg: 'bg-amber-950/50',
        text: 'text-amber-400 font-semibold',
        border: 'border-amber-500/40',
        dot: 'bg-amber-500',
      };
    case 'low':
    case 'low / healthy':
    case 'healthy':
    default:
      return {
        bg: 'bg-emerald-950/40',
        text: 'text-emerald-400 font-medium',
        border: 'border-emerald-500/30',
        dot: 'bg-emerald-500',
      };
  }
};

/**
 * Single source of truth for composite vehicle risk classification.
 * 
 * Reusable Rule:
 * - Critical: overall health < 25 OR highest component failure probability >= 60%
 * - High:     overall health < 50 OR highest component failure probability >= 35%
 * - Moderate: overall health < 80 OR highest component failure probability >= 15%
 * - Low / Healthy: otherwise
 */
export const getCompositeRisk = (healthOrPrediction, maybeProbs = null) => {
  let health = 100;
  let probs = [];

  if (typeof healthOrPrediction === 'object' && healthOrPrediction !== null) {
    if (maybeProbs === null) {
      // Direct prediction object passed
      const pred = healthOrPrediction;
      health = Number(pred.overall_health_score ?? 100);
      probs = [
        pred.engine_failure_probability,
        pred.battery_failure_probability,
        pred.brake_failure_probability,
        pred.tyre_failure_probability,
      ];
    } else {
      health = Number(healthOrPrediction);
      probs = Array.isArray(maybeProbs) ? maybeProbs : Object.values(maybeProbs);
    }
  } else {
    health = Number(healthOrPrediction ?? 100);
    if (Array.isArray(maybeProbs)) {
      probs = maybeProbs;
    } else if (typeof maybeProbs === 'object' && maybeProbs !== null) {
      probs = Object.values(maybeProbs);
    } else if (maybeProbs !== null && maybeProbs !== undefined) {
      probs = [Number(maybeProbs)];
    }
  }

  // Normalize component probabilities to 0–100 scale without premature rounding
  const normProbs = probs.map((p) => {
    const raw = Number(p ?? 0);
    return raw > 0 && raw <= 1.0 ? raw * 100 : raw;
  });

  const maxCompProb = normProbs.length > 0 ? Math.max(...normProbs) : 0;

  if (health < 25 || maxCompProb >= 60.0) {
    return {
      level: 'Critical',
      label: 'Critical',
      color: 'rose',
      badge: 'bg-rose-950/80 text-rose-300 border-rose-600',
      maxCompProb,
      health,
    };
  }
  if (health < 50 || maxCompProb >= 35.0) {
    return {
      level: 'High',
      label: 'High Risk',
      color: 'orange',
      badge: 'bg-orange-950/80 text-orange-300 border-orange-600',
      maxCompProb,
      health,
    };
  }
  if (health < 80 || maxCompProb >= 15.0) {
    return {
      level: 'Moderate',
      label: 'Moderate Risk',
      color: 'amber',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-600',
      maxCompProb,
      health,
    };
  }
  return {
    level: 'Low',
    label: 'Low / Healthy',
    color: 'emerald',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-600',
    maxCompProb,
    health,
  };
};
