// MetricCard - Displays a single metric with label and optional trend
// Requirements: 18.1

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  color = 'text-teal-400',
  subtitle,
}) => (
  <div className="bg-gray-800 border border-gray-700 rounded p-3">
    <div className="flex items-center gap-2 mb-1">
      {icon && <span className="text-sm">{icon}</span>}
      <span className="text-xs text-gray-400">{label}</span>
    </div>
    <div className={`text-xl font-semibold ${color}`}>{value}</div>
    {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
  </div>
);
