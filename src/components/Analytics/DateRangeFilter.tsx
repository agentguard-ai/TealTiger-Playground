// DateRangeFilter - Selects time range for analytics data
// Requirements: 18.1

import React from 'react';
import type { DateRange } from '../../types/analytics';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const RANGES: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '365d', label: '1 Year' },
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => (
  <div className="flex gap-1 bg-gray-800 rounded p-0.5">
    {RANGES.map((r) => (
      <button
        key={r.value}
        onClick={() => onChange(r.value)}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          value === r.value
            ? 'bg-teal-600 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
        aria-pressed={value === r.value}
      >
        {r.label}
      </button>
    ))}
  </div>
);
