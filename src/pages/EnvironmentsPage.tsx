import { useState } from 'react';

const ENVS = [
  { id: 'dev', name: 'Development', color: 'bg-blue-500', policies: 12, lastDeploy: '2026-03-15 10:30' },
  { id: 'staging', name: 'Staging', color: 'bg-yellow-500', policies: 8, lastDeploy: '2026-03-14 16:00' },
  { id: 'prod', name: 'Production', color: 'bg-green-500', policies: 5, lastDeploy: '2026-03-12 09:00' },
];

export function EnvironmentsPage() {
  const [selected, setSelected] = useState('dev');
  const env = ENVS.find(e => e.id === selected)!;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Environments</h1>
        <p className="text-sm text-gray-500 mt-1">Manage dev, staging, and production environments</p>
      </div>
      <div className="flex gap-3 mb-6">
        {ENVS.map(e => (
          <button key={e.id} onClick={() => setSelected(e.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selected === e.id ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${e.color}`} />
            {e.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Environment Config</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{env.name}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Active Policies</dt><dd className="font-medium">{env.policies}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Last Deploy</dt><dd className="font-medium">{env.lastDeploy}</dd></div>
          </dl>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Deployed Policies</h2>
          <div className="space-y-2">
            {['PII Detection v2.1.0', 'Cost Control v1.3.0', 'Content Moderation v3.0.1', 'Rate Limiter v1.0.0', 'Prompt Guard v1.0.0'].slice(0, env.policies > 5 ? 5 : env.policies).map(p => (
              <div key={p} className="flex items-center justify-between p-2 border rounded text-sm">
                <span className="text-gray-900">{p}</span>
                <span className="text-xs text-green-600">active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
