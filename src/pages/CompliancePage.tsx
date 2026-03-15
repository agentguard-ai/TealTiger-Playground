import { useState } from 'react';

const FRAMEWORKS = [
  { id: 'owasp', name: 'OWASP ASI 2024', requirements: 10, mapped: 7 },
  { id: 'nist', name: 'NIST AI RMF 1.0', requirements: 24, mapped: 15 },
  { id: 'soc2', name: 'SOC2 Type II', requirements: 18, mapped: 12 },
  { id: 'iso', name: 'ISO 27001:2022', requirements: 14, mapped: 8 },
  { id: 'gdpr', name: 'GDPR 2018', requirements: 12, mapped: 9 },
];

export function CompliancePage() {
  const [selected, setSelected] = useState('owasp');
  const fw = FRAMEWORKS.find(f => f.id === selected)!;
  const coverage = Math.round((fw.mapped / fw.requirements) * 100);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Framework Mapping</h1>
        <p className="text-sm text-gray-500 mt-1">Map policies to OWASP, NIST, SOC2, ISO 27001, and GDPR</p>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {FRAMEWORKS.map(f => (
          <button key={f.id} onClick={() => setSelected(f.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selected === f.id ? 'bg-teal-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}>{f.name}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4">{fw.name} Requirements</h2>
          <div className="space-y-2">
            {Array.from({ length: fw.requirements }, (_, i) => (
              <div key={i} className="flex items-center justify-between p-2 border rounded text-sm">
                <span className="text-gray-900">{fw.id.toUpperCase()}-{String(i + 1).padStart(2, '0')}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  i < fw.mapped ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>{i < fw.mapped ? 'Mapped' : 'Unmapped'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-4xl font-bold text-teal-600">{coverage}%</p>
            <p className="text-sm text-gray-500 mt-1">Coverage</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${coverage}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="font-semibold text-gray-900 mb-2">Summary</p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Total</dt><dd>{fw.requirements}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Mapped</dt><dd className="text-green-600">{fw.mapped}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Unmapped</dt><dd className="text-red-600">{fw.requirements - fw.mapped}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
