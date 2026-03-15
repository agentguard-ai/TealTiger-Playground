export function ImpactPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Impact Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">Analyze the impact of policy changes before deployment</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Decision Changes</p>
          <p className="text-2xl font-bold text-orange-600">3</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Cost Impact</p>
          <p className="text-2xl font-bold text-blue-600">+8.2%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Latency Impact</p>
          <p className="text-2xl font-bold text-green-600">-2.1%</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Affected Scenarios</h2>
        <div className="space-y-3">
          {[
            { name: 'PII in user message', severity: 'high', change: 'ALLOW → BLOCK' },
            { name: 'Budget exceeded request', severity: 'medium', change: 'WARN → BLOCK' },
            { name: 'Normal chat request', severity: 'low', change: 'No change' },
          ].map(s => (
            <div key={s.name} className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500">{s.change}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                s.severity === 'high' ? 'bg-red-100 text-red-800' :
                s.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>{s.severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
