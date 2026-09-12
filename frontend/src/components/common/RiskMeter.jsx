import React from 'react';

/**
 * Reusable RiskMeter component for visualizing failure probability (0–100%).
 * Features semantic risk coloring, tick indicators (0%, 50%, 100%), and accessible aria attributes.
 */
export const RiskMeter = ({
  probability = 0,
  riskLevel = 'Low',
  label = 'Failure Probability',
  size = 'md',
}) => {
  // Normalize probability to 0–100 range without premature integer rounding
  const probNum = Number(probability) || 0;
  const rawProb = probNum <= 1.0 && probNum > 0 ? probNum * 100 : probNum;
  const clamped = Math.min(100, Math.max(0, rawProb));

  // Determine semantic color and styling based on standardized risk scale:
  // <15% Low (Emerald), 15–35% Moderate (Amber), 35–60% High (Orange/Rose), >=60% Critical (Crimson)
  const getMeterTheme = () => {
    const level = (riskLevel || '').toLowerCase();
    if (level === 'critical' || clamped >= 60.0) {
      return {
        fill: 'bg-gradient-to-r from-rose-600 to-red-500',
        glow: 'shadow-[0_0_12px_rgba(239,68,68,0.45)]',
        text: 'text-rose-400',
        border: 'border-rose-500/40',
        badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-600/60',
      };
    }
    if (level === 'high' || clamped >= 35.0) {
      return {
        fill: 'bg-gradient-to-r from-orange-500 to-rose-500',
        glow: 'shadow-[0_0_10px_rgba(249,115,22,0.4)]',
        text: 'text-orange-400',
        border: 'border-orange-500/40',
        badgeBg: 'bg-orange-950/60 text-orange-300 border-orange-600/60',
      };
    }
    if (level === 'medium' || level === 'moderate' || clamped >= 15.0) {
      return {
        fill: 'bg-gradient-to-r from-yellow-500 to-amber-500',
        glow: 'shadow-[0_0_8px_rgba(245,158,11,0.35)]',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-600/60',
      };
    }
    return {
      fill: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.35)]',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-600/60',
    };
  };

  const theme = getMeterTheme();
  const heightClass = size === 'lg' ? 'h-3.5' : size === 'sm' ? 'h-2' : 'h-2.5';

  return (
    <div className="space-y-1.5 w-full">
      {/* Header Label and Value */}
      <div className="flex items-baseline justify-between text-xs font-mono">
        <span className="text-slate-400 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-bold ${theme.text}`}>
            {Number(clamped.toFixed(1))}%
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            ({(clamped / 100).toFixed(2)})
          </span>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${clamped}%, Risk: ${riskLevel}`}
        className={`w-full bg-slate-900 border border-slate-800 rounded-full ${heightClass} relative overflow-hidden p-0.5`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${theme.fill} ${theme.glow}`}
          style={{ width: `${Math.max(2, clamped)}%` }}
        />
      </div>

      {/* Metric Ticks: 0%, 50%, 100% */}
      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-0.5 select-none">
        <span>0%</span>
        <span className="flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span>50%</span>
        </span>
        <span>100%</span>
      </div>
    </div>
  );
};

export default RiskMeter;
