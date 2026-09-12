import React from 'react';

export const MetricCard = ({
  title,
  value,
  unit = '',
  icon: Icon,
  subtitle,
  accentColor = 'cyan', // 'cyan', 'emerald', 'amber', 'crimson'
  badge,
  progress,
  className = '',
}) => {
  const accentBorder = {
    cyan: 'hover:border-cyan-500/40',
    emerald: 'hover:border-emerald-500/40',
    amber: 'hover:border-amber-500/40',
    crimson: 'hover:border-rose-500/40',
  }[accentColor] || 'hover:border-slate-700';

  const iconColor = {
    cyan: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40',
    emerald: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    amber: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    crimson: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
  }[accentColor] || 'text-slate-400 bg-slate-900 border-slate-800';

  const barColor = {
    cyan: 'bg-cyan-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    crimson: 'bg-rose-500',
  }[accentColor] || 'bg-cyan-500';

  return (
    <div className={`glass-panel rounded-xl p-5 border border-slate-800/80 transition-all duration-200 ${accentBorder} ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg border ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="text-2xl lg:text-3xl font-bold font-mono tracking-tight text-white">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-slate-400 font-mono">
            {unit}
          </span>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-full bg-slate-800/90 rounded-full h-1.5 my-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
        {subtitle && <span>{subtitle}</span>}
        {badge && <div>{badge}</div>}
      </div>
    </div>
  );
};

export default MetricCard;
