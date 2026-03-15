// ExportCostReportButton - Downloads cost report as CSV
// Requirements: 20.6

import React, { useState, useCallback } from 'react';
import { CostAllocationService } from '../../services/CostAllocationService';

interface ExportCostReportButtonProps {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
}

export const ExportCostReportButton: React.FC<ExportCostReportButtonProps> = ({
  workspaceId, startDate, endDate,
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const service = new CostAllocationService();
      const csv = await service.exportCostReport(workspaceId, startDate, endDate);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tealtiger-cost-report.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      console.warn('Export failed');
    } finally {
      setExporting(false);
    }
  }, [workspaceId, startDate, endDate]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
    >
      {exporting ? 'Exporting...' : '📊 Export CSV'}
    </button>
  );
};
