import React from 'react';
import { Calendar } from 'lucide-react';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/**
 * DateRangeFilter - Predefined ranges (30/90/365 days) and custom
 * Requirements: 11.4, 11.6
 */
export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  const presetRanges = [
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'Last 365 Days', days: 365 },
  ];

  const handlePresetClick = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    onChange({ start, end });
  };

  const handleCustomStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = new Date(e.target.value);
    onChange({ ...value, start });
  };

  const handleCustomEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const end = new Date(e.target.value);
    onChange({ ...value, end });
  };

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Calendar className="w-4 h-4" />
        <span>Date Range</span>
      </div>

      {/* Preset ranges */}
      <div className="flex flex-wrap gap-2">
        {presetRanges.map((preset) => (
          <button
            key={preset.days}
            onClick={() => handlePresetClick(preset.days)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="space-y-2">
        <label className="block text-sm text-gray-600">Custom Range</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start-date" className="block text-xs text-gray-500 mb-1">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={formatDateForInput(value.start)}
              onChange={handleCustomStartChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-xs text-gray-500 mb-1">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={formatDateForInput(value.end)}
              onChange={handleCustomEndChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
