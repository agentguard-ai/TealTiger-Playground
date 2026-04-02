import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';

export function ComplianceReportsPage() {
  const { toasts, show } = useToast();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and export compliance reports</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-teal-600">70%</p>
            <p className="text-sm text-gray-500">OWASP Coverage</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-blue-600">5</p>
            <p className="text-sm text-gray-500">Policies in Production</p>
          </div>
          <div className="text-center p-4 border rounded-lg">
            <p className="text-3xl font-bold text-green-600">92%</p>
            <p className="text-sm text-gray-500">Test Success Rate</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700" onClick={() => show('PDF report generated successfully', 'success')}>Generate PDF Report</button>
          <button className="px-4 py-2 bg-white text-gray-700 text-sm rounded-md border hover:bg-gray-50" onClick={() => show('CSV export downloaded', 'success')}>Export CSV</button>
          <button className="px-4 py-2 bg-white text-gray-700 text-sm rounded-md border hover:bg-gray-50" onClick={() => show('Report scheduling coming in v1.2.0', 'info')}>Schedule Report</button>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
