import React, { useState } from 'react';
import { X, Download, FileText, FileJson, FileType, Shield } from 'lucide-react';
import { DateRangeFilter, type DateRange } from './DateRangeFilter';
import { EventTypeFilter } from './EventTypeFilter';
import { ExportMetadataDisplay } from './ExportMetadataDisplay';
import { ScheduledExportSettings, type ExportSchedule } from './ScheduledExportSettings';
import { auditTrailService } from '../../services/AuditTrailService';
import type { AuditAction, AuditFilters } from '../../types/audit';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface AuditExportModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AuditExportModal - Modal with format selection (CSV/JSON/PDF)
 * Requirements: 11.1-11.10
 */
export const AuditExportModal: React.FC<AuditExportModalProps> = ({
  workspaceId,
  isOpen,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });
  const [selectedEventTypes, setSelectedEventTypes] = useState<AuditAction[]>([]);
  const [schedule, setSchedule] = useState<ExportSchedule>('none');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setSignature(null);

    try {
      const filters: AuditFilters = {
        dateRange,
        actions: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
      };

      let exportData: string | Blob;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case 'csv':
          exportData = await auditTrailService.exportCSV(workspaceId, filters);
          filename = `audit-export-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          exportData = await auditTrailService.exportJSON(workspaceId, filters);
          filename = `audit-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
        case 'pdf':
          exportData = await auditTrailService.exportPDF(workspaceId, filters);
          filename = `audit-export-${Date.now()}.pdf`;
          mimeType = 'application/pdf';
          break;
      }

      // Generate signature for tamper detection
      if (typeof exportData === 'string' && showSignature) {
        const sig = await auditTrailService.signExport(exportData);
        setSignature(sig);
      }

      // Download the file
      const blob =
        exportData instanceof Blob
          ? exportData
          : new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success message
      setExportError(null);
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(
        error instanceof Error ? error.message : 'Failed to export audit log'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { value: 'csv', label: 'CSV', icon: <FileText className="w-5 h-5" /> },
    { value: 'json', label: 'JSON', icon: <FileJson className="w-5 h-5" /> },
    { value: 'pdf', label: 'PDF', icon: <FileType className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Export Audit Trail</h2>
            <p className="text-sm text-gray-500 mt-1">
              Export audit logs for compliance and analysis
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Format selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {formatOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                      format === option.value
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {option.icon}
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date range filter */}
            <DateRangeFilter value={dateRange} onChange={setDateRange} />

            {/* Event type filter */}
            <EventTypeFilter
              selectedTypes={selectedEventTypes}
              onChange={setSelectedEventTypes}
            />

            {/* Signature option */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                id="include-signature"
                checked={showSignature}
                onChange={(e) => setShowSignature(e.target.checked)}
                className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <label htmlFor="include-signature" className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  Include SHA-256 signature for tamper detection
                </span>
              </label>
            </div>

            {/* Signature display */}
            {signature && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xs font-medium text-green-800 mb-1">
                  Export Signature (SHA-256)
                </div>
                <div className="text-xs text-green-700 font-mono break-all">
                  {signature}
                </div>
              </div>
            )}

            {/* Export metadata preview */}
            <ExportMetadataDisplay
              timestamp={new Date()}
              exportedBy="Current User"
              filters={{
                dateRange,
                actions: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
              }}
              totalEvents={0}
            />

            {/* Scheduled exports */}
            <ScheduledExportSettings
              schedule={schedule}
              recipients={recipients}
              onScheduleChange={setSchedule}
              onRecipientsChange={setRecipients}
            />

            {/* Error message */}
            {exportError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-800">{exportError}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            Sensitive data will be automatically redacted from exports
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
