// ExportAnalyticsButton - Exports analytics data as CSV or PNG
// Requirements: 18.9, 18.10

import React, { useState, useCallback } from 'react';
import { AnalyticsService } from '../../services/AnalyticsService';
import type { DateRange } from '../../types/analytics';

interface ExportAnalyticsButtonProps {
  workspaceId: string;
  dateRange: DateRange;
}

export const ExportAnalyticsButton: React.FC<ExportAnalyticsButtonProps> = ({
  workspaceId,
  dateRange,
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async (format: 'csv' | 'png') => {
    setExporting(true);
    try {
      const service = new AnalyticsService();
      if (format === 'csv') {
        const csv = await service.exportCSV(workspaceId, {
          format: 'csv',
          dateRange: { range: dateRange },
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tealtiger-analytics-${dateRange}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const dataUrl = await service.exportChart(workspaceId, {
          format: 'png',
          dateRange: { range: dateRange },
        });
        if (dataUrl) {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `tealtiger-analytics-${dateRange}.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    } catch {
      console.warn('Export failed');
    } finally {
      setExporting(false);
    }
  }, [workspaceId, dateRange]);

  return (
    <div className="flex gap-1">
      <button
        onClick={() => handleExport('csv')}
        disabled={exporting}
        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
      >
        📊 CSV
      </button>
      <button
        onClick={() => handleExport('png')}
        disabled={exporting}
        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
      >
        📈 Chart
      </button>
    </div>
  );
};
