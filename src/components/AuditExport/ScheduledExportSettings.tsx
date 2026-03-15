import React, { useState } from 'react';
import { Clock, Mail } from 'lucide-react';

export type ExportSchedule = 'none' | 'weekly' | 'monthly';

export interface ScheduledExportSettingsProps {
  schedule: ExportSchedule;
  recipients: string[];
  onScheduleChange: (schedule: ExportSchedule) => void;
  onRecipientsChange: (recipients: string[]) => void;
}

/**
 * ScheduledExportSettings - Configure automated exports
 * Requirements: 11.8, 11.10
 */
export const ScheduledExportSettings: React.FC<ScheduledExportSettingsProps> = ({
  schedule,
  recipients,
  onScheduleChange,
  onRecipientsChange,
}) => {
  const [emailInput, setEmailInput] = useState('');

  const handleAddRecipient = () => {
    const email = emailInput.trim();
    if (email && !recipients.includes(email)) {
      onRecipientsChange([...recipients, email]);
      setEmailInput('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    onRecipientsChange(recipients.filter((r) => r !== email));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRecipient();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Clock className="w-4 h-4" />
        <span>Scheduled Exports</span>
      </div>

      {/* Schedule frequency */}
      <div className="space-y-2">
        <label className="block text-sm text-gray-600">Frequency</label>
        <select
          value={schedule}
          onChange={(e) => onScheduleChange(e.target.value as ExportSchedule)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="none">No scheduled exports</option>
          <option value="weekly">Weekly (every Monday)</option>
          <option value="monthly">Monthly (1st of each month)</option>
        </select>
      </div>

      {/* Recipients */}
      {schedule !== 'none' && (
        <div className="space-y-2">
          <label className="block text-sm text-gray-600">
            <Mail className="inline w-4 h-4 mr-1" />
            Email Recipients
          </label>
          
          {/* Add recipient input */}
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter email address"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={handleAddRecipient}
              disabled={!emailInput.trim()}
              className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Recipients list */}
          {recipients.length > 0 && (
            <div className="space-y-1">
              {recipients.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-md"
                >
                  <span className="text-sm text-gray-700">{email}</span>
                  <button
                    onClick={() => handleRemoveRecipient(email)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {recipients.length === 0 && (
            <div className="text-xs text-gray-500 italic">
              No recipients added. Add at least one email address.
            </div>
          )}
        </div>
      )}

      {/* Schedule info */}
      {schedule !== 'none' && recipients.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-xs text-blue-800">
            <strong>Note:</strong> Exports will be sent to {recipients.length}{' '}
            {recipients.length === 1 ? 'recipient' : 'recipients'}{' '}
            {schedule === 'weekly' ? 'every Monday' : 'on the 1st of each month'} at 9:00 AM UTC.
          </div>
        </div>
      )}
    </div>
  );
};
