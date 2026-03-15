import { useState } from 'react';

const EXAMPLE_ROLES = [
  { name: 'admin', department: 'Engineering', clearance: 'top-secret', region: 'us-east' },
  { name: 'developer', department: 'Engineering', clearance: 'confidential', region: 'us-east' },
  { name: 'analyst', department: 'Analytics', clearance: 'public', region: 'eu-west' },
  { name: 'support', department: 'Support', clearance: 'public', region: 'us-west' },
];

const SIMULATION_RESULTS = [
  { role: 'admin', decision: 'ALLOW', cost: '$0.003', latency: '12ms' },
  { role: 'developer', decision: 'ALLOW', cost: '$0.003', latency: '15ms' },
  { role: 'analyst', decision: 'BLOCK', cost: '$0.001', latency: '8ms' },
  { role: 'support', decision: 'BLOCK', cost: '$0.001', latency: '8ms' },
];

export function RBACPage() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['admin', 'analyst']);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">RBAC Simulator</h1>
        <p className="text-sm text-gray-500 mt-1">Define roles and simulate policy evaluation across access levels</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Role Definitions</h2>
          <div className="space-y-3">
            {EXAMPLE_ROLES.map(r => (
              <div key={r.name} className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedRoles.includes(r.name) ? 'border-teal-500 bg-teal-50' : 'hover:bg-gray-50'
              }`} onClick={() => setSelectedRoles(prev =>
                prev.includes(r.name) ? prev.filter(n => n !== r.name) : [...prev, r.name]
              )}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">{r.name}</span>
                  <span className="text-xs text-gray-500">{r.clearance}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{r.department} · {r.region}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Simulation Results</h2>
          <div className="space-y-3">
            {SIMULATION_RESULTS.filter(r => selectedRoles.includes(r.role)).map(r => (
              <div key={r.role} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900">{r.role}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.decision === 'ALLOW' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>{r.decision}</span>
                </div>
                <p className="text-xs text-gray-500">Cost: {r.cost} · Latency: {r.latency}</p>
              </div>
            ))}
            {selectedRoles.length === 0 && <p className="text-sm text-gray-400">Select roles to compare</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
