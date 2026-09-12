import React from 'react';
import { getRiskBadgeStyle } from '../../utils/formatters';

export const StatusBadge = ({ level = 'low', label, size = 'sm' }) => {
  const displayLabel = label || level;
  const style = getRiskBadgeStyle(level);
  const sizeClasses = size === 'lg' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${style.border} ${style.text} ${sizeClasses} uppercase font-mono tracking-wider shadow-sm`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
